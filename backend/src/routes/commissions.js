import { Router } from 'express';
import { getCommissions, approveCommission, logActivity } from '../store.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

/**
 * GET /api/commissions
 * Returns commission transactions filtered by server-side scoping
 */
router.get(
  '/',
  requirePermission(['commissions:read:all', 'commissions:read:assigned', 'commissions:read:own']),
  async (req, res) => {
    const allCommissions = getCommissions();
    let scopedCommissions = [];
    let scopingReason = '';

    if (req.user.role === 'admin') {
      scopedCommissions = allCommissions;
      scopingReason = 'GLOBAL_ADMIN_ACCESS (All commission records)';
    } else if (req.user.role === 'affiliate_manager') {
      scopedCommissions = allCommissions.filter(c => c.assignedManagerId === req.user.id);
      scopingReason = `ASSIGNED_TEAM_ONLY (Filtered by assignedManagerId === ${req.user.id})`;
    } else if (req.user.role === 'affiliate_user') {
      scopedCommissions = allCommissions.filter(c => c.userId === req.user.id);
      scopingReason = `OWN_COMMISSIONS_ONLY (Filtered by userId === ${req.user.id})`;
    }

    await logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      method: 'GET',
      endpoint: '/api/commissions',
      requiredPermission: req.user.role === 'admin' ? 'commissions:read:all' : (req.user.role === 'affiliate_manager' ? 'commissions:read:assigned' : 'commissions:read:own'),
      outcome: 'ALLOWED',
      statusCode: 200,
      details: `Returned ${scopedCommissions.length} commission ledger record(s)`
    });

    res.json({
      success: true,
      count: scopedCommissions.length,
      data: scopedCommissions,
      meta: {
        requester: req.user.id,
        role: req.user.role,
        scopingApplied: scopingReason
      }
    });
  }
);

/**
 * POST /api/commissions/:id/approve
 * Approves a pending commission payout. Strictly restricted to Admins.
 */
router.post(
  '/:id/approve',
  requirePermission('commissions:approve'),
  async (req, res) => {
    const { id } = req.params;
    const updated = await approveCommission(id, req.user.id);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        code: 'COMMISSION_NOT_FOUND',
        message: `Commission transaction [${id}] does not exist.`
      });
    }

    await logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      method: 'POST',
      endpoint: `/api/commissions/${id}/approve`,
      requiredPermission: 'commissions:approve',
      outcome: 'ALLOWED',
      statusCode: 200,
      details: `Approved payout of $${updated.amount} for ${updated.affiliateName}`
    });

    res.json({
      success: true,
      message: `Commission payout [${id}] approved successfully.`,
      data: updated
    });
  }
);

export default router;

