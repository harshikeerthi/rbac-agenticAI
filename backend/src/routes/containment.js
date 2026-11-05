import { Router } from 'express';
import {
  getContainmentState,
  setKillSwitch,
  setContainmentMode,
  resetCircuitBreaker,
  getContainmentAuditLogs
} from '../store.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

/**
 * 1. GET /api/containment/status
 * Returns authoritative containment and circuit breaker state. (Admin Only)
 */
router.get(
  '/status',
  requirePermission('containment:read'),
  (req, res) => {
    const state = getContainmentState('usr_agent_spark');
    if (!state) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        code: 'AGENT_STATE_NOT_FOUND',
        message: 'No containment state found for simulated agent usr_agent_spark.'
      });
    }

    res.json({
      success: true,
      data: state,
      circuitBreaker: state.circuitBreaker,
      meta: {
        requester: req.user.id,
        role: req.user.role,
        timestamp: new Date().toISOString()
      }
    });
  }
);

/**
 * 2. POST /api/containment/kill-switch
 * Toggles emergency Kill Switch (engage: true/false). (Admin Only)
 */
router.post(
  '/kill-switch',
  requirePermission('containment:manage'),
  async (req, res) => {
    const { engage, reason, agentId = 'usr_agent_spark' } = req.body;

    if (typeof engage !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        code: 'INVALID_PAYLOAD',
        message: 'Request body must specify a boolean [engage] field (true to engage, false to disengage).'
      });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        code: 'INVALID_REASON',
        message: 'A valid justification reason is required for Kill Switch operations.'
      });
    }

    const result = await setKillSwitch(agentId, engage, req.user, reason.trim());
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json({
      success: true,
      message: engage
        ? 'Emergency Kill Switch ENGAGED: MarketPulse AI Agent runtime terminated.'
        : 'Emergency Kill Switch DISENGAGED: MarketPulse AI Agent runtime restored to NORMAL.',
      data: result.containment
    });
  }
);

/**
 * 3. POST /api/containment/mode
 * Transitions containment mode to NORMAL, QUARANTINE, or TERMINATED. (Admin Only)
 */
router.post(
  '/mode',
  requirePermission('containment:manage'),
  async (req, res) => {
    const { mode, reason, agentId = 'usr_agent_spark' } = req.body;
    const validModes = ['NORMAL', 'QUARANTINE', 'TERMINATED'];

    if (!mode || !validModes.includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        code: 'INVALID_CONTAINMENT_MODE',
        message: `Field [mode] must be one of: ${validModes.join(', ')}.`
      });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        code: 'INVALID_REASON',
        message: 'A valid justification reason is required to change containment mode.'
      });
    }

    const result = await setContainmentMode(agentId, mode, req.user, reason.trim());
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json({
      success: true,
      message: `Containment mode updated to [${mode}].`,
      data: result.containment
    });
  }
);

/**
 * 4. POST /api/containment/reset
 * Resets safety circuit breaker counters and restores NORMAL mode. (Admin Only)
 */
router.post(
  '/reset',
  requirePermission('containment:manage'),
  async (req, res) => {
    const { reason, agentId = 'usr_agent_spark' } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        code: 'INVALID_REASON',
        message: 'A valid justification reason is required to reset the safety circuit breaker.'
      });
    }

    const result = await resetCircuitBreaker(agentId, req.user, reason.trim());
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json({
      success: true,
      message: 'Safety circuit breaker counters reset and agent restored to NORMAL operational mode.',
      data: result.containment
    });
  }
);

/**
 * 5. GET /api/containment/audit
 * Returns append-only containment audit log stream. (Admin Only)
 */
router.get(
  '/audit',
  requirePermission('containment:read'),
  (req, res) => {
    const logs = getContainmentAuditLogs();
    res.json({
      success: true,
      count: logs.length,
      data: logs,
      meta: {
        requester: req.user.id,
        role: req.user.role,
        timestamp: new Date().toISOString()
      }
    });
  }
);

export default router;

