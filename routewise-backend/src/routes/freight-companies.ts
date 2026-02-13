import { Router } from 'express';
import { db } from '../db';
import { freightCompanies } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/freight-companies
 * Get all freight companies (site-filtered)
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = '1';
    const { siteId } = req.query;

    let query = db
      .select()
      .from(freightCompanies)
      .where(eq(freightCompanies.tenantId, tenantId))
      .$dynamic();

    // Filter by site if provided
    if (siteId) {
      query = query.where(and(
        eq(freightCompanies.tenantId, tenantId),
        eq(freightCompanies.siteId, parseInt(siteId as string))
      ));
    }

    const companies = await query.orderBy(desc(freightCompanies.createdAt));

    res.json({
      success: true,
      data: companies,
      total: companies.length,
    });
  } catch (error) {
    console.error('Get freight companies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch freight companies',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/freight-companies/:id
 * Get single freight company by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const tenantId = '1';
    const { id } = req.params;

    const [company] = await db
      .select()
      .from(freightCompanies)
      .where(and(
        eq(freightCompanies.id, parseInt(id)),
        eq(freightCompanies.tenantId, tenantId)
      ))
      .limit(1);

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Freight company not found',
      });
    }

    res.json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error('Get freight company error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch freight company',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/freight-companies
 * Create new freight company
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = '1';
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
        error: 'Company name is required',
      });
    }

    const [newCompany] = await db
      .insert(freightCompanies)
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
      data: newCompany,
      message: 'Freight company created successfully',
    });
  } catch (error) {
    console.error('Create freight company error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create freight company',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/freight-companies/:id
 * Update freight company
 */
router.put('/:id', async (req, res) => {
  try {
    const tenantId = '1';
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
      .update(freightCompanies)
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
        eq(freightCompanies.id, parseInt(id)),
        eq(freightCompanies.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Freight company not found',
      });
    }

    res.json({
      success: true,
      data: updated,
      message: 'Freight company updated successfully',
    });
  } catch (error) {
    console.error('Update freight company error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update freight company',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/freight-companies/:id
 * Delete freight company (soft delete by setting isActive = false)
 */
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = '1';
    const { id } = req.params;

    const [deleted] = await db
      .update(freightCompanies)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(freightCompanies.id, parseInt(id)),
        eq(freightCompanies.tenantId, tenantId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Freight company not found',
      });
    }

    res.json({
      success: true,
      message: 'Freight company deleted successfully',
    });
  } catch (error) {
    console.error('Delete freight company error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete freight company',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
