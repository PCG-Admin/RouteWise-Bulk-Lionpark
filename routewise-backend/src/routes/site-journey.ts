import { Router } from 'express';
import { db } from '../db';
import { allocationSiteJourney, truckAllocations } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { invalidateCache } from '../utils/cache';

const router = Router();

/**
 * POST /api/site-journey
 * Create a new journey entry for an allocation at a specific site
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = '1';
    const {
      allocationId,
      siteId,
      eventType, // 'arrival', 'departure', 'check_in', 'check_out'
      status, // 'scheduled', 'arrived', 'departed', 'completed'
      detectionMethod, // 'anpr_auto', 'manual_upload', 'manual_entry', 'system'
      detectionSource,
      notes,
      metadata,
    } = req.body;

    // Validate required fields
    if (!allocationId || !siteId || !eventType || !status) {
      return res.status(400).json({
        success: false,
        error: 'allocationId, siteId, eventType, and status are required',
      });
    }

    // Get allocation details
    const [allocation] = await db
      .select()
      .from(truckAllocations)
      .where(eq(truckAllocations.id, allocationId))
      .limit(1);

    if (!allocation) {
      return res.status(404).json({
        success: false,
        error: 'Allocation not found',
      });
    }

    // Create journey entry
    const [journey] = await db
      .insert(allocationSiteJourney)
      .values({
        tenantId,
        allocationId,
        orderId: allocation.orderId,
        siteId: parseInt(siteId),
        vehicleReg: allocation.vehicleReg,
        driverName: allocation.driverName,
        eventType,
        status,
        detectionMethod,
        detectionSource,
        notes,
        metadata,
        timestamp: new Date(),
      })
      .returning();

    console.log(`✓ Created journey entry ${journey.id} for allocation ${allocationId} at site ${siteId}: ${eventType} (${status})`);

    // Invalidate relevant caches
    await invalidateCache(`journey:allocation:${allocationId}`);
    await invalidateCache(`journey:site:${siteId}`);
    await invalidateCache(`allocations:*`);

    res.json({
      success: true,
      data: journey,
      message: 'Journey entry created successfully',
    });
  } catch (error) {
    console.error('Journey creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create journey entry',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/site-journey/allocation/:allocationId
 * Get complete journey history for an allocation across all sites
 */
router.get('/allocation/:allocationId', async (req, res) => {
  try {
    const tenantId = '1';
    const { allocationId } = req.params;

    const journey = await db
      .select()
      .from(allocationSiteJourney)
      .where(and(
        eq(allocationSiteJourney.allocationId, parseInt(allocationId)),
        eq(allocationSiteJourney.tenantId, tenantId)
      ))
      .orderBy(desc(allocationSiteJourney.timestamp));

    res.json({
      success: true,
      data: journey,
      total: journey.length,
    });
  } catch (error) {
    console.error('Get journey error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch journey',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/site-journey/site/:siteId/latest
 * Get latest status for each allocation at a specific site
 */
router.get('/site/:siteId/latest', async (req, res) => {
  try {
    const tenantId = '1';
    const { siteId } = req.params;

    // Get latest journey entry for each allocation at this site
    const latestJourneys = await db
      .select()
      .from(allocationSiteJourney)
      .where(and(
        eq(allocationSiteJourney.siteId, parseInt(siteId)),
        eq(allocationSiteJourney.tenantId, tenantId)
      ))
      .orderBy(desc(allocationSiteJourney.timestamp));

    // Group by allocation and take most recent
    const latestByAllocation = new Map();
    latestJourneys.forEach(journey => {
      if (!latestByAllocation.has(journey.allocationId)) {
        latestByAllocation.set(journey.allocationId, journey);
      }
    });

    res.json({
      success: true,
      data: Array.from(latestByAllocation.values()),
      total: latestByAllocation.size,
    });
  } catch (error) {
    console.error('Get latest journey error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest journey entries',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/site-journey/site/:siteId/active
 * Get all allocations currently active at a specific site
 */
router.get('/site/:siteId/active', async (req, res) => {
  try {
    const tenantId = '1';
    const { siteId } = req.params;

    // Get all journey entries for this site
    const journeys = await db
      .select()
      .from(allocationSiteJourney)
      .where(and(
        eq(allocationSiteJourney.siteId, parseInt(siteId)),
        eq(allocationSiteJourney.tenantId, tenantId)
      ))
      .orderBy(desc(allocationSiteJourney.timestamp));

    // Group by allocation and take most recent
    const latestByAllocation = new Map();
    journeys.forEach(journey => {
      if (!latestByAllocation.has(journey.allocationId)) {
        latestByAllocation.set(journey.allocationId, journey);
      }
    });

    // Filter to only those with arrived status (not departed)
    const active = Array.from(latestByAllocation.values()).filter(j => j.status === 'arrived');

    res.json({
      success: true,
      data: active,
      total: active.length,
    });
  } catch (error) {
    console.error('Get active allocations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active allocations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
