import { getContainmentState, logActivity, logContainmentAudit } from '../store.js';

/**
 * Agent Runtime Containment & Kill Switch Middleware
 * 
 * Provides server-side emergency isolation and execution control over the simulated
 * MarketPulse AI Agent (usr_agent_spark).
 * 
 * CORE ARCHITECTURAL PRINCIPLES:
 * 1. Zero Trust: Never trusts client-supplied role, permissions, or containment status.
 * 2. Scope Isolation: Strictly intercepts `ai_agent` requests. Human personas (admin,
 *    affiliate_manager, affiliate_user) completely bypass containment checks.
 * 3. Fail Closed: If server-side containment state cannot be retrieved or is malformed,
 *    all agent operations are blocked immediately with HTTP 503.
 * 4. Mode Enforcement:
 *    - NORMAL: Agent operates under standard RBAC and governance policies.
 *    - QUARANTINE: Autonomous execution and proposal generation suspended (HTTP 403).
 *      Read-only privacy-preserving aggregate metrics remain permitted for diagnostics.
 *    - TERMINATED: Hard Kill Switch. All protected agent endpoints return HTTP 503.
 */
export async function enforceAgentContainment(req, res, next) {
  // 1. Human users completely bypass agent runtime containment
  if (!req.user || req.user.role !== 'ai_agent') {
    return next();
  }

  // 2. Allow identity resolution endpoint (/api/me) so client-side persona inspector stays functional
  if (req.path === '/me') {
    return next();
  }

  // 3. Resolve authoritative server-side containment state
  const state = getContainmentState(req.user.id);

  // 4. Fail-Closed Check: If state cannot be read or is invalid, block all agent actions
  if (!state || typeof state !== 'object' || !state.containmentMode) {
    await logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      method: req.method,
      endpoint: req.originalUrl,
      requiredPermission: 'containment:verified',
      outcome: 'DENIED',
      statusCode: 503,
      details: 'Containment state unreadable or missing. Failing closed for safety.'
    });

    return res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      code: 'CONTAINMENT_STATE_INVALID',
      message: `Agent Containment Failure: Unable to verify runtime containment state for agent [${req.user.id}]. Failing closed for safety.`
    });
  }

  // 5. TERMINATED MODE / EMERGENCY KILL SWITCH ENGAGED
  if (state.containmentMode === 'TERMINATED' || state.killSwitchEngaged === true) {
    await logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      method: req.method,
      endpoint: req.originalUrl,
      requiredPermission: 'agent_active_status',
      outcome: 'DENIED',
      statusCode: 503,
      details: `Execution blocked by active Kill Switch / TERMINATED containment mode: ${req.method} ${req.originalUrl}`
    });

    await logContainmentAudit({
      agentId: req.user.id,
      eventType: 'INTERCEPTED_REQUEST',
      previousMode: state.containmentMode,
      newMode: state.containmentMode,
      triggeredBy: 'ENFORCEMENT_MIDDLEWARE',
      reason: 'Agent execution blocked while Kill Switch is active / TERMINATED mode',
      details: `Intercepted blocked request [${req.method} ${req.originalUrl}] from ${req.user.id}.`
    });

    return res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      code: 'AGENT_CONTAINMENT_ACTIVE',
      containmentMode: 'TERMINATED',
      killSwitchEngaged: true,
      message: 'Agent execution halted: Runtime containment is ACTIVE (TERMINATED). All autonomous agent operations are suspended.',
      details: {
        agentId: req.user.id,
        mode: 'TERMINATED',
        lastTransition: state.lastTransition
      }
    });
  }

  // 6. QUARANTINE MODE
  if (state.containmentMode === 'QUARANTINE') {
    // Determine whether this request is permitted under quarantine:
    // Permitted: Read-only aggregate diagnostics and privacy telemetry
    const isAggregateReport = req.originalUrl.includes('/reports/aggregate-stats') ||
      req.originalUrl.includes('/reports/privacy-analytics') ||
      req.originalUrl.includes('/reports/privacy-budget');
    const isAggregateDispatch = req.originalUrl.includes('/governance/dispatch') && req.body?.actionName === 'query_aggregate_metrics';

    // Strictly blocked: Autonomous mutations and proposal submissions
    const isProposalSubmission = req.originalUrl.includes('/governance/dispatch') && req.body?.actionName === 'propose_commission_adjustment';

    if (isProposalSubmission) {
      await logActivity({
        userId: req.user.id,
        userRole: req.user.role,
        method: req.method,
        endpoint: req.originalUrl,
        requiredPermission: 'governance:execute',
        outcome: 'DENIED',
        statusCode: 403,
        details: 'Proposal submission blocked: Agent runtime is quarantined.'
      });

      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'AGENT_QUARANTINED',
        containmentMode: 'QUARANTINE',
        actionName: req.body?.actionName,
        message: 'Agent operation suspended: MarketPulse is in QUARANTINE mode. Proposal submissions and autonomous modifications are suspended.',
        details: {
          agentId: req.user.id,
          mode: 'QUARANTINE',
          permittedUnderQuarantine: ['query_aggregate_metrics', 'GET /api/reports/aggregate-stats'],
          lastTransition: state.lastTransition
        }
      });
    }

    // Allow read-only aggregate metrics to proceed
    if (isAggregateReport || isAggregateDispatch) {
      return next();
    }

    // For any unlisted or prohibited action sent to dispatch, allow it to reach governance
    // so governance evaluates it as PROHIBITED, logs the violation, and records it with circuit breaker!
    if (req.originalUrl.includes('/governance/dispatch')) {
      return next();
    }

    // All other endpoints for an agent in QUARANTINE are denied
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      code: 'AGENT_QUARANTINED',
      containmentMode: 'QUARANTINE',
      message: `Agent operation suspended: Endpoint [${req.method} ${req.originalUrl}] is not permitted while in QUARANTINE mode.`
    });
  }

  // 7. NORMAL MODE -> Proceed with standard RBAC and governance pipeline
  next();
}

