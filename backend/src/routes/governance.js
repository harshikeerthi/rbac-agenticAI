import { Router } from 'express';
import {
  getAgentPolicies,
  getAgentProposals,
  getAgentProposalById,
  createAgentProposal,
  approveAgentProposal,
  rejectAgentProposal,
  getAgentAuditLogs,
  logAgentAudit,
  getAffiliates,
  getCommissions,
  getAffiliateById,
  recordAgentViolation
} from '../store.js';
import { requirePermission } from '../middleware/rbac.js';
import { evaluateAgentAction } from '../middleware/governance.js';
import { generatePrivacyPreservingAnalytics } from '../services/privacyEngine.js';

const router = Router();

/**
 * 1. POST /api/governance/dispatch
 * 
 * Main execution and evaluation gateway for simulated agent actions.
 * 
 * Dual-Layer Security Pipeline:
 * Layer 1 (RBAC): Requires 'governance:execute' or 'governance:admin'.
 * Layer 2 (Governance Engine): Evaluates action category against agent policy.
 */
router.post(
  '/dispatch',
  requirePermission(['governance:execute', 'governance:admin']),
  async (req, res) => {
    const { actionName, parameters = {} } = req.body;

    if (!actionName || typeof actionName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        code: 'INVALID_ACTION_PAYLOAD',
        message: 'Request body must specify a valid [actionName] string.'
      });
    }

    // Layer 2: Policy Evaluation Check
    const evaluation = evaluateAgentAction(actionName, req.user.id);

    // CASE 1: PROHIBITED (Explicitly forbidden or unlisted action)
    if (evaluation.category === 'PROHIBITED') {
      await logAgentAudit({
        agentId: req.user.id,
        actionName,
        policyEvaluated: 'PROHIBITED_ACTION_GUARD',
        outcome: 'PROHIBITED',
        details: evaluation.reason || `Action ${actionName} is prohibited under agent policy.`,
        actorId: req.user.id,
        reviewerId: null
      });

      // Module 3: Circuit Breaker Violation Tracking
      let breakerStatus = null;
      if (req.user.role === 'ai_agent') {
        breakerStatus = await recordAgentViolation(req.user.id);
      }

      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'POLICY_VIOLATION',
        actionName,
        policyCategory: 'PROHIBITED',
        message: `Governance Policy Violation: Action [${actionName}] is prohibited for identity [${req.user.id}].`,
        details: {
          reason: evaluation.reason,
          agentId: req.user.id,
          circuitBreaker: breakerStatus
        }
      });
    }

    // CASE 2: REQUIRES_APPROVAL (High-impact changes like commission adjustment)
    if (evaluation.category === 'REQUIRES_APPROVAL') {
      const { targetAffiliateId, proposedRate, reason } = parameters;

      if (!targetAffiliateId) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          code: 'MISSING_TARGET_AFFILIATE',
          message: 'Parameter [targetAffiliateId] is required for commission adjustment proposals.'
        });
      }

      const affiliate = getAffiliateById(targetAffiliateId);
      if (!affiliate) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          code: 'AFFILIATE_NOT_FOUND',
          message: `Target affiliate [${targetAffiliateId}] does not exist.`
        });
      }

      const numericRate = Number(proposedRate);
      if (typeof proposedRate !== 'number' || isNaN(numericRate) || numericRate < 1.0 || numericRate > 50.0) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          code: 'INVALID_COMMISSION_RATE',
          message: `Proposed commission rate must be a numeric value between 1.0% and 50.0%. Provided: [${proposedRate}].`
        });
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          code: 'INVALID_REASON',
          message: 'A clear justification reason is required when submitting a commission proposal.'
        });
      }

      // Create proposal awaiting Human-in-the-Loop review
      const proposal = await createAgentProposal({
        agentId: req.user.id,
        agentName: req.user.name,
        actionName,
        targetAffiliateId,
        proposedRate: numericRate,
        reason: reason.trim()
      });

      await logAgentAudit({
        agentId: req.user.id,
        actionName,
        policyEvaluated: 'HUMAN_IN_THE_LOOP_REQUIRED',
        outcome: 'QUEUED_FOR_APPROVAL',
        details: `Intercepted high-impact action: Queued proposal [${proposal.id}] for affiliate ${affiliate.name} (${numericRate}%) for Admin review.`,
        actorId: req.user.id,
        reviewerId: null
      });

      return res.status(202).json({
        success: true,
        outcome: 'QUEUED_FOR_APPROVAL',
        actionName,
        policyCategory: 'REQUIRES_APPROVAL',
        message: 'High-impact action intercepted: Queued for Administrator review.',
        proposal
      });
    }

    // CASE 3: ALLOWED (Low-risk autonomous analytics)
    if (evaluation.category === 'ALLOWED') {
      const affiliates = getAffiliates();
      const commissions = getCommissions();

      // AI Agent access path: Enforce Privacy Policy Engine & Budget Gate
      if (req.user.role === 'ai_agent') {
        const privacyResult = await generatePrivacyPreservingAnalytics({
          rawAffiliates: affiliates,
          rawCommissions: commissions,
          user: req.user,
          requestedParams: {
            endpoint: '/api/governance/dispatch',
            actionName
          }
        });

        if (!privacyResult.success) {
          await logAgentAudit({
            agentId: req.user.id,
            actionName,
            policyEvaluated: 'ALLOWED_AUTONOMOUS_ACTION',
            outcome: 'DENIED',
            details: `Autonomous execution halted: ${privacyResult.message}`,
            actorId: req.user.id,
            reviewerId: null
          });

          return res.status(429).json(privacyResult);
        }

        await logAgentAudit({
          agentId: req.user.id,
          actionName,
          policyEvaluated: 'ALLOWED_AUTONOMOUS_ACTION',
          outcome: 'EXECUTED',
          details: 'Autonomous execution permitted: Served privacy-preserving aggregate metrics (DP Laplace noise applied, zero raw figures).',
          actorId: req.user.id,
          reviewerId: null
        });

        return res.status(200).json({
          success: true,
          outcome: 'EXECUTED',
          actionName,
          policyCategory: 'ALLOWED',
          message: 'Action executed autonomously under privacy-preserving least-privilege policy.',
          data: {
            ...privacyResult.data,
            privacyGuarantees: privacyResult.privacyGuarantees
          },
          privacyGuarantees: privacyResult.privacyGuarantees,
          budgetTelemetry: privacyResult.budgetTelemetry
        });
      }

      // Non-agent execution (e.g. Admin simulating query_aggregate_metrics)
      const totalClicks = affiliates.reduce((sum, a) => sum + (a.metrics?.totalClicks || 0), 0);
      const totalConversions = affiliates.reduce((sum, a) => sum + (a.metrics?.totalConversions || 0), 0);
      const totalCommissionVolume = commissions.reduce((sum, c) => sum + (c.amount || 0), 0);

      const aggregateStats = {
        totalAffiliatesCount: affiliates.length,
        totalPlatformClicks: totalClicks,
        totalPlatformConversions: totalConversions,
        platformConversionRate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) + '%' : '0.00%',
        totalCommissionVolume,
        privacyGuarantees: {
          piiExposed: false,
          individualRecordsIncluded: false
        },
        generatedAt: new Date().toISOString()
      };

      await logAgentAudit({
        agentId: req.user.id,
        actionName,
        policyEvaluated: 'ALLOWED_AUTONOMOUS_ACTION',
        outcome: 'EXECUTED',
        details: 'Simulated execution permitted: Served aggregate metrics.',
        actorId: req.user.id,
        reviewerId: null
      });

      return res.status(200).json({
        success: true,
        outcome: 'EXECUTED',
        actionName,
        policyCategory: 'ALLOWED',
        message: 'Action executed under least-privilege policy.',
        data: aggregateStats
      });
    }

    // Safety fallback
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      code: 'POLICY_VIOLATION',
      message: 'Action cannot be processed.'
    });
  }
);

/**
 * 2. GET /api/governance/policies
 * Returns active policy rules and guardrails. (Admin Only)
 */
router.get(
  '/policies',
  requirePermission('governance:admin'),
  (req, res) => {
    res.json({
      success: true,
      policies: getAgentPolicies(),
      meta: {
        requester: req.user.id,
        role: req.user.role
      }
    });
  }
);

/**
 * 3. GET /api/governance/proposals
 * Lists all agent proposals. Supports optional ?status=pending filtering. (Admin Only)
 */
router.get(
  '/proposals',
  requirePermission('governance:admin'),
  (req, res) => {
    let proposals = getAgentProposals();
    const { status } = req.query;

    if (status) {
      proposals = proposals.filter(p => p.status === status);
    }

    res.json({
      success: true,
      count: proposals.length,
      data: proposals,
      meta: {
        requester: req.user.id,
        role: req.user.role
      }
    });
  }
);

/**
 * 4. POST /api/governance/proposals/:id/approve
 * Revalidates and executes an approved agent proposal. (Admin Only)
 */
router.post(
  '/proposals/:id/approve',
  requirePermission('governance:admin'),
  async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body || {};

    const result = await approveAgentProposal(id, req.user, notes);

    if (!result.success) {
      const statusMap = {
        PROPOSAL_NOT_FOUND: 404,
        AFFILIATE_NOT_FOUND: 404,
        SELF_APPROVAL_DISALLOWED: 403,
        UNAUTHORIZED_APPROVER: 403,
        PROPOSAL_ALREADY_RESOLVED: 400,
        INVALID_COMMISSION_RATE: 400,
        INVALID_REASON: 400
      };
      const statusCode = statusMap[result.code] || 400;

      return res.status(statusCode).json({
        success: false,
        error: statusCode === 403 ? 'Forbidden' : (statusCode === 404 ? 'Not Found' : 'Bad Request'),
        code: result.code,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: `Proposal [${id}] approved and commission adjustment successfully applied.`,
      proposal: result.proposal,
      updatedAffiliate: result.updatedAffiliate
    });
  }
);

/**
 * 5. POST /api/governance/proposals/:id/reject
 * Rejects an agent proposal with required justification. (Admin Only)
 */
router.post(
  '/proposals/:id/reject',
  requirePermission('governance:admin'),
  async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        code: 'INVALID_REASON',
        message: 'A rejection reason is required.'
      });
    }

    const result = await rejectAgentProposal(id, req.user, reason.trim());

    if (!result.success) {
      const statusMap = {
        PROPOSAL_NOT_FOUND: 404,
        UNAUTHORIZED_APPROVER: 403,
        PROPOSAL_ALREADY_RESOLVED: 400
      };
      const statusCode = statusMap[result.code] || 400;

      return res.status(statusCode).json({
        success: false,
        error: statusCode === 403 ? 'Forbidden' : (statusCode === 404 ? 'Not Found' : 'Bad Request'),
        code: result.code,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: `Proposal [${id}] has been rejected.`,
      proposal: result.proposal
    });
  }
);

/**
 * 6. GET /api/governance/audit
 * Returns the dedicated append-only agent audit log stream. (Admin Only)
 */
router.get(
  '/audit',
  requirePermission('governance:admin'),
  (req, res) => {
    const logs = getAgentAuditLogs();

    res.json({
      success: true,
      count: logs.length,
      data: logs,
      meta: {
        requester: req.user.id,
        role: req.user.role
      }
    });
  }
);

export default router;

