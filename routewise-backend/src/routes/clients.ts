import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { db } from '../db';
import { clients } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/clients
 * Get all clients (site-filtered)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { siteId } = req.query;

    let query = db
      .select()
      .from(clients)
      .where(eq(clients.tenantId, tenantId))
      .$dynamic();

    // Filter by site if provided
    if (siteId) {
      query = query.where(and(
        eq(clients.tenantId, tenantId),
        eq(clients.siteId, parseInt(siteId as string))
      ));
    }

    const clientList = await query.orderBy(desc(clients.createdAt));

    res.json({
      success: true,
      data: clientList,
      total: clientList.length,
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch clients',
    });
  }
});

/**
 * GET /api/clients/:id
 * Get single client by ID
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;

    const [client] = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.id, parseInt(id)),
        eq(clients.tenantId, tenantId)
      ))
      .limit(1);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client',
    });
  }
});

/**
 * POST /api/clients
 * Create new client
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
        error: 'Client name is required',
      });
    }

    const [newClient] = await db
      .insert(clients)
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
      data: newClient,
      message: 'Client created successfully',
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create client',
    });
  }
});

/**
 * PUT /api/clients/:id
 * Update client
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
      .update(clients)
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
        eq(clients.id, parseInt(id)),
        eq(clients.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    res.json({
      success: true,
      data: updated,
      message: 'Client updated successfully',
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update client',
    });
  }
});

/**
 * DELETE /api/clients/:id
 * Delete client (soft delete by setting isActive = false)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as AuthRequest).auth!.tenantId;
    const { id } = req.params;

    const [deleted] = await db
      .update(clients)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(clients.id, parseInt(id)),
        eq(clients.tenantId, tenantId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    res.json({
      success: true,
      message: 'Client deleted successfully',
    });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete client',
    });
  }
});

export default router;
