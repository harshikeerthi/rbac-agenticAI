import { getAgentPolicy } from '../store.js';

/**
 * Governance Policy Evaluation Engine
 * 
 * Evaluates an attempted agent action against authoritative policy guardrails
 * stored in agent_policies.json.
 * 
 * Action Categories:
 * 1. ALLOWED: Low-risk, read-only analytics. Can be executed autonomously.
 * 2. REQUIRES_APPROVAL: High-impact changes (e.g. commission adjustments).
 *    Must be intercepted and queued for Human-in-the-Loop (HITL) Admin review.
 * 3. PROHIBITED: Explicitly forbidden actions (e.g. accessing raw partner PII).
 *    Must be terminated immediately with HTTP 403.
 * 
 * ZERO-TRUST DEFAULT:
 * Any unlisted or unknown action is rejected by default as PROHIBITED.
 * 
 * @param {string} actionName
 * @param {string} agentId
 * @returns {{ category: 'ALLOWED'|'REQUIRES_APPROVAL'|'PROHIBITED', reason?: string, policy: object }}
 */
export function evaluateAgentAction(actionName, agentId = 'usr_agent_spark') {
  const policy = getAgentPolicy(agentId);

  if (!policy) {
    return {
      category: 'PROHIBITED',
      reason: `No governance policy registered for agent identity [${agentId}].`,
      policy: null
    };
  }

  // 1. Check if explicitly allowed (Autonomous)
  if (Array.isArray(policy.allowedActions) && policy.allowedActions.includes(actionName)) {
    return {
      category: 'ALLOWED',
      actionName,
      agentId,
      policy
    };
  }

  // 2. Check if requires Human-in-the-Loop review (HITL)
  if (Array.isArray(policy.requiresApprovalActions) && policy.requiresApprovalActions.includes(actionName)) {
    return {
      category: 'REQUIRES_APPROVAL',
      actionName,
      agentId,
      policy
    };
  }

  // 3. Check if explicitly prohibited
  if (Array.isArray(policy.prohibitedActions) && policy.prohibitedActions.includes(actionName)) {
    return {
      category: 'PROHIBITED',
      reason: `Action [${actionName}] is explicitly prohibited by policy for agent [${agentId}].`,
      actionName,
      agentId,
      policy
    };
  }

  // 4. Default Zero-Trust Fallback: Unknown actions are strictly prohibited
  return {
    category: 'PROHIBITED',
    reason: `Action [${actionName}] is unlisted and prohibited under Zero-Trust agent policy.`,
    actionName,
    agentId,
    policy
  };
}

