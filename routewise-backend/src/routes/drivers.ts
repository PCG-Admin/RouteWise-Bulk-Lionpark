import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { db } from '../db';
import { drivers, transporters } from '../db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/drivers
 * Get all drivers (site-filtered through transporter relationship)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { siteId, transporterId } = req.query;

    // If filtering by site, we need to JOIN with transporters
    if (siteId) {
      const driverList = await db
        .select({
          driver: drivers,
          transporter: transporters,
        })
        .from(drivers)
        .leftJoin(transporters, eq(drivers.transporterId, transporters.id))
        .where(and(
          eq(drivers.tenantId, tenantId),
          eq(transporters.siteId, parseInt(siteId as string))
        ))
        .orderBy(desc(drivers.createdAt));

      // Flatten the result
      const formattedDrivers = driverList.map(row => ({
        ...row.driver,
        transporterName: row.transporter?.name || null,
        transporterSiteId: row.transporter?.siteId || null,
      }));

      return res.json({
        success: true,
        data: formattedDrivers,
        total: formattedDrivers.length,
      });
    }

    // Filter by transporter if provided
    let query = db
      .select()
      .from(drivers)
      .where(eq(drivers.tenantId, tenantId))
      .$dynamic();

    if (transporterId) {
      query = query.where(and(
        eq(drivers.tenantId, tenantId),
        eq(drivers.transporterId, parseInt(transporterId as string))
      ));
    }

    const driverList = await query.orderBy(desc(drivers.createdAt));

    res.json({
      success: true,
      data: driverList,
      total: driverList.length,
    });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch drivers',
    });
  }
});

/**
 * GET /api/drivers/:id
 * Get single driver by ID with transporter details
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;

    const result = await db
      .select({
        driver: drivers,
        transporter: transporters,
      })
      .from(drivers)
      .leftJoin(transporters, eq(drivers.transporterId, transporters.id))
      .where(and(
        eq(drivers.id, parseInt(id)),
        eq(drivers.tenantId, tenantId)
      ))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found',
      });
    }

    const { driver, transporter } = result[0];

    res.json({
      success: true,
      data: {
        ...driver,
        transporterName: transporter?.name || null,
        transporterSiteId: transporter?.siteId || null,
      },
    });
  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch driver',
    });
  }
});

/**
 * POST /api/drivers
 * Create new driver
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const {
      firstName,
      lastName,
      phone,
      email,
      licenseNumber,
      licenseClass,
      licenseExpiry,
      idNumber,
      passportNumber,
      cutlerPermitNumber,
      cutlerPermitExpiry,
      boardNumber,
      transporterId,
      employeeId,
      inductionCompleted,
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'First name and last name are required',
      });
    }

    const [newDriver] = await db
      .insert(drivers)
      .values({
        tenantId,
        firstName,
        lastName,
        phone,
        email,
        licenseNumber,
        licenseClass,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
        idNumber,
        passportNumber,
        cutlerPermitNumber,
        cutlerPermitExpiry: cutlerPermitExpiry ? new Date(cutlerPermitExpiry) : null,
        boardNumber,
        transporterId: transporterId ? parseInt(transporterId) : null,
        employeeId,
        inductionCompleted: inductionCompleted || false,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newDriver,
      message: 'Driver created successfully',
    });
  } catch (error) {
    console.error('Create driver error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create driver',
    });
  }
});

/**
 * PUT /api/drivers/:id
 * Update driver
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;
    const {
      firstName,
      lastName,
      phone,
      email,
      licenseNumber,
      licenseClass,
      licenseExpiry,
      idNumber,
      passportNumber,
      cutlerPermitNumber,
      cutlerPermitExpiry,
      boardNumber,
      transporterId,
      employeeId,
      inductionCompleted,
    } = req.body;

    const [updated] = await db
      .update(drivers)
      .set({
        firstName,
        lastName,
        phone,
        email,
        licenseNumber,
        licenseClass,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
        idNumber,
        passportNumber,
        cutlerPermitNumber,
        cutlerPermitExpiry: cutlerPermitExpiry ? new Date(cutlerPermitExpiry) : null,
        boardNumber,
        transporterId: transporterId ? parseInt(transporterId) : null,
        employeeId,
        inductionCompleted,
        updatedAt: new Date(),
      })
      .where(and(
        eq(drivers.id, parseInt(id)),
        eq(drivers.tenantId, tenantId)
      ))
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
      message: 'Driver updated successfully',
    });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update driver',
    });
  }
});

/**
 * DELETE /api/drivers/:id
 * Delete driver (hard delete since no isActive field)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;

    const deleted = await db
      .delete(drivers)
      .where(and(
        eq(drivers.id, parseInt(id)),
        eq(drivers.tenantId, tenantId)
      ))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found',
      });
    }

    res.json({
      success: true,
      message: 'Driver deleted successfully',
    });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete driver',
    });
  }
});

/**
 * PUT /api/drivers/:id/induction
 * Update driver induction status
 */
router.put('/:id/induction', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;
    const { completed } = req.body;

    if (typeof completed !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'completed (boolean) is required',
      });
    }

    const inductionRef = completed ? `IND-${Date.now()}-${id}` : null;

    const [updated] = await db
      .update(drivers)
      .set({
        inductionCompleted: completed,
        inductionAt: completed ? new Date() : null,
        inductionRef: inductionRef,
        updatedAt: new Date(),
      })
      .where(and(
        eq(drivers.id, parseInt(id)),
        eq(drivers.tenantId, tenantId)
      ))
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
    console.error('Update induction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update induction status',
    });
  }
});

export default router;
