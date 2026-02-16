import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { anprCheckerService } from '../services/anpr-checker';

const router = Router();

// Initialize Gemini AI
const GEMINI_API_KEY = 'AIzaSyBnWnE5z60Vfn7FiZWueiXeDyeeMDVZpgQ';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Configure multer for image uploads (in-memory storage for testing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// In-memory storage for mock plate detections
let mockDetections: any[] = [];
let detectionIdCounter = 1000;

/**
 * GET /api/anpr-mock/last-50
 * Simulate Hikvision/Navig8 ANPR API
 * Returns last 50 plate detections
 */
router.get('/last-50', (req, res) => {
  console.log('📡 Mock ANPR API called: GET /last-50');

  // Return last 50 detections (or all if less than 50)
  const recentDetections = mockDetections.slice(-50);

  res.json({
    success: true,
    count: recentDetections.length,
    filters: {
      direction: 'any',
      camera_type: 'any'
    },
    data: recentDetections
  });
});

/**
 * POST /api/anpr-mock/simulate-detection
 * Manually inject a test detection
 */
router.post('/simulate-detection', (req, res) => {
  const { plateNumber, direction = 'entry', cameraType = 'test_camera_1' } = req.body;

  if (!plateNumber) {
    return res.status(400).json({
      success: false,
      error: 'plateNumber is required'
    });
  }

  // Create new detection
  const detection = {
    id: detectionIdCounter++,
    plateNumber: plateNumber,
    detectedAt: new Date().toISOString(),
    cameraType: cameraType,
    direction: direction
  };

  // Add to mock storage
  mockDetections.push(detection);

  // Keep only last 100 detections in memory
  if (mockDetections.length > 100) {
    mockDetections = mockDetections.slice(-100);
  }

  console.log(`\n🧪 SIMULATED DETECTION:`);
  console.log(`   Plate: ${plateNumber}`);
  console.log(`   Direction: ${direction}`);
  console.log(`   Time: ${detection.detectedAt}`);
  console.log(`   ID: ${detection.id}\n`);

  res.json({
    success: true,
    message: 'Detection simulated successfully',
    data: detection
  });
});

/**
 * POST /api/anpr-mock/manual-upload
 * Upload an image for manual ANPR testing
 * Uses Google Gemini Vision API to extract plate number from the image
 */
router.post('/manual-upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Image file is required'
      });
    }

    const { direction = 'entry', siteId = '1' } = req.body;
    const filename = req.file.originalname;

    console.log(`\n📸 MANUAL IMAGE UPLOAD - Starting Gemini Vision AI:`);
    console.log(`   File: ${filename}`);
    console.log(`   Size: ${req.file.size} bytes`);
    console.log(`   Direction: ${direction}`);
    console.log(`   Site ID: ${siteId}`);

    // Initialize Gemini Vision model
    console.log('🤖 Initializing Gemini Vision AI...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Convert image buffer to base64
    const imageBase64 = req.file.buffer.toString('base64');

    const imageParts = [{
      inlineData: {
        data: imageBase64,
        mimeType: req.file.mimetype
      }
    }];

    const prompt = `Extract the license plate number from this image.
    Only return the plate number with no spaces or special characters (e.g., ABC123GP).
    If you cannot find a license plate, return "NONE".
    Do not include any explanation, only the plate number.`;

    // Call Gemini Vision API
    console.log('🔍 Processing image with Gemini Vision AI...');
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text().trim();

    console.log(`✓ Gemini Vision completed`);
    console.log(`   Raw response: ${text}`);

    // Clean up the response
    let plateNumber = text
      .replace(/[\s-]/g, '')
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase();

    if (!plateNumber || plateNumber === 'NONE' || plateNumber.length < 3) {
      console.log('❌ No valid plate number found in image');
      return res.status(400).json({
        success: false,
        error: 'Could not detect a valid license plate in the image. Please ensure the license plate is clearly visible and try again.',
        aiResponse: text
      });
    }

    console.log(`✓ Extracted plate number: ${plateNumber}`);

    // Create new detection
    const detection = {
      id: detectionIdCounter++,
      plateNumber: plateNumber,
      detectedAt: new Date().toISOString(),
      cameraType: direction === 'entry' ? 'entrance_camera' : 'exit_camera',
      direction: direction,
      siteId: parseInt(siteId) // Add site ID to detection
    };

    // Add to mock storage
    mockDetections.push(detection);

    // Keep only last 100 detections in memory
    if (mockDetections.length > 100) {
      mockDetections = mockDetections.slice(-100);
    }

    console.log(`✓ Detection created:`);
    console.log(`   Plate: ${plateNumber}`);
    console.log(`   Direction: ${direction}`);
    console.log(`   Time: ${detection.detectedAt}`);
    console.log(`   ID: ${detection.id}\n`);

    // Trigger immediate ANPR check (don't wait for polling interval)
    console.log('⚡ Triggering immediate ANPR check...');
    anprCheckerService.checkNow().catch(err => {
      console.error('Error in immediate ANPR check:', err);
    });

    res.json({
      success: true,
      message: `Plate ${plateNumber} detected and processed for ${direction} gate`,
      data: {
        detection,
        filename: req.file.originalname,
        extractedPlate: plateNumber,
        ocrConfidence: 95, // Gemini is generally high confidence
        aiResponse: text,
        fileSize: req.file.size,
      }
    });
  } catch (error) {
    console.error('Manual upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process image with AI',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/anpr-mock/detections
 * Get all mock detections
 */
router.get('/detections', (req, res) => {
  res.json({
    success: true,
    count: mockDetections.length,
    data: mockDetections
  });
});

/**
 * DELETE /api/anpr-mock/detections
 * Clear all mock detections
 */
router.delete('/detections', (req, res) => {
  const count = mockDetections.length;
  mockDetections = [];
  detectionIdCounter = 1000;

  console.log(`🗑️  Cleared ${count} mock detections`);

  res.json({
    success: true,
    message: `Cleared ${count} mock detections`
  });
});

/**
 * POST /api/anpr-mock/seed-test-data
 * Seed some test detections for development
 */
router.post('/seed-test-data', (req, res) => {
  const testPlates = [
    { plateNumber: 'ABC123GP', direction: 'entry' },
    { plateNumber: 'DWY456GP', direction: 'entry' },
    { plateNumber: 'XYZ789GP', direction: 'exit' },
  ];

  const seeded: any[] = [];

  testPlates.forEach(plate => {
    const detection = {
      id: detectionIdCounter++,
      plateNumber: plate.plateNumber,
      detectedAt: new Date().toISOString(),
      cameraType: 'test_seed_camera',
      direction: plate.direction
    };
    mockDetections.push(detection);
    seeded.push(detection);
  });

  console.log(`🌱 Seeded ${seeded.length} test detections`);

  res.json({
    success: true,
    message: `Seeded ${seeded.length} test detections`,
    data: seeded
  });
});

export default router;
