import { Router } from 'express';

const router = Router();

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
