import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { db } from '../db';
import { truckAllocations } from '../db/schema';
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
            .select()
            .from(truckAllocations)
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
        const filteredMatches = matchingAllocations.filter(a => {
            const orderMatches =
                a.orderNumber === extractedData.orderNumber ||
                a.orderNumber === extractedData.instructionOrderNumber ||
                a.clientOrderNumber === extractedData.orderNumber ||
                a.clientOrderNumber === extractedData.instructionOrderNumber;

            // Check if allocation has bulk journey (checked in at site 2)
            // This will be enriched by the frontend with journey data
            return orderMatches;
        });

        let bestMatch = filteredMatches.length > 0 ? filteredMatches[0] : null;
        let matchStatus = bestMatch ? 'matched' : 'unmatched';

        // Calculate weight discrepancy if matched
        let weightDiscrepancy = null;
        if (bestMatch && extractedData.netMass && bestMatch.netWeight) {
            const allocNetWeight = parseFloat(bestMatch.netWeight);
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
                matchingAllocations: filteredMatches,
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
        const insertQuery = `
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
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21, $22, $23, $24, NOW(),
                $25, $26, $27, $28, $29, $30
            ) RETURNING *
        `;

        const result = await db.execute(insertQuery, [
            tenantId,
            allocationId || null,
            allocationId ? 'matched' : 'unmatched',
            extractedData.ticketNumber,
            extractedData.instructionOrderNumber,
            extractedData.truckReg,
            extractedData.trailerReg,
            extractedData.haulier,
            extractedData.driverName,
            extractedData.driverIdNumber,
            extractedData.orderNumber,
            extractedData.customerName,
            extractedData.product,
            extractedData.grade,
            extractedData.destination,
            extractedData.stockpile,
            extractedData.grossMass,
            extractedData.tareMass,
            extractedData.netMass,
            extractedData.arrivalTime,
            extractedData.departureTime,
            extractedData.incomingClerkEmail,
            file.path,
            file.filename,
            discrepancy?.hasDiscrepancy || false,
            discrepancy?.amount || null,
            discrepancy?.percentage || null,
            true,
            JSON.stringify(userCorrections || {}),
            discrepancy?.hasDiscrepancy ? 'flagged' : 'verified'
        ]);

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

export default router;
