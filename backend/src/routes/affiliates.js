import { Router } from 'express';
import {
  getAffiliates,
  addAffiliate,
  updateAffiliate,
  deleteAffiliate,
  logActivity
} from '../store.js';
import { requirePermission } from '../middleware/rbac.js';
import { enforceAffiliateOwnership, enforceFieldSecurity } from '../middleware/ownership.js';

const router = Router();

/**
 * GET /api/affiliates
 * Lists affiliate records with server-enforced data scoping
 */
router.get(
  '/',
  requirePermission(['affiliates:read:all', 'affiliates:read:assigned', 'affiliates:read:own']),
  async (req, res) => {
    const allAffiliates = getAffiliates();
    let scopedAffiliates = [];
    let scopingReason = '';

    if (req.user.role === 'admin') {
      scopedAffiliates = allAffiliates;
      scopingReason = 'GLOBAL_ADMIN_ACCESS (All records visible)';
    } else if (req.user.role === 'affiliate_manager') {
      scopedAffiliates = allAffiliates.filter(a => a.assignedManagerId === req.user.id);
      scopingReason = `ASSIGNED_PORTFOLIO_ONLY (Filtered by assignedManagerId === ${req.user.id})`;
    } else if (req.user.role === 'affiliate_user') {
      scopedAffiliates = allAffiliates.filter(a => a.userId === req.user.id);
      scopingReason = `OWN_RECORD_ONLY (Filtered by userId === ${req.user.id})`;
    } else {
      scopedAffiliates = [];
      scopingReason = 'DISALLOWED_ROLE';
    }

    await logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      method: 'GET',
      endpoint: '/api/affiliates',
      requiredPermission: req.user.role === 'admin' ? 'affiliates:read:all' : (req.user.role === 'affiliate_manager' ? 'affiliates:read:assigned' : 'affiliates:read:own'),
      outcome: 'ALLOWED',
      statusCode: 200,
      details: `Returned ${scopedAffiliates.length} affiliate record(s) under scope: ${scopingReason}`
    });

    res.json({
      success: true,
      count: scopedAffiliates.length,
      data: scopedAffiliates,
      meta: {
        requester: req.user.id,
        role: req.user.role,
        scopingApplied: scopingReason
      }
    });
  }
);

/**
 * GET /api/affiliates/:id
 * Fetches an individual affiliate detail with ownership and manager-assignment verification
 */
router.get(
  '/:id',
  requirePermission(['affiliates:read:all', 'affiliates:read:assigned', 'affiliates:read:own']),
  enforceAffiliateOwnership,
  async (req, res) => {
    const affiliate = req.targetAffiliate;

    // Sanitize internal manager notes if the requester is an affiliate user
    const responseData = { ...affiliate };
    if (req.user.role === 'affiliate_user') {
      delete responseData.internalNotes;
    }

    await logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      method: 'GET',
      endpoint: `/api/affiliates/${req.params.id}`,
      requiredPermission: 'affiliate_detail_authorized',
      outcome: 'ALLOWED',
      statusCode: 200,
      details: `Accessed detail for affiliate ${req.params.id}`
    });

    res.json({
      success: true,
      data: responseData,
      meta: {
        requester: req.user.id,
        role: req.user.role
      }
    });
  }
);

/**
 * POST /api/affiliates
 * Onboards a new affiliate partner. Strictly restricted to Admins.
 */
router.post(
  '/',
  requirePermission('affiliates:create'),
  async (req, res) => {
    const { name, email, website, assignedManagerId, commissionRate, category } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        code: 'VALIDATION_ERROR',
        message: 'Name and email are required fields to register an affiliate.'
      });
    }

    const newId = `aff_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Math.random().toString(36).substring(2, 6)}`;
    const newAffiliate = {
      id: newId,
      userId: `usr_${newId}`,
      name,
      email,
      website: website || 'https://example.com',
      category: category || 'General Merchandise',
      assignedManagerId: assignedManagerId || 'usr_mgr_sarah',
      status: 'active',
      commissionRate: typeof commissionRate === 'number' ? commissionRate : 10.0,
      referralCode: `${name.toUpperCase().slice(0, 5)}-2026`,
      metrics: {
        totalClicks: 0,
        totalConversions: 0,
        totalEarnings: 0.00
      },
      internalNotes: 'Newly onboarded affiliate partner.'
    };

    await addAffiliate(newAffiliate);

    await logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      method: 'POST',
      endpoint: '/api/affiliates',
      requiredPermission: 'affiliates:create',
      outcome: 'ALLOWED',
      statusCode: 201,
      details: `Created new affiliate ${newAffiliate.id} (${newAffiliate.name})`
    });

    res.status(201).json({
      success: true,
      message: 'Affiliate partner registered successfully.',
      data: newAffiliate
    });
  }
);

/**
 * PUT /api/affiliates/:id
 * Updates affiliate information with ownership and field-level permission checks
 */
router.put(
  '/:id',
  requirePermission(['affiliates:update:all', 'affiliates:update:assigned', 'affiliates:update:own']),
  enforceAffiliateOwnership,
  enforceFieldSecurity(['commissionRate', 'assignedManagerId', 'status', 'id', 'userId']),
  async (req, res) => {
    const { id } = req.params;
    const allowedUpdates = { ...req.body };

    const updated = await updateAffiliate(id, allowedUpdates);

    await logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      method: 'PUT',
      endpoint: `/api/affiliates/${id}`,
      requiredPermission: 'affiliate_update_authorized',
      outcome: 'ALLOWED',
      statusCode: 200,
      details: `Updated fields for affiliate ${id}`
    });

    res.json({
      success: true,
      message: 'Affiliate updated successfully.',
      data: updated
    });
  }
);

/**
 * DELETE /api/affiliates/:id
 * Removes an affiliate. Strictly restricted to Admins.
 */
router.delete(
  '/:id',
  requirePermission('affiliates:delete'),
  enforceAffiliateOwnership,
  async (req, res) => {
    const { id } = req.params;
    await deleteAffiliate(id);

    await logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      method: 'DELETE',
      endpoint: `/api/affiliates/${id}`,
      requiredPermission: 'affiliates:delete',
      outcome: 'ALLOWED',
      statusCode: 200,
      details: `Deleted affiliate ${id}`
    });

    res.json({
      success: true,
      message: `Affiliate [${id}] was deleted successfully.`
    });
  }
);

export default router;

