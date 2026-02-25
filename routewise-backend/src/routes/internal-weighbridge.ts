import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { db } from '../db';
import { truckAllocations, orders } from '../db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

// Configure multer for PDF uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/weighbridge-tickets');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `ticket-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and image files are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    }
});

/**
 * POST /api/internal-weighbridge/upload-ticket
 * Upload and OCR process an internal weighbridge ticket PDF
 */
router.post('/upload-ticket', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const tenantId = (req as AuthRequest).auth!.tenantId;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        // Initialize Gemini API (using Gemini 2.5 Flash)
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Read file as base64
        const fileBuffer = await fs.readFile(req.file.path);
        const base64Data = fileBuffer.toString('base64');

        const mimeType = req.file.mimetype;

        // Create OCR prompt
        const prompt = `Extract ALL data from this Bulk Connections weighbridge ticket.

Return a JSON object with these exact fields:
{
  "ticketNumber": "ticket number (e.g., R-475743)",
  "instructionOrderNumber": "instruction/order number from top section",
  "truckReg": "truck registration number",
  "trailerReg": "trailer registration if present",
  "haulier": "haulier/transport company name",
  "driverName": "driver name",
  "driverIdNumber": "driver ID number",
  "orderNumber": "order number",
  "customerName": "customer name",
  "product": "product name",
  "grade": "grade/type",
  "destination": "destination",
  "stockpile": "stockpile location",
  "grossMass": number in kg,
  "tareMass": number in kg,
  "netMass": number in kg,
  "arrivalTime": "arrival datetime in ISO format",
  "departureTime": "departure datetime in ISO format",
  "incomingClerkEmail": "incoming weighbridge clerk email"
}

Extract ALL numeric values exactly as shown. Return ONLY the JSON, no markdown formatting.`;

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType,
                    data: base64Data
                }
            },
            { text: prompt }
        ]);

        const responseText = result.response.text();
        console.log('Gemini OCR Response:', responseText);

        // Parse JSON response
        let extractedData;
        try {
            // Remove markdown code blocks if present
            const cleanedText = responseText
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            extractedData = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', responseText);
            return res.status(500).json({
                success: false,
                error: 'Failed to parse OCR response',
                rawResponse: responseText
            });
        }

        // Search for matching allocations (checked in at Bulk - site 2)
        // Match by: truck reg + order number
        const matchingAllocations = await db
            .select({
                allocation: truckAllocations,
                orderNumber: orders.orderNumber,
                clientOrderNumber: sql<string>`${orders.referenceNumber}`,
                product: orders.product,
                quantity: orders.quantity,
                unit: orders.unit
            })
            .from(truckAllocations)
            .leftJoin(orders, eq(truckAllocations.orderId, orders.id))
            .where(
                and(
                    eq(truckAllocations.tenantId, tenantId),
                    or(
                        eq(truckAllocations.vehicleReg, extractedData.truckReg?.toUpperCase()),
                        eq(truckAllocations.vehicleReg, extractedData.truckReg?.toLowerCase())
                    )
                    // Order number match will be checked in application code
                )
            )
            .limit(50);

        // Filter to only allocations checked in at Bulk (site 2)
        // AND match order number
        const filteredMatches = matchingAllocations.filter(row => {
            const orderMatches =
                row.orderNumber === extractedData.orderNumber ||
                row.orderNumber === extractedData.instructionOrderNumber ||
                row.clientOrderNumber === extractedData.orderNumber ||
                row.clientOrderNumber === extractedData.instructionOrderNumber;

            // Check if allocation has bulk journey (checked in at site 2)
            // This will be enriched by the frontend with journey data
            return orderMatches;
        });

        const flatMatches = filteredMatches.map(row => ({
            id: row.allocation.id,
            orderNumber: row.orderNumber,
            truckReg: row.allocation.vehicleReg,
            freightCompanyName: row.allocation.transporter || 'Unknown',
            driverName: row.allocation.driverName || 'Unknown',
            product: row.product,
            quantity: row.allocation.netWeight !== null ? row.allocation.netWeight : 'Pend. Weight',
            quantityUnit: row.allocation.netWeight !== null ? 'kg' : '',
            status: row.allocation.status,
            netWeight: row.allocation.netWeight
        }));
        let bestMatch = flatMatches.length > 0 ? flatMatches[0] : null;
        let matchStatus = bestMatch ? 'matched' : 'unmatched';

        // Calculate weight discrepancy if matched
        let weightDiscrepancy = null;
        if (bestMatch && extractedData.netMass && bestMatch.netWeight) {
            const allocNetWeight = parseFloat(String(bestMatch.netWeight));
            const ticketNetWeight = extractedData.netMass;
            const difference = Math.abs(allocNetWeight - ticketNetWeight);
            const percentageDiff = allocNetWeight > 0
                ? (difference / allocNetWeight) * 100
                : 0;

            weightDiscrepancy = {
                hasDiscrepancy: percentageDiff > 5, // Flag if >5% difference
                amount: difference,
                percentage: percentageDiff,
                allocationWeight: allocNetWeight,
                ticketWeight: ticketNetWeight
            };
        }

        // Return extracted data + matching info for user review
        res.json({
            success: true,
            data: {
                extractedData: extractedData,
                matchingAllocations: flatMatches,
                bestMatch: bestMatch,
                weightDiscrepancy: weightDiscrepancy,
                ocrConfidence: 85, // Default confidence (Gemini doesn't provide this)
                pdfFileName: req.file.originalname
            },
            message: 'Ticket processed successfully. Please review and confirm.'
        });

    } catch (error) {
        console.error('Internal weighbridge ticket upload error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process ticket'
        });
    }
});

/**
 * POST /api/internal-weighbridge/capture-weight
 * Capture weight for a checked-in allocation (manual entry)
 */
router.post('/capture-weight', requireAuth, async (req, res) => {
    try {
        const tenantId = (req as AuthRequest).auth!.tenantId;
        const {
            allocationId,
            ticketNumber,
            grossMass,
            tareMass,
            netMass,
            arrivalTime,
            departureTime
        } = req.body;

        console.log(`⚖️ Capturing weight for allocation ${allocationId}`);

        // Fetch allocation details with order and parking ticket data
        const allocQuery = sql`
            SELECT
                ta.*,
                o.order_number,
                o.client_name,
                o.product,
                pt.driver_name as parking_driver_name,
                pt.customer_name as parking_customer_name,
                pt.transporter_name as parking_transporter_name
            FROM truck_allocations ta
            LEFT JOIN orders o ON ta.order_id = o.id
            LEFT JOIN parking_tickets pt ON ta.id = pt.truck_allocation_id
            WHERE ta.id = ${allocationId}
            AND ta.tenant_id = ${tenantId}
            LIMIT 1
        `;

        const allocation = await db.execute(allocQuery);

        if (allocation.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Allocation not found'
            });
        }

        const alloc = allocation.rows[0];

        // Calculate weight discrepancy
        const allocNetWeight = parseFloat(String(alloc.net_weight || alloc.netWeight || '0'));
        const capturedNetWeight = parseFloat(netMass || '0');
        const difference = Math.abs(allocNetWeight - capturedNetWeight);
        const percentageDiff = allocNetWeight > 0 ? (difference / allocNetWeight) * 100 : 0;
        const hasDiscrepancy = percentageDiff > 5; // Flag if >5% difference

        // Insert ticket into database
        const insertQuery = sql`
            INSERT INTO bulk_internal_weighbridge_tickets (
                tenant_id, truck_allocation_id, match_status,
                ticket_number,
                truck_reg, haulier,
                driver_name,
                order_number, customer_name, product,
                gross_mass, tare_mass, net_mass,
                arrival_time, departure_time,
                ocr_processed_at,
                has_weight_discrepancy, weight_discrepancy_amount, weight_discrepancy_percentage,
                verified_by_user,
                status,
                created_at
            ) VALUES (
                ${tenantId}, ${allocationId}, 'matched',
                ${ticketNumber},
                ${alloc.vehicle_reg}, ${alloc.parking_transporter_name || alloc.transporter || null},
                ${alloc.parking_driver_name || alloc.driver_name || null},
                ${alloc.order_number || null}, ${alloc.parking_customer_name || alloc.client_name || null}, ${alloc.product || null},
                ${grossMass}, ${tareMass}, ${netMass},
                ${arrivalTime}, ${departureTime},
                NOW(),
                ${hasDiscrepancy}, ${difference}, ${percentageDiff},
                true,
                ${hasDiscrepancy ? 'flagged' : 'verified'},
                NOW()
            ) RETURNING id
        `;

        const result = await db.execute(insertQuery);

        console.log(`✅ Created internal weighbridge ticket ${ticketNumber} for allocation ${allocationId}`);

        res.json({
            success: true,
            data: {
                id: result.rows[0].id,
                ticketNumber,
                hasDiscrepancy,
                discrepancy: {
                    amount: difference,
                    percentage: percentageDiff
                }
            },
            message: 'Weight captured successfully'
        });

    } catch (error) {
        console.error('Capture weight error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to capture weight'
        });
    }
});

/**
 * POST /api/internal-weighbridge/save-ticket
 * Save the verified internal weighbridge ticket to database
 */
router.post('/save-ticket', requireAuth, async (req, res) => {
    try {
        const tenantId = (req as AuthRequest).auth!.tenantId;
        const {
            extractedData,
            allocationId,
            file,
            discrepancy,
            userCorrections
        } = req.body;

        // Insert into database
        const insertQuery = sql`
            INSERT INTO bulk_internal_weighbridge_tickets (
                tenant_id, truck_allocation_id, match_status,
                ticket_number, instruction_order_number,
                truck_reg, trailer_reg, haulier,
                driver_name, driver_id_number,
                order_number, customer_name, product, grade, destination, stockpile,
                gross_mass, tare_mass, net_mass,
                arrival_time, departure_time,
                incoming_clerk_email,
                pdf_file_path, pdf_file_name,
                ocr_processed_at,
                has_weight_discrepancy, weight_discrepancy_amount, weight_discrepancy_percentage,
                verified_by_user, user_corrections,
                status
            ) VALUES (
                ${tenantId}, 
                ${allocationId || null}, 
                ${allocationId ? 'matched' : 'unmatched'},
                ${extractedData.ticketNumber}, 
                ${extractedData.instructionOrderNumber},
                ${extractedData.truckReg}, 
                ${extractedData.trailerReg}, 
                ${extractedData.haulier},
                ${extractedData.driverName}, 
                ${extractedData.driverIdNumber},
                ${extractedData.orderNumber}, 
                ${extractedData.customerName}, 
                ${extractedData.product}, 
                ${extractedData.grade}, 
                ${extractedData.destination}, 
                ${extractedData.stockpile},
                ${extractedData.grossMass}, 
                ${extractedData.tareMass}, 
                ${extractedData.netMass},
                ${extractedData.arrivalTime}, 
                ${extractedData.departureTime},
                ${extractedData.incomingClerkEmail},
                ${file.path}, 
                ${file.filename}, 
                NOW(),
                ${discrepancy?.hasDiscrepancy || false}, 
                ${discrepancy?.amount || null}, 
                ${discrepancy?.percentage || null},
                true, 
                ${JSON.stringify(userCorrections || {})},
                ${discrepancy?.hasDiscrepancy ? 'flagged' : 'verified'}
            ) RETURNING *
        `;

        const result = await db.execute(insertQuery);

        console.log(`✓ Saved internal weighbridge ticket ${extractedData.ticketNumber}`);

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Internal weighbridge ticket saved successfully'
        });

    } catch (error) {
        console.error('Save internal weighbridge ticket error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save ticket'
        });
    }
});

/**
 * GET /api/internal-weighbridge/checked-in-allocations
 * Get all truck allocations that are checked in and ready for weighing
 */
router.get('/checked-in-allocations', requireAuth, async (req, res) => {
    try {
        const tenantId = (req as AuthRequest).auth!.tenantId;

        // Get allocations that have arrived at site 2 (Bulk Connections)
        // and have not been weighed yet (no internal weighbridge ticket)
        const query = sql`
            SELECT DISTINCT ON (ta.id)
                ta.*,
                o.order_number,
                o.client_name,
                o.product,
                o.origin_address,
                o.destination_address,
                asj.timestamp as arrival_time,
                asj.event_type,
                asj.status
            FROM truck_allocations ta
            LEFT JOIN orders o ON ta.order_id = o.id
            INNER JOIN allocation_site_journey asj ON ta.id = asj.allocation_id
            LEFT JOIN bulk_internal_weighbridge_tickets biwt ON ta.id = biwt.truck_allocation_id
            WHERE ta.tenant_id = ${tenantId}
            AND asj.site_id = 2
            AND asj.event_type = 'arrival'
            AND biwt.id IS NULL
            ORDER BY ta.id, asj.timestamp DESC
        `;

        const result = await db.execute(query);

        console.log(`📋 Found ${result.rows.length} unweighed allocations (checked in at Bulk)`);

        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('Get checked-in allocations error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch checked-in allocations'
        });
    }
});

/**
 * GET /api/internal-weighbridge/tickets/:id
 * Get a specific internal weighbridge ticket by ID
 */
router.get('/tickets/:id', requireAuth, async (req, res) => {
    try {
        const tenantId = (req as AuthRequest).auth!.tenantId;
        const ticketId = parseInt(req.params.id);

        if (isNaN(ticketId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid ticket ID'
            });
        }

        const query = sql`
            SELECT
                biwt.*,
                ta.vehicle_reg,
                ta.driver_name,
                ta.gross_weight as allocation_gross_weight,
                ta.tare_weight as allocation_tare_weight,
                ta.net_weight as allocation_net_weight,
                o.order_number,
                o.product,
                o.client_name
            FROM bulk_internal_weighbridge_tickets biwt
            LEFT JOIN truck_allocations ta ON biwt.truck_allocation_id = ta.id
            LEFT JOIN orders o ON ta.order_id = o.id
            WHERE biwt.id = ${ticketId}
            AND biwt.tenant_id = ${tenantId}
        `;

        const result = await db.execute(query);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Ticket not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get internal weighbridge ticket by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ticket'
        });
    }
});

/**
 * GET /api/internal-weighbridge/tickets
 * Get all internal weighbridge tickets
 */
router.get('/tickets', requireAuth, async (req, res) => {
    try {
        const tenantId = (req as AuthRequest).auth!.tenantId;
        const { status, hasDiscrepancy } = req.query;

        // Build SQL query using Drizzle sql template
        let conditions = [sql`tenant_id = ${tenantId}`];

        if (status) {
            conditions.push(sql`status = ${status}`);
        }

        if (hasDiscrepancy === 'true') {
            conditions.push(sql`has_weight_discrepancy = true`);
        }

        const whereClause = conditions.length > 1
            ? sql.join(conditions, sql` AND `)
            : conditions[0];

        const query = sql`
            SELECT * FROM bulk_internal_weighbridge_tickets
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT 100
        `;

        const result = await db.execute(query);

        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('Get internal weighbridge tickets error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tickets'
        });
    }
});

/**
 * DELETE /api/internal-weighbridge/tickets/:id
 * Delete an internal weighbridge ticket
 */
router.delete('/tickets/:id', requireAuth, async (req, res) => {
    try {
        const tenantId = (req as AuthRequest).auth!.tenantId;
        const ticketId = parseInt(req.params.id);

        if (isNaN(ticketId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid ticket ID'
            });
        }

        console.log(`🗑️ Deleting internal weighbridge ticket ${ticketId} for tenant ${tenantId}`);

        const deleteQuery = sql`
            DELETE FROM bulk_internal_weighbridge_tickets
            WHERE id = ${ticketId}
            AND tenant_id = ${tenantId}
            RETURNING id
        `;

        const result = await db.execute(deleteQuery);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Ticket not found or already deleted'
            });
        }

        console.log(`✅ Deleted internal weighbridge ticket ${ticketId}`);

        res.json({
            success: true,
            message: 'Ticket deleted successfully'
        });

    } catch (error) {
        console.error('Delete internal weighbridge ticket error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete ticket'
        });
    }
});

export default router;

