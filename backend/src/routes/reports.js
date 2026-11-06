import { Router } from 'express';
import { getAffiliates, getCommissions, logActivity } from '../store.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  generatePrivacyPreservingAnalytics,
  getPrivacyBudget,
  resetPrivacyBudget
} from '../services/privacyEngine.js';

const router = Router();

/**
 * 1. GET /api/reports/aggregate-stats
 * Returns high-level platform summary statistics.
 * 
 * MODULE 4 PRIVACY ENFORCEMENT & RETROFIT:
 * - If called by AI Agent (MarketPulse / role: ai_agent):
 *   Mandatorily routed through privacyEngine. Injects Laplace DP noise, enforces
 *   sensitivity clamping, deducts epsilon from privacy budget, and strictly omits
 *   raw figures and individual PII. If budget is depleted, halts with HTTP 429.
 * - If called by human Administrator or Affiliate Manager:
 *   Returns authorized operational ground-truth metrics without depleting the agent budget.
 * - Denied for: affiliate_user (403 INSUFFICIENT_PERMISSIONS).
 */
router.get(
  '/aggregate-stats',
  requirePermission('reports:read:aggregate'),
  async (req, res) => {
    const affiliates = getAffiliates();
    const commissions = getCommissions();

    // AI AGENT ACCESS PATH: Strictly routed through Privacy Policy Engine
    if (req.user.role === 'ai_agent') {
      const privacyResult = await generatePrivacyPreservingAnalytics({
        rawAffiliates: affiliates,
        rawCommissions: commissions,
        user: req.user,
        requestedParams: {
          endpoint: '/api/reports/aggregate-stats',
          actionName: 'query_aggregate_stats'
        }
      });

      if (!privacyResult.success) {
        await logActivity({
          userId: req.user.id,
          userRole: req.user.role,
          method: 'GET',
          endpoint: '/api/reports/aggregate-stats',
          requiredPermission: 'reports:read:aggregate',
          outcome: 'DENIED',
          statusCode: 429,
          details: `Privacy budget depleted: ${privacyResult.message}`
        });

        return res.status(429).json(privacyResult);
      }

      await logActivity({
        userId: req.user.id,
        userRole: req.user.role,
        method: 'GET',
        endpoint: '/api/reports/aggregate-stats',
        requiredPermission: 'reports:read:aggregate',
        outcome: 'ALLOWED',
        statusCode: 200,
        details: 'Served privacy-preserving aggregate metrics (zero PII, DP enforced)'
      });

      return res.status(200).json({
        success: true,
        data: {
          ...privacyResult.data,
          privacyGuarantees: privacyResult.privacyGuarantees
        },
        privacyGuarantees: privacyResult.privacyGuarantees,
        budgetTelemetry: privacyResult.budgetTelemetry,
        meta: {
          requester: req.user.id,
          role: req.user.role,
          enforcement: 'PRIVACY_POLICY_ENGINE_ENFORCED'
        }
      });
    }

    // HUMAN ROLES (admin, affiliate_manager): Operational ground truth
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
      platformConversionRate,
      totalCommissionVolume,
      totalPaidCommissions,
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
      details: 'Served authorized operational aggregate metrics'
    });

    res.json({
      success: true,
      data: aggregatePayload,
      privacyGuarantees: {
        piiExposed: false,
        individualRecordsIncluded: false,
        computationType: 'Server-side operational aggregation'
      },
      meta: {
        requester: req.user.id,
        role: req.user.role,
        enforcement: 'OPERATIONAL_LEDGER_ACCESS'
      }
    });
  }
);

/**
 * 2. GET /api/reports/privacy-analytics
 * Dedicated Module 4 Endpoint returning Differential Privacy perturbed metrics
 * alongside k-anonymized category breakdown and budget status.
 */
router.get(
  '/privacy-analytics',
  requirePermission('reports:read:aggregate'),
  async (req, res) => {
    const affiliates = getAffiliates();
    const commissions = getCommissions();

    const privacyResult = await generatePrivacyPreservingAnalytics({
      rawAffiliates: affiliates,
      rawCommissions: commissions,
      user: req.user,
      requestedParams: {
        ...req.query,
        endpoint: '/api/reports/privacy-analytics',
        includeOperationalAudit: req.user.role === 'admin'
      }
    });

    if (!privacyResult.success) {
      await logActivity({
        userId: req.user.id,
        userRole: req.user.role,
        method: 'GET',
        endpoint: '/api/reports/privacy-analytics',
        requiredPermission: 'reports:read:aggregate',
        outcome: 'DENIED',
        statusCode: 429,
        details: `Privacy analytics halted: ${privacyResult.message}`
      });

      return res.status(429).json(privacyResult);
    }

    await logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      method: 'GET',
      endpoint: '/api/reports/privacy-analytics',
      requiredPermission: 'reports:read:aggregate',
      outcome: 'ALLOWED',
      statusCode: 200,
      details: 'Served privacy-preserving analytics with k-anonymity & DP noise'
    });

    res.status(200).json(privacyResult);
  }
);

/**
 * 3. GET /api/reports/privacy-budget
 * Inspects current privacy budget status, query count, and query history for MarketPulse.
 * Read-only diagnostic access (does not consume budget).
 */
router.get(
  '/privacy-budget',
  requirePermission('reports:read:aggregate'),
  async (req, res) => {
    const budget = await getPrivacyBudget('usr_agent_spark');

    if (!budget) {
      await logActivity({
        userId: req.user.id,
        userRole: req.user.role,
        method: 'GET',
        endpoint: '/api/reports/privacy-budget',
        requiredPermission: 'reports:read:aggregate',
        outcome: 'DENIED',
        statusCode: 503,
        details: 'Failed to read privacy budget state. Failing closed.'
      });

      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        code: 'PRIVACY_STATE_CORRUPTED',
        message: 'Authoritative privacy budget state could not be loaded. Failing closed for safety.'
      });
    }

    res.status(200).json({
      success: true,
      data: budget,
      meta: {
        requester: req.user.id,
        role: req.user.role,
        timestamp: new Date().toISOString()
      }
    });
  }
);

/**
 * 4. POST /api/reports/privacy-budget/reset
 * Administratively replenishes MarketPulse's privacy budget back to maximum allocation.
 * Strictly restricted to authorized Administrators with mandatory justification.
 */
router.post(
  '/privacy-budget/reset',
  requirePermission('reports:read:aggregate'),
  async (req, res) => {
    // 1. Role Authorization Gate: Admin Only
    if (req.user.role !== 'admin') {
      await logActivity({
        userId: req.user.id,
        userRole: req.user.role,
        method: 'POST',
        endpoint: '/api/reports/privacy-budget/reset',
        requiredPermission: 'admin_role',
        outcome: 'DENIED',
        statusCode: 403,
        details: `Unauthorized attempt to reset privacy budget by identity ${req.user.id} (${req.user.role})`
      });

      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'UNAUTHORIZED_ADMIN',
        message: 'Access Denied: Only an authorized Administrator can reset the Privacy Budget.'
      });
    }

    // 2. Reason Validation
    const { reason, agentId = 'usr_agent_spark' } = req.body || {};
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        code: 'INVALID_REASON',
        message: 'Privacy Safety Requirement: A valid justification reason is required to replenish the privacy budget.'
      });
    }

    // 3. Execute Reset
    const result = await resetPrivacyBudget(agentId, req.user, reason.trim());
    if (!result.success) {
      return res.status(400).json(result);
    }

    await logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      method: 'POST',
      endpoint: '/api/reports/privacy-budget/reset',
      requiredPermission: 'reports:read:aggregate',
      outcome: 'ALLOWED',
      statusCode: 200,
      details: `Privacy budget replenished for agent [${agentId}] by Admin ${req.user.id}: ${reason.trim()}`
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.budget
    });
  }
);

export default router;
