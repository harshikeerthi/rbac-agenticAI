/**
 * API Client for Affiliate Access Lab
 * Automatically injects the active demo identity header (x-demo-user-id).
 */

const API_BASE = (typeof window !== 'undefined' && window.location.hostname && window.location.port !== '5000')
  ? `http://${window.location.hostname}:5000/api`
  : '/api';

// Default active user is Admin
let currentDemoUserId = (typeof window !== 'undefined' && localStorage.getItem('demo_user_id')) || 'usr_admin_alex';

export function getActiveUserId() {
  return currentDemoUserId;
}

export function setActiveUserId(userId) {
  currentDemoUserId = userId;
  if (typeof window !== 'undefined') {
    localStorage.setItem('demo_user_id', userId);
  }
}

/**
 * Standard fetch wrapper that attaches x-demo-user-id
 */
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-demo-user-id': currentDemoUserId,
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({
    success: false,
    error: 'Parse Error',
    message: 'Failed to parse JSON response from server'
  }));

  return {
    status: response.status,
    ok: response.ok,
    data
  };
}

// 1. Identity & System Endpoints
export async function getMe() {
  return apiFetch('/me');
}

export async function getUsers() {
  return apiFetch('/users');
}

export async function getRoles() {
  return apiFetch('/roles');
}

export async function resetDemoData() {
  return apiFetch('/reset-data', { method: 'POST' });
}

// 2. Affiliate Management Endpoints
export async function getAffiliates() {
  return apiFetch('/affiliates');
}

export async function getAffiliateById(id) {
  return apiFetch(`/affiliates/${id}`);
}

export async function createAffiliate(payload) {
  return apiFetch('/affiliates', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateAffiliate(id, payload) {
  return apiFetch(`/affiliates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteAffiliate(id) {
  return apiFetch(`/affiliates/${id}`, {
    method: 'DELETE'
  });
}

// 3. Commission Endpoints
export async function getCommissions() {
  return apiFetch('/commissions');
}

export async function approveCommission(id) {
  return apiFetch(`/commissions/${id}/approve`, {
    method: 'POST'
  });
}

// 4. Reports & Aggregate Stats Endpoint
export async function getAggregateStats() {
  return apiFetch('/reports/aggregate-stats');
}

// 5. In-App Activity Log Endpoint
export async function getActivityLogs() {
  return apiFetch('/activity');
}

// 6. Agent Governance Endpoints
export async function getGovernancePolicies() {
  return apiFetch('/governance/policies');
}

export async function getGovernanceProposals(status) {
  const query = status ? `?status=${status}` : '';
  return apiFetch(`/governance/proposals${query}`);
}

export async function approveGovernanceProposal(id, notes = '') {
  return apiFetch(`/governance/proposals/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ notes })
  });
}

export async function rejectGovernanceProposal(id, reason = '') {
  return apiFetch(`/governance/proposals/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function dispatchGovernanceAction(actionName, parameters = {}) {
  return apiFetch('/governance/dispatch', {
    method: 'POST',
    body: JSON.stringify({ actionName, parameters })
  });
}

export async function getGovernanceAuditLogs() {
  return apiFetch('/governance/audit');
}

// 7. Agent Containment & Kill Switch Endpoints (Module 3)
export async function getContainmentStatus() {
  return apiFetch('/containment/status');
}

export async function setKillSwitch(engage, reason = '', agentId = 'usr_agent_spark') {
  return apiFetch('/containment/kill-switch', {
    method: 'POST',
    body: JSON.stringify({ engage, reason, agentId })
  });
}

export async function setContainmentMode(mode, reason = '', agentId = 'usr_agent_spark') {
  return apiFetch('/containment/mode', {
    method: 'POST',
    body: JSON.stringify({ mode, reason, agentId })
  });
}

export async function resetCircuitBreaker(reason = '', agentId = 'usr_agent_spark') {
  return apiFetch('/containment/reset', {
    method: 'POST',
    body: JSON.stringify({ reason, agentId })
  });
}

export async function getContainmentAudit() {
  return apiFetch('/containment/audit');
}

// 8. Module 4: Privacy-Aware Aggregate Analytics Endpoints
export async function getPrivacyAnalytics(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/reports/privacy-analytics?${query}` : '/reports/privacy-analytics';
  return apiFetch(url);
}

export async function getPrivacyBudget() {
  return apiFetch('/reports/privacy-budget');
}

export async function resetPrivacyBudget(reason, agentId = 'usr_agent_spark') {
  return apiFetch('/reports/privacy-budget/reset', {
    method: 'POST',
    body: JSON.stringify({ reason, agentId })
  });
}

/**
 * Probes the backend as MarketPulse AI Agent to verify containment live
 */
export async function probeAgentEndpoint(endpointType) {
  if (endpointType === 'aggregate_stats') {
    const res = await fetch(`${API_BASE}/reports/aggregate-stats`, {
      headers: {
        'Accept': 'application/json',
        'x-demo-user-id': 'usr_agent_spark'
      }
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  if (endpointType === 'privacy_analytics') {
    const res = await fetch(`${API_BASE}/reports/privacy-analytics`, {
      headers: {
        'Accept': 'application/json',
        'x-demo-user-id': 'usr_agent_spark'
      }
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  if (endpointType === 'propose_commission') {
    const res = await fetch(`${API_BASE}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-demo-user-id': 'usr_agent_spark'
      },
      body: JSON.stringify({
        actionName: 'propose_commission_adjustment',
        parameters: { targetAffiliateId: 'aff_alice', proposedRate: 16.5, reason: 'Live runtime probe test' }
      })
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  if (endpointType === 'prohibited_violation') {
    const res = await fetch(`${API_BASE}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-demo-user-id': 'usr_agent_spark'
      },
      body: JSON.stringify({
        actionName: 'read_affiliate_pii'
      })
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  return { status: 400, ok: false, data: { message: 'Unknown probe type' } };
}

/**
 * Raw Request Runner for Security Sandbox
 * Allows custom headers and methods to test real-world attacks
 */
export async function executeDirectApiCall({ method = 'GET', path, customHeaders = {}, body = null }) {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };

  const options = {
    method,
    headers
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const startTime = performance.now();
  const response = await fetch(`${API_BASE}${path}`, options);
  const latency = Math.round(performance.now() - startTime);

  const responseJson = await response.json().catch(() => ({ raw: 'Non-JSON response' }));

  return {
    status: response.status,
    statusText: response.statusText,
    latencyMs: latency,
    headers: Object.fromEntries(response.headers.entries()),
    data: responseJson
  };
}

