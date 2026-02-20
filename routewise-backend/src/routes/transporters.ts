import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { db } from '../db';
import { transporters } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/transporters
 * Get all transporters (site-filtered)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { siteId } = req.query;

    let query = db
      .select()
      .from(transporters)
      .where(eq(transporters.tenantId, tenantId))
      .$dynamic();

    // Filter by site if provided
    if (siteId) {
      query = query.where(and(
        eq(transporters.tenantId, tenantId),
        eq(transporters.siteId, parseInt(siteId as string))
      ));
    }

    const transporterList = await query.orderBy(desc(transporters.createdAt));

    res.json({
      success: true,
      data: transporterList,
      total: transporterList.length,
    });
  } catch (error) {
    console.error('Get transporters error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transporters',
    });
  }
});

/**
 * GET /api/transporters/:id
 * Get single transporter by ID
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;

    const [transporter] = await db
      .select()
      .from(transporters)
      .where(and(
        eq(transporters.id, parseInt(id)),
        eq(transporters.tenantId, tenantId)
      ))
      .limit(1);

    if (!transporter) {
      return res.status(404).json({
        success: false,
        error: 'Transporter not found',
      });
    }

    res.json({
      success: true,
      data: transporter,
    });
  } catch (error) {
    console.error('Get transporter error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transporter',
    });
  }
});

/**
 * POST /api/transporters
 * Create new transporter
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const {
      siteId,
      name,
      code,
      contactPerson,
      email,
      phone,
      address,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Transporter name is required',
      });
    }

    const [newTransporter] = await db
      .insert(transporters)
      .values({
        tenantId,
        siteId: siteId ? parseInt(siteId) : null,
        name,
        code,
        contactPerson,
        email,
        phone,
        address,
        isActive: true,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newTransporter,
      message: 'Transporter created successfully',
    });
  } catch (error) {
    console.error('Create transporter error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transporter',
    });
  }
});

/**
 * PUT /api/transporters/:id
 * Update transporter
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;
    const {
      siteId,
      name,
      code,
      contactPerson,
      email,
      phone,
      address,
      isActive,
    } = req.body;

    const [updated] = await db
      .update(transporters)
      .set({
        siteId: siteId ? parseInt(siteId) : null,
        name,
        code,
        contactPerson,
        email,
        phone,
        address,
        isActive,
        updatedAt: new Date(),
      })
      .where(and(
        eq(transporters.id, parseInt(id)),
        eq(transporters.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Transporter not found',
      });
    }

    res.json({
      success: true,
      data: updated,
      message: 'Transporter updated successfully',
    });
  } catch (error) {
    console.error('Update transporter error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update transporter',
    });
  }
});

/**
 * DELETE /api/transporters/:id
 * Delete transporter (soft delete by setting isActive = false)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;

    const [deleted] = await db
      .update(transporters)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(transporters.id, parseInt(id)),
        eq(transporters.tenantId, tenantId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Transporter not found',
      });
    }

    res.json({
      success: true,
      message: 'Transporter deleted successfully',
    });
  } catch (error) {
    console.error('Delete transporter error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete transporter',
    });
  }
});

export default router;
