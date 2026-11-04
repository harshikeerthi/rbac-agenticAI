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

// Canonical seed data for Agent Governance & Audit
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

// In-memory working copies for low-latency operations and test isolation
let roles = {};
let users = [];
let affiliates = [];
let commissions = [];
let activityLogs = [];
let agentPolicies = {};
let agentProposals = [];
let agentAuditLogs = [];

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

  await writeJson('affiliates.json', affiliates);
  await writeJson('commissions.json', commissions);
  await writeJson('activity_logs.json', activityLogs);
  await writeJson('agent_policies.json', agentPolicies);
  await writeJson('agent_proposals.json', agentProposals);
  await writeJson('agent_audit.json', agentAuditLogs);

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
 * Agent Governance Getters
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
 * Mutators with persistence to JSON files
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
 * Agent Governance Mutators & Revalidation
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

/**
 * Approves an agent proposal with full safety revalidations:
 * 1. Approver must be an authorized admin.
 * 2. Self-approval is strictly disallowed.
 * 3. Proposal must exist and be currently 'pending'.
 * 4. Target affiliate must exist.
 * 5. Proposed commission rate must be numeric and within safe range [1.0%, 50.0%].
 * 6. Valid reason must be present.
 */
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

/**
 * Rejects an agent proposal with validation
 */
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

/**
 * Protected Append-Only Agent Governance Audit Logger
 */
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
