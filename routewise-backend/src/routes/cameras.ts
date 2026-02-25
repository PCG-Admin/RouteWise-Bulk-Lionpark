import { Router } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /api/cameras
 * Returns camera list for the CCTV page.
 * Lions Park site has entry and exit cameras used by the ANPR system.
 */
router.get('/', requireAuth, (req, res) => {
  const cameras = [
    {
      id: 'cam-entry',
      name: 'Entry Camera',
      location: 'Main Gate - Entry Lane',
      status: 'online',
      recording: true,
      lastEvent: 'Monitoring active',
    },
    {
      id: 'cam-exit',
      name: 'Exit Camera',
      location: 'Main Gate - Exit Lane',
      status: 'online',
      recording: true,
      lastEvent: 'Monitoring active',
    },
  ];

  res.json(cameras);
});

export default router;
