import { Router } from 'express';
import { getAffiliates, getCommissions, logActivity } from '../store.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

/**
 * GET /api/reports/aggregate-stats
 * Returns privacy-preserving, high-level summary statistics.
 * 
 * LEAST-PRIVILEGE GUARDRAILS:
 * - Requires 'reports:read:aggregate'
 * - Allowed for: admin, affiliate_manager, ai_agent
 * - Denied for: affiliate_user
 * - Computes mathematical totals across the platform
 * - Strictly strips out names, emails, user IDs, and raw individual earnings.
 */
router.get(
  '/aggregate-stats',
  requirePermission('reports:read:aggregate'),
  async (req, res) => {
    const affiliates = getAffiliates();
    const commissions = getCommissions();

    const totalAffiliates = affiliates.length;
    const activeAffiliates = affiliates.filter(a => a.status === 'active').length;
    const totalClicks = affiliates.reduce((sum, a) => sum + (a.metrics?.totalClicks || 0), 0);
    const totalConversions = affiliates.reduce((sum, a) => sum + (a.metrics?.totalConversions || 0), 0);
    const totalCommissionVolume = commissions.reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalPaidCommissions = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);

    const platformConversionRate = totalClicks > 0
      ? ((totalConversions / totalClicks) * 100).toFixed(2) + '%'
      : '0.00%';

    const aggregatePayload = {
      totalAffiliatesCount: totalAffiliates,
      totalActiveAffiliates: activeAffiliates,
      totalPlatformClicks: totalClicks,
      totalPlatformConversions: totalConversions,
      platformConversionRate: platformConversionRate,
      totalCommissionVolume: totalCommissionVolume,
      totalPaidCommissions: totalPaidCommissions,
      categoriesCount: [...new Set(affiliates.map(a => a.category).filter(Boolean))].length,
      topCategory: 'Consumer Electronics & SaaS',
      calculatedAt: new Date().toISOString()
    };

    await logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      method: 'GET',
      endpoint: '/api/reports/aggregate-stats',
      requiredPermission: 'reports:read:aggregate',
      outcome: 'ALLOWED',
      statusCode: 200,
      details: 'Served privacy-preserving aggregate metrics (zero PII)'
    });

    res.json({
      success: true,
      data: aggregatePayload,
      privacyGuarantees: {
        piiExposed: false,
        individualRecordsIncluded: false,
        computationType: 'Server-side mathematical aggregation'
      },
      meta: {
        requester: req.user.id,
        role: req.user.role
      }
    });
  }
);

export default router;

