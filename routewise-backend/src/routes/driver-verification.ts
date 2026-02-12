import { Router } from 'express';
import multer from 'multer';
import { createWorker } from 'tesseract.js';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { db } from '../db';
import { drivers, driverDocuments, truckAllocations } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'driver-documents');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

/**
 * POST /api/driver-verification/:allocationId/upload
 * Upload driver document (license, ID, etc.)
 */
router.post('/:allocationId/upload', upload.single('document'), async (req, res) => {
  try {
    const tenantId = '1';
    const { allocationId } = req.params;
    const { documentType } = req.body; // 'license', 'id', 'passport', 'permit', 'other'

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Document file is required' });
    }

    if (!documentType) {
      return res.status(400).json({ success: false, error: 'documentType is required' });
    }

    // Verify allocation exists
    const [allocation] = await db
      .select()
      .from(truckAllocations)
      .where(and(
        eq(truckAllocations.id, parseInt(allocationId)),
        eq(truckAllocations.tenantId, tenantId)
      ))
      .limit(1);

    if (!allocation) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      return res.status(404).json({ success: false, error: 'Truck allocation not found' });
    }

    // Create document record
    const documentId = randomUUID();
    const [document] = await db
      .insert(driverDocuments)
      .values({
        id: documentId,
        tenantId,
        allocationId: parseInt(allocationId),
        documentType,
        filePath: req.file.path,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        ocrStatus: 'pending',
        verificationStatus: 'pending',
        uploadedBy: 'system', // TODO: Add authenticated user
      })
      .returning();

    // Trigger OCR processing asynchronously
    processOCR(documentId, req.file.path).catch(err => {
      console.error(`OCR processing failed for document ${documentId}:`, err);
    });

    res.json({
      success: true,
      data: {
        documentId: document.id,
        fileName: document.fileName,
        documentType: document.documentType,
        ocrStatus: document.ocrStatus,
      },
      message: 'Document uploaded successfully. OCR processing started.',
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload document',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * OCR Processing Function (Tesseract.js)
 */
async function processOCR(documentId: string, filePath: string) {
  try {
    console.log(`Starting OCR for document ${documentId}...`);

    // Update status to processing
    await db
      .update(driverDocuments)
      .set({ ocrStatus: 'processing', updatedAt: new Date() })
      .where(eq(driverDocuments.id, documentId));

    // Initialize Tesseract worker
    const worker = await createWorker('eng');
    const { data: { text, confidence } } = await worker.recognize(filePath);
    await worker.terminate();

    // Extract fields from OCR text
    const extractedFields = extractDriverInfo(text);
    const parsedConfidence = Math.round(confidence);

    console.log(`OCR completed for document ${documentId}. Confidence: ${parsedConfidence}%`);

    // Update document with OCR results
    await db
      .update(driverDocuments)
      .set({
        ocrStatus: 'success',
        ocrText: text,
        extractedFields,
        parsedConfidence,
        updatedAt: new Date(),
      })
      .where(eq(driverDocuments.id, documentId));

    console.log(`✓ OCR results saved for document ${documentId}`);
  } catch (error) {
    console.error(`OCR processing failed for document ${documentId}:`, error);
    await db
      .update(driverDocuments)
      .set({ ocrStatus: 'failed', updatedAt: new Date() })
      .where(eq(driverDocuments.id, documentId));
  }
}

/**
 * Extract driver information from OCR text
 */
function extractDriverInfo(text: string): any {
  const fields: any = { confidence: 0 };

  // License number patterns (e.g., ABC123456, 12345678)
  const licenseMatch = text.match(/\b([A-Z]{1,3}\d{6,9}|\d{8,10})\b/);
  if (licenseMatch) {
    fields.licenseNumber = licenseMatch[1];
    fields.confidence += 20;
  }

  // ID number patterns (e.g., 9401015800083)
  const idMatch = text.match(/\b\d{13}\b/);
  if (idMatch) {
    fields.idNumber = idMatch[0];
    fields.confidence += 20;
  }

  // Name extraction (basic pattern)
  const nameMatch = text.match(/(?:Name|SURNAME|Names?)[\s:]+([A-Z][A-Za-z\s]{2,50})/i);
  if (nameMatch) {
    fields.name = nameMatch[1].trim();
    fields.confidence += 20;
  }

  // Date patterns (YYYY-MM-DD, DD/MM/YYYY, etc.)
  const dateMatch = text.match(/\b(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b/);
  if (dateMatch) {
    fields.expiryDate = dateMatch[1];
    fields.confidence += 20;
  }

  // Country codes
  const countryMatch = text.match(/\b(RSA|ZAF|South Africa|SA)\b/i);
  if (countryMatch) {
    fields.country = 'South Africa';
    fields.confidence += 20;
  }

  return fields;
}

/**
 * GET /api/driver-verification/:allocationId/documents
 * Get all documents for an allocation
 */
router.get('/:allocationId/documents', async (req, res) => {
  try {
    const tenantId = '1';
    const { allocationId } = req.params;

    const documents = await db
      .select()
      .from(driverDocuments)
      .where(and(
        eq(driverDocuments.allocationId, parseInt(allocationId)),
        eq(driverDocuments.tenantId, tenantId)
      ))
      .orderBy(driverDocuments.createdAt);

    res.json({
      success: true,
      data: documents,
      total: documents.length,
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/driver-verification/:allocationId/match-driver
 * Match/create driver from OCR data
 */
router.post('/:allocationId/match-driver', async (req, res) => {
  try {
    const tenantId = '1';
    const { allocationId } = req.params;
    const { documentId, overrideFields } = req.body;

    // Get document with OCR data
    const [document] = await db
      .select()
      .from(driverDocuments)
      .where(eq(driverDocuments.id, documentId))
      .limit(1);

    if (!document || !document.extractedFields) {
      return res.status(400).json({
        success: false,
        error: 'Document not found or OCR not completed',
      });
    }

    const { extractedFields } = document;
    const { licenseNumber, idNumber, name } = extractedFields as any;

    // Search for existing driver
    let driver = null;
    if (licenseNumber) {
      [driver] = await db
        .select()
        .from(drivers)
        .where(and(
          eq(drivers.licenseNumber, licenseNumber),
          eq(drivers.tenantId, tenantId)
        ))
        .limit(1);
    }

    if (!driver && idNumber) {
      [driver] = await db
        .select()
        .from(drivers)
        .where(and(
          eq(drivers.idNumber, idNumber),
          eq(drivers.tenantId, tenantId)
        ))
        .limit(1);
    }

    // Create new driver if not found
    if (!driver) {
      const names = (overrideFields?.name || name || '').split(' ');
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';

      [driver] = await db
        .insert(drivers)
        .values({
          tenantId,
          firstName,
          lastName,
          licenseNumber: overrideFields?.licenseNumber || licenseNumber,
          idNumber: overrideFields?.idNumber || idNumber,
          phone: overrideFields?.phone,
          email: overrideFields?.email,
          inductionCompleted: false,
        })
        .returning();

      console.log(`✓ Created new driver ${driver.id} (${firstName} ${lastName})`);
    }

    // Link driver to document and allocation
    await db
      .update(driverDocuments)
      .set({ driverId: driver.id, updatedAt: new Date() })
      .where(eq(driverDocuments.id, documentId));

    await db
      .update(truckAllocations)
      .set({
        driverId: driver.id.toString(),
        driverValidationStatus: 'verified', // Mark driver as verified
        updatedAt: new Date()
      })
      .where(eq(truckAllocations.id, parseInt(allocationId)));

    res.json({
      success: true,
      data: {
        driver: {
          id: driver.id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          licenseNumber: driver.licenseNumber,
          inductionCompleted: driver.inductionCompleted,
        },
        isNew: !driver.createdAt, // Just created
        inductionRequired: !driver.inductionCompleted,
      },
      message: driver.createdAt ? 'Driver matched successfully' : 'New driver created',
    });
  } catch (error) {
    console.error('Driver matching error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to match/create driver',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/driver-verification/:documentId/verify
 * Manually verify a document
 */
router.put('/:documentId/verify', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { verificationStatus, verificationNotes } = req.body;

    if (!['verified', 'rejected'].includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        error: 'verificationStatus must be "verified" or "rejected"',
      });
    }

    const [updated] = await db
      .update(driverDocuments)
      .set({
        verificationStatus,
        verificationNotes,
        verifiedBy: 'system', // TODO: Add authenticated user
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(driverDocuments.id, documentId))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    res.json({
      success: true,
      data: updated,
      message: `Document ${verificationStatus} successfully`,
    });
  } catch (error) {
    console.error('Document verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify document',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/driver-verification/drivers/:driverId/induction
 * Update driver induction status
 */
router.put('/drivers/:driverId/induction', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { completed } = req.body;

    if (typeof completed !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'completed (boolean) is required',
      });
    }

    const inductionRef = `IND-${Date.now()}-${driverId}`;

    const [updated] = await db
      .update(drivers)
      .set({
        inductionCompleted: completed,
        inductionAt: completed ? new Date() : null,
        inductionRef: completed ? inductionRef : null,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, parseInt(driverId)))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found',
      });
    }

    res.json({
      success: true,
      data: updated,
      message: completed ? 'Induction marked as completed' : 'Induction status cleared',
    });
  } catch (error) {
    console.error('Induction update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update induction status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
