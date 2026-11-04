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

