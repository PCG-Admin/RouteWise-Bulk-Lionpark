import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/commodity-types
 * Get list of commodity types
 */
router.get('/commodity-types', requireAuth, async (req, res) => {
  try {
    // Return common commodity types
    const commodityTypes = [
      'Coal',
      'Iron Ore',
      'Chrome',
      'Manganese',
      'Limestone',
      'Sand',
      'Gravel',
      'Aggregate',
      'Building Materials',
      'General Cargo',
      'Containerized Goods',
      'Bulk Grain',
      'Fertilizer',
      'Chemicals',
      'Fuel',
      'Other',
    ];

    res.json({
      success: true,
      data: commodityTypes,
    });
  } catch (error) {
    console.error('Get commodity types error:', error);
    res.status(500).json({
      error: 'Failed to fetch commodity types',
    });
  }
});

/**
 * GET /api/customers
 * Get list of customers
 */
router.get('/customers', requireAuth, async (req, res) => {
  try {
    // Return sample customers for now
    const customers = [
      {
        id: 1,
        name: 'Nottingham Estate',
        email: 'contact@nottingham.co.za',
        phone: '+27 11 123 4567',
      },
      {
        id: 2,
        name: 'Mining Corp Ltd',
        email: 'orders@miningcorp.co.za',
        phone: '+27 11 234 5678',
      },
      {
        id: 3,
        name: 'Transport Solutions',
        email: 'info@transportsolutions.co.za',
        phone: '+27 11 345 6789',
      },
    ];

    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      error: 'Failed to fetch customers',
    });
  }
});

export default router;
