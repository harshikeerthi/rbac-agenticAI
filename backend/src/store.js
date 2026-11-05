import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

// Canonical seed data to guarantee 100% reproducible resets across test runs
const CANONICAL_AFFILIATES = [
  {
    id: "aff_alice",
    userId: "usr_aff_alice",
    name: "Alice Rivera",
    email: "alice@techreviews.com",
    website: "https://techreviews.com",
    category: "Consumer Electronics & SaaS",
    assignedManagerId: "usr_mgr_sarah",
    status: "active",
    commissionRate: 15.0,
    referralCode: "ALICE-TECH-2026",
    metrics: {
      totalClicks: 14200,
      totalConversions: 850,
      totalEarnings: 12750.00
    },
    internalNotes: "Top tech influencer. High conversion on productivity software reviews."
  },
  {
    id: "aff_bob",
    userId: "usr_aff_bob",
    name: "Bob Chen",
    email: "bob@fitnessgear.io",
    website: "https://fitnessgear.io",
    category: "Health & Fitness",
    assignedManagerId: "usr_mgr_sarah",
    status: "active",
    commissionRate: 12.5,
    referralCode: "BOB-FIT-2026",
    metrics: {
      totalClicks: 9100,
      totalConversions: 420,
      totalEarnings: 5250.00
    },
    internalNotes: "Fitness and nutrition specialist. Currently testing summer pre-workout campaign."
  },
  {
    id: "aff_charlie",
    userId: "usr_aff_charlie",
    name: "Charlie Gomez",
    email: "charlie@lifestylehub.blog",
    website: "https://lifestylehub.blog",
    category: "Home & Lifestyle",
    assignedManagerId: "usr_mgr_david",
    status: "pending_review",
    commissionRate: 10.0,
    referralCode: "CHARLIE-LIFE-2026",
    metrics: {
      totalClicks: 2100,
      totalConversions: 95,
      totalEarnings: 950.00
    },
    internalNotes: "Assigned to David Kim. Awaiting tax compliance form W-8BEN."
  }
];

const CANONICAL_COMMISSIONS = [
  {
    id: "comm_101",
    affiliateId: "aff_alice",
    affiliateName: "Alice Rivera",
    userId: "usr_aff_alice",
    assignedManagerId: "usr_mgr_sarah",
    amount: 2500.00,
    period: "October 2026",
    status: "paid",
    approvedBy: "usr_admin_alex",
    createdAt: "2026-11-01T09:00:00.000Z"
  },
  {
    id: "comm_102",
    affiliateId: "aff_bob",
    affiliateName: "Bob Chen",
    userId: "usr_aff_bob",
    assignedManagerId: "usr_mgr_sarah",
    amount: 1100.00,
    period: "October 2026",
    status: "pending",
    approvedBy: null,
    createdAt: "2026-11-01T09:15:00.000Z"
  },
  {
    id: "comm_103",
    affiliateId: "aff_charlie",
    affiliateName: "Charlie Gomez",
    userId: "usr_aff_charlie",
    assignedManagerId: "usr_mgr_david",
    amount: 350.00,
    period: "October 2026",
    status: "pending",
    approvedBy: null,
    createdAt: "2026-11-01T09:30:00.000Z"
  }
];

const CANONICAL_LOGS = [
  {
    id: "act_seed_001",
    timestamp: "2026-11-03T12:00:00.000Z",
    userId: "system",
    userRole: "system",
    method: "BOOT",
    endpoint: "/system/init",
    requiredPermission: "none",
    outcome: "ALLOWED",
    statusCode: 200,
    details: "Affiliate Access Lab security subsystem initialized."
  }
];

// Canonical seed data for Agent Governance & Audit (Module 2)
const CANONICAL_AGENT_POLICIES = {
  usr_agent_spark: {
    agentId: "usr_agent_spark",
    agentName: "MarketPulse AI Agent",
    description: "Simulated analytical agent governed by least-privilege and human-in-the-loop controls",
    allowedActions: [
      "query_aggregate_metrics"
    ],
    requiresApprovalActions: [
      "propose_commission_adjustment"
    ],
    prohibitedActions: [
      "read_affiliate_pii"
    ],
    commissionRateLimits: {
      minRate: 1.0,
      maxRate: 50.0
    }
  }
};

const CANONICAL_AGENT_PROPOSALS = [
  {
    id: "prop_seed_001",
    agentId: "usr_agent_spark",
    agentName: "MarketPulse AI Agent",
    actionName: "propose_commission_adjustment",
    targetAffiliateId: "aff_alice",
    targetAffiliateName: "Alice Rivera",
    currentRate: 15.0,
    proposedRate: 18.0,
    reason: "Top Q3 SaaS conversions reached 850 with 6.0% conversion rate.",
    status: "pending",
    createdAt: "2026-11-03T14:00:00.000Z",
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null
  }
];

const CANONICAL_AGENT_AUDIT = [
  {
    id: "gaudit_seed_001",
    timestamp: "2026-11-03T12:00:00.000Z",
    agentId: "system",
    actionName: "governance_subsystem_init",
    policyEvaluated: "SYSTEM_POLICY",
    outcome: "EXECUTED",
    details: "Agent Governance & Audit subsystem initialized with dual-layer security.",
    actorId: "system",
    reviewerId: null
  }
];

// Canonical seed data for Agent Kill Switch & Runtime Containment (Module 3)
const CANONICAL_CONTAINMENT_STATE = {
  usr_agent_spark: {
    agentId: "usr_agent_spark",
    agentName: "MarketPulse AI Agent",
    killSwitchEngaged: false,
    containmentMode: "NORMAL", // 'NORMAL', 'QUARANTINE', 'TERMINATED'
    circuitBreaker: {
      enabled: true,
      tripThreshold: 3,
      currentViolations: 0,
      isTripped: false
    },
    lastTransition: {
      timestamp: "2026-11-05T11:00:00.000Z",
      previousMode: "NORMAL",
      newMode: "NORMAL",
      triggeredBy: "system",
      reason: "Initial platform initialization"
    }
  }
};

const CANONICAL_CONTAINMENT_AUDIT = [
  {
    id: "c_audit_seed_001",
    timestamp: "2026-11-05T11:00:00.000Z",
    agentId: "system",
    eventType: "SYSTEM_INIT",
    previousMode: "NORMAL",
    newMode: "NORMAL",
    triggeredBy: "system",
    reason: "Agent Kill Switch & Runtime Containment subsystem initialized.",
    details: "Subsystem online with NORMAL, QUARANTINE, and TERMINATED containment support."
  }
];

// In-memory working copies for low-latency operations and test isolation
let roles = {};
let users = [];
let affiliates = [];
let commissions = [];
let activityLogs = [];
let agentPolicies = {};
let agentProposals = [];
let agentAuditLogs = [];
let containmentState = {};
let containmentAuditLogs = [];

// Helper to safely read a JSON file
async function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

// Helper to safely write a JSON file
async function writeJson(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Initialize or reload the store from disk
 */
export async function initStore() {
  roles = await readJson('roles.json');
  users = await readJson('users.json');
  try {
    affiliates = await readJson('affiliates.json');
  } catch {
    affiliates = JSON.parse(JSON.stringify(CANONICAL_AFFILIATES));
  }
  try {
    commissions = await readJson('commissions.json');
  } catch {
    commissions = JSON.parse(JSON.stringify(CANONICAL_COMMISSIONS));
  }
  try {
    activityLogs = await readJson('activity_logs.json');
  } catch {
    activityLogs = JSON.parse(JSON.stringify(CANONICAL_LOGS));
  }
  try {
    agentPolicies = await readJson('agent_policies.json');
  } catch {
    agentPolicies = JSON.parse(JSON.stringify(CANONICAL_AGENT_POLICIES));
  }
  try {
    agentProposals = await readJson('agent_proposals.json');
  } catch {
    agentProposals = JSON.parse(JSON.stringify(CANONICAL_AGENT_PROPOSALS));
  }
  try {
    agentAuditLogs = await readJson('agent_audit.json');
  } catch {
    agentAuditLogs = JSON.parse(JSON.stringify(CANONICAL_AGENT_AUDIT));
  }
  try {
    containmentState = await readJson('containment_state.json');
  } catch {
    containmentState = JSON.parse(JSON.stringify(CANONICAL_CONTAINMENT_STATE));
  }
  try {
    containmentAuditLogs = await readJson('containment_audit.json');
  } catch {
    containmentAuditLogs = JSON.parse(JSON.stringify(CANONICAL_CONTAINMENT_AUDIT));
  }
}

/**
 * Reset store to canonical seed data
 */
export async function resetStore() {
  affiliates = JSON.parse(JSON.stringify(CANONICAL_AFFILIATES));
  commissions = JSON.parse(JSON.stringify(CANONICAL_COMMISSIONS));
  activityLogs = JSON.parse(JSON.stringify(CANONICAL_LOGS));
  agentPolicies = JSON.parse(JSON.stringify(CANONICAL_AGENT_POLICIES));
  agentProposals = JSON.parse(JSON.stringify(CANONICAL_AGENT_PROPOSALS));
  agentAuditLogs = JSON.parse(JSON.stringify(CANONICAL_AGENT_AUDIT));
  containmentState = JSON.parse(JSON.stringify(CANONICAL_CONTAINMENT_STATE));
  containmentAuditLogs = JSON.parse(JSON.stringify(CANONICAL_CONTAINMENT_AUDIT));

  await writeJson('affiliates.json', affiliates);
  await writeJson('commissions.json', commissions);
  await writeJson('activity_logs.json', activityLogs);
  await writeJson('agent_policies.json', agentPolicies);
  await writeJson('agent_proposals.json', agentProposals);
  await writeJson('agent_audit.json', agentAuditLogs);
  await writeJson('containment_state.json', containmentState);
  await writeJson('containment_audit.json', containmentAuditLogs);

  roles = await readJson('roles.json');
  users = await readJson('users.json');
}

/**
 * Getters for store entities
 */
export function getRoles() {
  return roles;
}

export function getUsers() {
  return users;
}

export function getUserById(userId) {
  return users.find(u => u.id === userId);
}

export function getAffiliates() {
  return affiliates;
}

export function getAffiliateById(id) {
  return affiliates.find(a => a.id === id);
}

export function getCommissions() {
  return commissions;
}

export function getCommissionById(id) {
  return commissions.find(c => c.id === id);
}

export function getActivityLogs() {
  return activityLogs;
}

/**
 * Agent Governance Getters (Module 2)
 */
export function getAgentPolicies() {
  return agentPolicies;
}

export function getAgentPolicy(agentId = 'usr_agent_spark') {
  return agentPolicies[agentId] || null;
}

export function getAgentProposals() {
  return agentProposals;
}

export function getAgentProposalById(id) {
  return agentProposals.find(p => p.id === id) || null;
}

export function getAgentAuditLogs() {
  return agentAuditLogs;
}

/**
 * Agent Containment Getters (Module 3)
 */
export function getContainmentState(agentId = 'usr_agent_spark') {
  return containmentState[agentId] || null;
}

export function getAllContainmentStates() {
  return containmentState;
}

export function getContainmentAuditLogs() {
  return containmentAuditLogs;
}

/**
 * Mutators with persistence to JSON files (Module 1)
 */
export async function addAffiliate(newAffiliate) {
  affiliates.push(newAffiliate);
  await writeJson('affiliates.json', affiliates);
  return newAffiliate;
}

export async function updateAffiliate(id, updates) {
  const index = affiliates.findIndex(a => a.id === id);
  if (index === -1) return null;
  affiliates[index] = { ...affiliates[index], ...updates };
  await writeJson('affiliates.json', affiliates);
  return affiliates[index];
}

export async function deleteAffiliate(id) {
  const index = affiliates.findIndex(a => a.id === id);
  if (index === -1) return false;
  affiliates.splice(index, 1);
  await writeJson('affiliates.json', affiliates);
  return true;
}

export async function approveCommission(commissionId, adminId) {
  const index = commissions.findIndex(c => c.id === commissionId);
  if (index === -1) return null;
  commissions[index] = {
    ...commissions[index],
    status: 'paid',
    approvedBy: adminId,
    approvedAt: new Date().toISOString()
  };
  await writeJson('commissions.json', commissions);
  return commissions[index];
}

export async function logActivity(entry) {
  const logItem = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  activityLogs.unshift(logItem); // Most recent first
  if (activityLogs.length > 150) {
    activityLogs = activityLogs.slice(0, 150);
  }
  await writeJson('activity_logs.json', activityLogs);
  return logItem;
}

/**
 * Agent Governance Mutators & Revalidation (Module 2)
 */

export async function createAgentProposal({ agentId, agentName, actionName, targetAffiliateId, proposedRate, reason }) {
  const affiliate = getAffiliateById(targetAffiliateId);
  const proposal = {
    id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    agentId,
    agentName: agentName || 'MarketPulse AI Agent',
    actionName,
    targetAffiliateId,
    targetAffiliateName: affiliate ? affiliate.name : 'Unknown Partner',
    currentRate: affiliate ? affiliate.commissionRate : 0,
    proposedRate: Number(proposedRate),
    reason: reason || 'Routine autonomous rate optimization recommendation.',
    status: 'pending',
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null
  };

  agentProposals.unshift(proposal);
  await writeJson('agent_proposals.json', agentProposals);
  return proposal;
}

export async function approveAgentProposal(proposalId, adminUser, resolutionNotes = '') {
  if (!adminUser || adminUser.role !== 'admin') {
    return {
      success: false,
      code: 'UNAUTHORIZED_APPROVER',
      message: 'Access Denied: Only an authorized Administrator can approve agent proposals.'
    };
  }

  const proposal = agentProposals.find(p => p.id === proposalId);
  if (!proposal) {
    return {
      success: false,
      code: 'PROPOSAL_NOT_FOUND',
      message: `Agent proposal [${proposalId}] does not exist.`
    };
  }

  // Prevent self-approval (agent approving its own recommendation or creator approving own proposal)
  if (proposal.agentId === adminUser.id) {
    return {
      success: false,
      code: 'SELF_APPROVAL_DISALLOWED',
      message: 'Governance Violation: Self-approval is strictly disallowed. Reviewer must be an independent administrator.'
    };
  }

  // Prevent duplicate execution / already resolved
  if (proposal.status !== 'pending') {
    return {
      success: false,
      code: 'PROPOSAL_ALREADY_RESOLVED',
      message: `Proposal [${proposalId}] is already ${proposal.status} and cannot be processed again.`
    };
  }

  // Validate target affiliate exists
  const affiliate = getAffiliateById(proposal.targetAffiliateId);
  if (!affiliate) {
    return {
      success: false,
      code: 'AFFILIATE_NOT_FOUND',
      message: `Target affiliate [${proposal.targetAffiliateId}] no longer exists.`
    };
  }

  // Validate commission rate safe range (1.0% to 50.0%)
  const rate = Number(proposal.proposedRate);
  if (typeof proposal.proposedRate !== 'number' || isNaN(rate) || rate < 1.0 || rate > 50.0) {
    return {
      success: false,
      code: 'INVALID_COMMISSION_RATE',
      message: `Safety Boundary Exceeded: Proposed commission rate [${proposal.proposedRate}%] is outside the permitted safe boundary (1.0% to 50.0%).`
    };
  }

  // Validate justification reason
  if (!proposal.reason || typeof proposal.reason !== 'string' || proposal.reason.trim().length === 0) {
    return {
      success: false,
      code: 'INVALID_REASON',
      message: 'Governance Requirement: A valid justification reason is required for proposal approval.'
    };
  }

  // 1. Apply the commission adjustment to the affiliate record
  const updatedAffiliate = await updateAffiliate(proposal.targetAffiliateId, {
    commissionRate: rate
  });

  // 2. Mark proposal as approved
  proposal.status = 'approved';
  proposal.resolvedAt = new Date().toISOString();
  proposal.resolvedBy = adminUser.id;
  proposal.resolutionNotes = resolutionNotes || 'Approved by administrator via Human-in-the-Loop review.';

  await writeJson('agent_proposals.json', agentProposals);

  // 3. Append to separate agent audit log
  await logAgentAudit({
    agentId: proposal.agentId,
    actionName: proposal.actionName,
    policyEvaluated: 'HUMAN_IN_THE_LOOP_APPROVAL',
    outcome: 'APPROVED_BY_ADMIN',
    details: `Admin ${adminUser.id} approved commission adjustment for ${affiliate.name} from ${proposal.currentRate}% to ${rate}%.`,
    actorId: adminUser.id,
    reviewerId: adminUser.id
  });

  return {
    success: true,
    proposal,
    updatedAffiliate
  };
}

export async function rejectAgentProposal(proposalId, adminUser, reason = '') {
  if (!adminUser || adminUser.role !== 'admin') {
    return {
      success: false,
      code: 'UNAUTHORIZED_APPROVER',
      message: 'Access Denied: Only an authorized Administrator can reject agent proposals.'
    };
  }

  const proposal = agentProposals.find(p => p.id === proposalId);
  if (!proposal) {
    return {
      success: false,
      code: 'PROPOSAL_NOT_FOUND',
      message: `Agent proposal [${proposalId}] does not exist.`
    };
  }

  if (proposal.status !== 'pending') {
    return {
      success: false,
      code: 'PROPOSAL_ALREADY_RESOLVED',
      message: `Proposal [${proposalId}] is already ${proposal.status} and cannot be rejected again.`
    };
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return {
      success: false,
      code: 'INVALID_REASON',
      message: 'Governance Requirement: A rejection reason must be provided.'
    };
  }

  proposal.status = 'rejected';
  proposal.resolvedAt = new Date().toISOString();
  proposal.resolvedBy = adminUser.id;
  proposal.resolutionNotes = reason;

  await writeJson('agent_proposals.json', agentProposals);

  await logAgentAudit({
    agentId: proposal.agentId,
    actionName: proposal.actionName,
    policyEvaluated: 'HUMAN_IN_THE_LOOP_APPROVAL',
    outcome: 'REJECTED_BY_ADMIN',
    details: `Admin ${adminUser.id} rejected proposal [${proposalId}]: ${reason}`,
    actorId: adminUser.id,
    reviewerId: adminUser.id
  });

  return {
    success: true,
    proposal
  };
}

export async function logAgentAudit(entry) {
  const auditItem = {
    id: `gaudit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };

  agentAuditLogs.unshift(auditItem); // Most recent first
  if (agentAuditLogs.length > 150) {
    agentAuditLogs = agentAuditLogs.slice(0, 150);
  }

  await writeJson('agent_audit.json', agentAuditLogs);
  return auditItem;
}

/**
 * Agent Kill Switch & Runtime Containment Mutators (Module 3)
 */

/**
 * Toggles the emergency Kill Switch for an agent runtime.
 * Requires an authorized admin and a mandatory justification reason.
 */
export async function setKillSwitch(agentId = 'usr_agent_spark', engage, adminUser, reason = '') {
  if (!adminUser || adminUser.role !== 'admin') {
    return {
      success: false,
      code: 'UNAUTHORIZED_ADMIN',
      message: 'Access Denied: Only an authorized Administrator can manage the Agent Kill Switch.'
    };
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return {
      success: false,
      code: 'INVALID_REASON',
      message: 'Containment Safety Requirement: A valid administrative reason must be provided.'
    };
  }

  if (!containmentState[agentId]) {
    containmentState[agentId] = JSON.parse(JSON.stringify(CANONICAL_CONTAINMENT_STATE.usr_agent_spark));
  }

  const state = containmentState[agentId];
  const previousMode = state.containmentMode;

  if (engage && state.killSwitchEngaged && state.containmentMode === 'TERMINATED') {
    return {
      success: false,
      code: 'ALREADY_ENGAGED',
      message: `Kill Switch is already ENGAGED for agent [${agentId}].`
    };
  }

  if (!engage && !state.killSwitchEngaged && state.containmentMode === 'NORMAL') {
    return {
      success: false,
      code: 'ALREADY_DISENGAGED',
      message: `Kill Switch is already DISENGAGED (NORMAL operational mode) for agent [${agentId}].`
    };
  }

  const newMode = engage ? 'TERMINATED' : 'NORMAL';
  state.killSwitchEngaged = engage;
  state.containmentMode = newMode;
  if (!engage) {
    state.circuitBreaker.isTripped = false;
    state.circuitBreaker.currentViolations = 0;
  }

  state.lastTransition = {
    timestamp: new Date().toISOString(),
    previousMode,
    newMode,
    triggeredBy: adminUser.id,
    reason: reason.trim()
  };

  await writeJson('containment_state.json', containmentState);

  const eventType = engage ? 'KILL_SWITCH_ENGAGED' : 'KILL_SWITCH_DISENGAGED';
  await logContainmentAudit({
    agentId,
    eventType,
    previousMode,
    newMode,
    triggeredBy: adminUser.id,
    reason: reason.trim(),
    details: engage
      ? `Emergency Kill Switch engaged by Admin ${adminUser.id}. Agent runtime terminated.`
      : `Kill Switch disengaged by Admin ${adminUser.id}. Agent runtime restored to NORMAL.`
  });

  return {
    success: true,
    containment: state
  };
}

/**
 * Changes the containment mode (NORMAL, QUARANTINE, TERMINATED).
 */
export async function setContainmentMode(agentId = 'usr_agent_spark', mode, adminUser, reason = '') {
  if (!adminUser || adminUser.role !== 'admin') {
    return {
      success: false,
      code: 'UNAUTHORIZED_ADMIN',
      message: 'Access Denied: Only an authorized Administrator can change Agent Containment modes.'
    };
  }

  const validModes = ['NORMAL', 'QUARANTINE', 'TERMINATED'];
  if (!validModes.includes(mode)) {
    return {
      success: false,
      code: 'INVALID_CONTAINMENT_MODE',
      message: `Invalid mode [${mode}]. Permitted modes: ${validModes.join(', ')}.`
    };
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return {
      success: false,
      code: 'INVALID_REASON',
      message: 'Containment Safety Requirement: A valid administrative reason must be provided.'
    };
  }

  if (!containmentState[agentId]) {
    containmentState[agentId] = JSON.parse(JSON.stringify(CANONICAL_CONTAINMENT_STATE.usr_agent_spark));
  }

  const state = containmentState[agentId];
  if (state.containmentMode === mode) {
    return {
      success: false,
      code: 'ALREADY_IN_MODE',
      message: `Agent [${agentId}] is already operating in [${mode}] mode.`
    };
  }

  const previousMode = state.containmentMode;
  state.containmentMode = mode;
  state.killSwitchEngaged = (mode === 'TERMINATED');
  if (mode === 'NORMAL') {
    state.circuitBreaker.isTripped = false;
    state.circuitBreaker.currentViolations = 0;
  }

  state.lastTransition = {
    timestamp: new Date().toISOString(),
    previousMode,
    newMode: mode,
    triggeredBy: adminUser.id,
    reason: reason.trim()
  };

  await writeJson('containment_state.json', containmentState);

  await logContainmentAudit({
    agentId,
    eventType: 'MODE_TRANSITION',
    previousMode,
    newMode: mode,
    triggeredBy: adminUser.id,
    reason: reason.trim(),
    details: `Containment mode transitioned from ${previousMode} to ${mode} by Admin ${adminUser.id}.`
  });

  return {
    success: true,
    containment: state
  };
}

/**
 * Records an agent policy breach and auto-trips the safety circuit breaker if threshold is reached.
 */
export async function recordAgentViolation(agentId = 'usr_agent_spark') {
  if (!containmentState[agentId]) {
    containmentState[agentId] = JSON.parse(JSON.stringify(CANONICAL_CONTAINMENT_STATE.usr_agent_spark));
  }

  const state = containmentState[agentId];
  state.circuitBreaker.currentViolations += 1;

  let autoTripped = false;
  if (
    state.circuitBreaker.enabled &&
    state.circuitBreaker.currentViolations >= state.circuitBreaker.tripThreshold &&
    !state.circuitBreaker.isTripped &&
    state.containmentMode === 'NORMAL'
  ) {
    autoTripped = true;
    const previousMode = state.containmentMode;
    state.circuitBreaker.isTripped = true;
    state.containmentMode = 'QUARANTINE'; // Degrade to quarantine upon threshold breach
    state.lastTransition = {
      timestamp: new Date().toISOString(),
      previousMode,
      newMode: 'QUARANTINE',
      triggeredBy: 'AUTO_CIRCUIT_BREAKER',
      reason: `Automated Trip: Agent reached violation threshold (${state.circuitBreaker.currentViolations}/${state.circuitBreaker.tripThreshold}).`
    };

    await logContainmentAudit({
      agentId,
      eventType: 'CIRCUIT_BREAKER_TRIPPED',
      previousMode,
      newMode: 'QUARANTINE',
      triggeredBy: 'AUTO_CIRCUIT_BREAKER',
      reason: 'Repetitive policy violations exceeded safety threshold',
      details: `Circuit breaker automatically engaged. Agent shifted from NORMAL to QUARANTINE after ${state.circuitBreaker.currentViolations} prohibited attempts.`
    });
  }

  await writeJson('containment_state.json', containmentState);

  return {
    violations: state.circuitBreaker.currentViolations,
    threshold: state.circuitBreaker.tripThreshold,
    tripped: autoTripped || state.circuitBreaker.isTripped,
    containmentMode: state.containmentMode
  };
}

/**
 * Resets circuit breaker violation counters and restores agent to NORMAL.
 */
export async function resetCircuitBreaker(agentId = 'usr_agent_spark', adminUser, reason = '') {
  if (!adminUser || adminUser.role !== 'admin') {
    return {
      success: false,
      code: 'UNAUTHORIZED_ADMIN',
      message: 'Access Denied: Only an authorized Administrator can reset the Safety Circuit Breaker.'
    };
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return {
      success: false,
      code: 'INVALID_REASON',
      message: 'Containment Safety Requirement: A valid administrative reason must be provided.'
    };
  }

  if (!containmentState[agentId]) {
    containmentState[agentId] = JSON.parse(JSON.stringify(CANONICAL_CONTAINMENT_STATE.usr_agent_spark));
  }

  const state = containmentState[agentId];
  const previousMode = state.containmentMode;

  state.circuitBreaker.currentViolations = 0;
  state.circuitBreaker.isTripped = false;
  state.containmentMode = 'NORMAL';
  state.killSwitchEngaged = false;

  state.lastTransition = {
    timestamp: new Date().toISOString(),
    previousMode,
    newMode: 'NORMAL',
    triggeredBy: adminUser.id,
    reason: reason.trim()
  };

  await writeJson('containment_state.json', containmentState);

  await logContainmentAudit({
    agentId,
    eventType: 'CIRCUIT_BREAKER_RESET',
    previousMode,
    newMode: 'NORMAL',
    triggeredBy: adminUser.id,
    reason: reason.trim(),
    details: `Circuit breaker counters reset by Admin ${adminUser.id}. Agent restored to NORMAL operation.`
  });

  return {
    success: true,
    containment: state
  };
}

/**
 * Protected Append-Only Containment Audit Logger
 */
export async function logContainmentAudit(entry) {
  const auditItem = {
    id: `caudit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };

  containmentAuditLogs.unshift(auditItem); // Most recent first
  if (containmentAuditLogs.length > 150) {
    containmentAuditLogs = containmentAuditLogs.slice(0, 150);
  }

  await writeJson('containment_audit.json', containmentAuditLogs);
  return auditItem;
}
