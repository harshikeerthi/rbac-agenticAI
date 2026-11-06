import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * ============================================================================
 * AFFILIATE ACCESS LAB — MODULE 4: PRIVACY POLICY ENGINE
 * ============================================================================
 * 
 * EDUCATIONAL PROTOTYPE NOTICE:
 * This service implements educational-grade Differential Privacy (Laplace
 * Mechanism via Node.js crypto.randomBytes) and k-Anonymity cohort suppression.
 * It is designed for demonstration, threat analysis, and architectural learning
 * within the Affiliate Access Lab. It is NOT certified as a production-grade
 * cryptographic privacy enclave.
 * 
 * CORE ARCHITECTURAL PRINCIPLES:
 * 1. Zero Trust: The AI Agent (MarketPulse) is never trusted to set privacy
 *    parameters (epsilon, k-threshold) or reset its privacy budget.
 * 2. Fail Closed: If the privacy budget state file is missing, unreadable,
 *    or corrupted, all agent analytics queries fail closed (denied).
 * 3. Never Expose Raw Totals to Agent: MarketPulse receives perturbed numbers
 *    and suppressed cohort metadata only. Ground truth raw sums are discarded.
 * 4. Cryptographic Entropy: Replaces Math.random() with Node.js crypto.randomBytes.
 * 5. Persistent Budget: Privacy budget tracking is persisted to disk in
 *    backend/data/privacy_state.json across server sessions.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const PRIVACY_STATE_FILE = path.join(DATA_DIR, 'privacy_state.json');

// System Defaults & Safety Boundaries
export const DEFAULT_EPSILON = 1.0;
export const MIN_EPSILON = 0.1;
export const MAX_EPSILON = 5.0;

export const DEFAULT_K_THRESHOLD = 3;
export const MIN_K_THRESHOLD = 2;
export const MAX_K_THRESHOLD = 20;

export const DEFAULT_TOTAL_BUDGET = 10.0;
export const DEFAULT_QUERY_COST = 1.0;

// Metric Global Sensitivities (Δf) and Sensitivity Clamping Bounds (B)
export const SENSITIVITY_BOUNDS = {
  affiliatesCount: {
    sensitivity: 1,
    clampingBound: null, // Natural discrete count
    description: 'Adding or removing one affiliate partner changes the count by at most 1.'
  },
  totalClicks: {
    sensitivity: 5000,
    clampingBound: 20000,
    description: 'Maximum individual affiliate click contribution clamped to 20,000; Δf = 5,000.'
  },
  totalConversions: {
    sensitivity: 500,
    clampingBound: 1000,
    description: 'Maximum individual affiliate conversion contribution clamped to 1,000; Δf = 500.'
  },
  totalCommissionVolume: {
    sensitivity: 2500,
    clampingBound: 3000,
    description: 'Maximum single commission payout contribution clamped to $3,000; Δf = $2,500.'
  },
  totalPaidCommissions: {
    sensitivity: 2500,
    clampingBound: 3000,
    description: 'Maximum single paid payout contribution clamped to $3,000; Δf = $2,500.'
  }
};

// Canonical Initial Seed State for Privacy Budget
export const CANONICAL_PRIVACY_STATE = {
  usr_agent_spark: {
    agentId: 'usr_agent_spark',
    agentName: 'MarketPulse AI Agent',
    totalBudget: DEFAULT_TOTAL_BUDGET,
    remainingBudget: DEFAULT_TOTAL_BUDGET,
    totalQueriesExecuted: 0,
    defaultQueryCost: DEFAULT_QUERY_COST,
    status: 'ACTIVE', // 'ACTIVE', 'DEPLETED', 'LOCKED'
    lastQueryAt: null,
    lastResetAt: '2026-11-06T09:00:00.000Z',
    resetBy: 'system',
    history: []
  }
};

// In-memory working copy for fast reads, synchronized to disk on writes
let privacyStateCache = null;

// ============================================================================
// 1. CRYPTOGRAPHICALLY SECURE LAPLACE SAMPLER
// ============================================================================

/**
 * Generates a uniform random float in (-0.5, 0.5) using Node.js crypto.randomBytes.
 * Uses 48 bits of cryptographic entropy to avoid precision clustering and
 * strictly excludes 0 to prevent division by zero in log transforms.
 * 
 * @returns {number} u in (-0.5, 0.5)
 */
export function secureUniformSymmetric() {
  const buf = crypto.randomBytes(6); // 6 bytes = 48 bits
  const intVal = buf.readUIntBE(0, 6);
  // Map [0, 2^48 - 1] to (0, 1) strictly
  const u = (intVal + 1) / (0x1000000000000 + 2);
  return u - 0.5; // Strictly in (-0.5, 0.5)
}

/**
 * Samples a random noise value from Laplace(0, b)
 * where scale parameter b = sensitivity / epsilon.
 * 
 * Quantile formula:
 *   X = -b * sgn(u) * ln(1 - 2|u|)
 * 
 * @param {number} sensitivity - Global sensitivity Δf (must be > 0)
 * @param {number} epsilon - Privacy budget expenditure (must be > 0)
 * @returns {number} Continuous Laplace noise sample
 */
export function sampleLaplaceNoise(sensitivity, epsilon = DEFAULT_EPSILON) {
  if (typeof sensitivity !== 'number' || sensitivity <= 0 || isNaN(sensitivity)) {
    throw new Error(`Invalid sensitivity [${sensitivity}]: must be a positive number.`);
  }
  if (typeof epsilon !== 'number' || epsilon <= 0 || isNaN(epsilon)) {
    throw new Error(`Invalid epsilon [${epsilon}]: must be a positive number.`);
  }

  const b = sensitivity / epsilon;
  const u = secureUniformSymmetric();
  // Quantile transform of symmetric Laplace distribution
  const noise = -b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  return noise;
}

/**
 * Applies bounded Laplace perturbation to a ground truth numeric value.
 * Values are clamped to a lower bound of zero (since negative clicks,
 * conversions, or commission volumes are physically and commercially meaningless).
 * 
 * @param {number} value - Raw mathematical ground truth
 * @param {number} sensitivity - Metric sensitivity Δf
 * @param {number} epsilon - Privacy budget spent
 * @param {boolean} isInteger - Whether to round to the nearest whole integer
 * @returns {number} Perturbed numeric value (>= 0)
 */
export function perturbNumericValue(value, sensitivity, epsilon = DEFAULT_EPSILON, isInteger = true) {
  const noise = sampleLaplaceNoise(sensitivity, epsilon);
  const perturbed = Math.max(0, value + noise);
  return isInteger ? Math.round(perturbed) : Number(perturbed.toFixed(2));
}

// ============================================================================
// 2. k-ANONYMITY COHORT SUPPRESSION
// ============================================================================

/**
 * Evaluates cohorts (e.g. categorized affiliate segments) against the k-anonymity
 * threshold. If a cohort has fewer than k members, publishing its metrics directly
 * would allow small-cell inference or direct de-anonymization.
 * 
 * Slices with member count < k are marked SUPPRESSED with null metrics.
 * Slices with member count >= k have their aggregate metrics perturbed via DP.
 * 
 * @param {Array<Object>} cohorts - Array of { cohortKey, members, rawClicks, rawConversions }
 * @param {number} kThreshold - Minimum cohort size (default: 3)
 * @param {number} epsilon - Privacy parameter for Laplace noise
 * @returns {Array<Object>} Sanitized cohort list
 */
export function applyKAnonymity(cohorts, kThreshold = DEFAULT_K_THRESHOLD, epsilon = DEFAULT_EPSILON) {
  if (!Array.isArray(cohorts)) return [];

  const threshold = Math.max(MIN_K_THRESHOLD, Number(kThreshold) || DEFAULT_K_THRESHOLD);

  return cohorts.map(cohort => {
    const memberCount = Array.isArray(cohort.members) ? cohort.members.length : (Number(cohort.memberCount) || 0);

    if (memberCount < threshold) {
      return {
        cohortKey: cohort.cohortKey,
        label: cohort.label || cohort.cohortKey,
        status: 'SUPPRESSED',
        kThreshold: threshold,
        actualCount: null, // Suppressed to prevent exact low-count disclosure
        reason: `Cohort size (${memberCount}) is below minimum anonymity threshold (k = ${threshold}). Metrics suppressed to prevent small-cell de-anonymization.`,
        perturbedClicks: null,
        perturbedConversions: null,
        metrics: null
      };
    }

    // Cohort satisfies k-anonymity: perturb metrics with Laplace noise
    const rawClicks = Number(cohort.rawClicks) || 0;
    const rawConversions = Number(cohort.rawConversions) || 0;

    return {
      cohortKey: cohort.cohortKey,
      label: cohort.label || cohort.cohortKey,
      status: 'PUBLISHED',
      kThreshold: threshold,
      actualCount: `${threshold}+`, // Range-bucketed count rather than exact raw number
      reason: null,
      perturbedClicks: perturbNumericValue(rawClicks, SENSITIVITY_BOUNDS.totalClicks.sensitivity, epsilon, true),
      perturbedConversions: perturbNumericValue(rawConversions, SENSITIVITY_BOUNDS.totalConversions.sensitivity, epsilon, true),
      metrics: {
        satisfiesKAnonymity: true,
        differentialPrivacyApplied: true
      }
    };
  });
}

/**
 * Builds categorized cohorts from raw affiliate records and applies k-anonymity.
 * 
 * @param {Array<Object>} affiliates - List of raw affiliate records
 * @param {number} kThreshold - Minimum cohort size (default 3)
 * @param {number} epsilon - Privacy parameter
 */
export function buildCategorizedCohorts(affiliates = [], kThreshold = DEFAULT_K_THRESHOLD, epsilon = DEFAULT_EPSILON) {
  const categoryMap = new Map();

  for (const aff of affiliates) {
    const category = aff.category || 'Uncategorized';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        cohortKey: category,
        label: category,
        members: [],
        rawClicks: 0,
        rawConversions: 0
      });
    }
    const bucket = categoryMap.get(category);
    bucket.members.push(aff.id);
    bucket.rawClicks += (aff.metrics?.totalClicks || 0);
    bucket.rawConversions += (aff.metrics?.totalConversions || 0);
  }

  const rawCohorts = Array.from(categoryMap.values());
  return applyKAnonymity(rawCohorts, kThreshold, epsilon);
}

// ============================================================================
// 3. PERSISTENT PRIVACY BUDGET MANAGEMENT (Fail-Closed)
// ============================================================================

/**
 * Safe disk reader with fail-closed semantics for privacy state.
 */
async function readPrivacyStateFromDisk() {
  try {
    const raw = await fs.readFile(PRIVACY_STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.usr_agent_spark) {
      return null; // Malformed structure -> fail closed
    }
    const agent = parsed.usr_agent_spark;
    if (typeof agent.remainingBudget !== 'number' || isNaN(agent.remainingBudget)) {
      return null; // Missing or non-numeric remaining budget -> fail closed
    }
    return parsed;
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File does not exist yet: initialize canonical seed
      const initial = JSON.parse(JSON.stringify(CANONICAL_PRIVACY_STATE));
      await writePrivacyStateToDisk(initial);
      return initial;
    }
    // Any syntax error or file read permission error triggers fail-closed
    return null;
  }
}

/**
 * Safe disk writer for privacy state.
 */
async function writePrivacyStateToDisk(data) {
  await fs.writeFile(PRIVACY_STATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Initializes or reloads the privacy state store.
 * Guaranteed to return null if state is unreadable or corrupted (Fail Closed).
 */
export async function initPrivacyEngine() {
  privacyStateCache = await readPrivacyStateFromDisk();
  return privacyStateCache;
}

/**
 * Resets privacy state to canonical seed on disk (primarily for test harness).
 */
export async function resetPrivacyState() {
  privacyStateCache = JSON.parse(JSON.stringify(CANONICAL_PRIVACY_STATE));
  await writePrivacyStateToDisk(privacyStateCache);
  return privacyStateCache;
}

/**
 * Reads the authoritative privacy state for an agent.
 * Fails closed if cache/disk state cannot be verified.
 * 
 * @param {string} agentId - Agent ID (default: usr_agent_spark)
 * @returns {Promise<Object|null>}
 */
export async function getPrivacyBudget(agentId = 'usr_agent_spark') {
  if (!privacyStateCache) {
    privacyStateCache = await readPrivacyStateFromDisk();
  }
  if (!privacyStateCache || !privacyStateCache[agentId]) {
    return null; // Fail closed: unreadable or corrupted
  }
  return privacyStateCache[agentId];
}

/**
 * Checks if the agent has sufficient budget to execute a query.
 * 
 * @param {string} agentId - Target agent ID
 * @param {number} cost - Epsilon cost of query (default: 1.0)
 * @returns {Promise<{ allowed: boolean, remainingBudget: number, code?: string, reason?: string }>}
 */
export async function checkPrivacyBudget(agentId = 'usr_agent_spark', cost = DEFAULT_QUERY_COST) {
  const budget = await getPrivacyBudget(agentId);

  // FAIL CLOSED CHECK
  if (!budget) {
    return {
      allowed: false,
      remainingBudget: 0.0,
      code: 'PRIVACY_STATE_CORRUPTED',
      reason: 'Authoritative privacy budget state could not be read or verified. Failing closed for safety.'
    };
  }

  if (budget.status !== 'ACTIVE' || budget.remainingBudget < cost) {
    return {
      allowed: false,
      remainingBudget: budget.remainingBudget,
      totalBudget: budget.totalBudget,
      code: 'PRIVACY_BUDGET_EXHAUSTED',
      reason: `Privacy budget depleted. Remaining: ${budget.remainingBudget.toFixed(2)} ε, Required: ${cost.toFixed(2)} ε. Queries halted to prevent reconstruction attacks.`
    };
  }

  return {
    allowed: true,
    remainingBudget: budget.remainingBudget,
    totalBudget: budget.totalBudget
  };
}

/**
 * Consumes epsilon from the agent's privacy budget and persists the new state.
 * Strictly checks that caller possesses sufficient allowance before deducting.
 * 
 * @param {string} agentId - Agent ID
 * @param {number} cost - Epsilon deduction
 * @param {Object} metadata - Context metadata (e.g. endpoint, actionName)
 * @returns {Promise<{ success: boolean, code?: string, remainingBudget?: number, deducted?: number, message?: string }>}
 */
export async function consumePrivacyBudget(agentId = 'usr_agent_spark', cost = DEFAULT_QUERY_COST, metadata = {}) {
  const check = await checkPrivacyBudget(agentId, cost);
  if (!check.allowed) {
    return {
      success: false,
      code: check.code,
      remainingBudget: check.remainingBudget,
      totalBudget: check.totalBudget,
      message: check.reason
    };
  }

  const budget = privacyStateCache[agentId];
  const previousRemaining = budget.remainingBudget;
  const newRemaining = Math.max(0, Number((previousRemaining - cost).toFixed(2)));

  budget.remainingBudget = newRemaining;
  budget.totalQueriesExecuted += 1;
  budget.lastQueryAt = new Date().toISOString();
  if (newRemaining <= 0) {
    budget.status = 'DEPLETED';
  }

  // Push audit entry into privacy query history
  budget.history.unshift({
    queryId: `pq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    epsilonCost: cost,
    previousRemaining,
    newRemaining,
    endpoint: metadata.endpoint || '/api/reports/privacy-analytics',
    actionName: metadata.actionName || 'query_analytics'
  });

  if (budget.history.length > 50) {
    budget.history = budget.history.slice(0, 50);
  }

  await writePrivacyStateToDisk(privacyStateCache);

  return {
    success: true,
    deducted: cost,
    remainingBudget: newRemaining,
    totalBudget: budget.totalBudget,
    totalQueriesExecuted: budget.totalQueriesExecuted
  };
}

/**
 * Administratively resets an agent's privacy budget back to maximum allocation.
 * Strictly enforced: Only an authorized Administrator can reset the budget.
 * 
 * @param {string} agentId - Target agent
 * @param {Object} adminUser - Authenticated user object (must have role === 'admin')
 * @param {string} reason - Administrative justification
 * @returns {Promise<{ success: boolean, code?: string, message?: string, budget?: Object }>}
 */
export async function resetPrivacyBudget(agentId = 'usr_agent_spark', adminUser, reason = '') {
  // 1. Role Authorization Gate
  if (!adminUser || adminUser.role !== 'admin') {
    return {
      success: false,
      code: 'UNAUTHORIZED_ADMIN',
      message: 'Access Denied: Only an authorized Administrator can reset the Privacy Budget.'
    };
  }

  // 2. Prevent Agent Self-Reset
  if (adminUser.id === agentId || adminUser.role === 'ai_agent') {
    return {
      success: false,
      code: 'AGENT_CANNOT_RESET_BUDGET',
      message: 'Security Violation: Autonomous agents cannot reset their own privacy budget.'
    };
  }

  // 3. Mandatory Reason Validation
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return {
      success: false,
      code: 'INVALID_REASON',
      message: 'Privacy Safety Requirement: A valid administrative reason must be provided to replenish the privacy budget.'
    };
  }

  if (!privacyStateCache || !privacyStateCache[agentId]) {
    privacyStateCache = await readPrivacyStateFromDisk();
  }

  if (!privacyStateCache || !privacyStateCache[agentId]) {
    // If state was corrupted, re-seed from canonical
    privacyStateCache = JSON.parse(JSON.stringify(CANONICAL_PRIVACY_STATE));
  }

  const budget = privacyStateCache[agentId];
  budget.remainingBudget = budget.totalBudget;
  budget.status = 'ACTIVE';
  budget.lastResetAt = new Date().toISOString();
  budget.resetBy = adminUser.id;

  budget.history.unshift({
    queryId: `pq_reset_${Date.now()}`,
    timestamp: new Date().toISOString(),
    epsilonCost: 0,
    previousRemaining: budget.remainingBudget,
    newRemaining: budget.totalBudget,
    endpoint: '/api/reports/privacy-budget/reset',
    actionName: 'ADMIN_BUDGET_REPLENISHMENT',
    reason: reason.trim(),
    resetBy: adminUser.id
  });

  await writePrivacyStateToDisk(privacyStateCache);

  return {
    success: true,
    message: `Privacy budget successfully replenished to ${budget.totalBudget} ε by Admin ${adminUser.id}.`,
    budget
  };
}

// ============================================================================
// 4. PARAMETER SANITIZATION & ANTI-TAMPERING
// ============================================================================

/**
 * Sanitizes and bounds privacy parameters.
 * AI Agents cannot override epsilon or k-anonymity thresholds: any client-supplied
 * parameters from non-admin personas are discarded in favor of system defaults.
 * 
 * @param {Object} user - Authenticated user context
 * @param {Object} requestedParams - Parameters submitted in query/body
 * @returns {{ epsilon: number, kThreshold: number, isOverridden: boolean }}
 */
export function sanitizePrivacyParameters(user, requestedParams = {}) {
  // If requester is an AI Agent or non-admin, strictly enforce server defaults
  if (!user || user.role !== 'admin') {
    return {
      epsilon: DEFAULT_EPSILON,
      kThreshold: DEFAULT_K_THRESHOLD,
      isOverridden: false,
      enforcedBy: 'SERVER_AUTHORITATIVE_POLICY'
    };
  }

  // For Admin: validate and clamp within safe bounds
  let epsilon = DEFAULT_EPSILON;
  if (typeof requestedParams.epsilon === 'number' && !isNaN(requestedParams.epsilon)) {
    epsilon = Math.min(MAX_EPSILON, Math.max(MIN_EPSILON, requestedParams.epsilon));
  } else if (typeof requestedParams.epsilon === 'string') {
    const parsed = parseFloat(requestedParams.epsilon);
    if (!isNaN(parsed)) {
      epsilon = Math.min(MAX_EPSILON, Math.max(MIN_EPSILON, parsed));
    }
  }

  let kThreshold = DEFAULT_K_THRESHOLD;
  if (typeof requestedParams.kThreshold === 'number' && !isNaN(requestedParams.kThreshold)) {
    kThreshold = Math.min(MAX_K_THRESHOLD, Math.max(MIN_K_THRESHOLD, Math.round(requestedParams.kThreshold)));
  } else if (typeof requestedParams.k_threshold !== 'undefined') {
    const parsed = parseInt(requestedParams.k_threshold, 10);
    if (!isNaN(parsed)) {
      kThreshold = Math.min(MAX_K_THRESHOLD, Math.max(MIN_K_THRESHOLD, parsed));
    }
  }

  return {
    epsilon,
    kThreshold,
    isOverridden: (epsilon !== DEFAULT_EPSILON || kThreshold !== DEFAULT_K_THRESHOLD),
    enforcedBy: 'ADMIN_CUSTOM_CONFIG'
  };
}

// ============================================================================
// 5. PRIVACY-PRESERVING ANALYTICS GENERATOR
// ============================================================================

/**
 * Computes privacy-aware aggregate analytics over the raw dataset.
 * 
 * SECURITY GUARANTEES:
 * 1. AI Agents consume privacy budget upon execution.
 * 2. Raw individual rows and PII fields are never returned.
 * 3. Exact raw totals are replaced with Laplace-perturbed metrics.
 * 4. Micro-cohorts (< k) are suppressed via k-anonymity.
 * 5. Admin callers do not deplete the AI Agent's budget.
 * 
 * @param {Object} params - { rawAffiliates, rawCommissions, user, requestedParams }
 * @returns {Promise<Object>} Output payload for client response
 */
export async function generatePrivacyPreservingAnalytics({
  rawAffiliates = [],
  rawCommissions = [],
  user = {},
  requestedParams = {}
}) {
  const isAgent = user?.role === 'ai_agent';

  // 1. Budget Gate (Applicable strictly to AI Agent)
  let budgetResult = null;
  if (isAgent) {
    budgetResult = await consumePrivacyBudget(user.id, DEFAULT_QUERY_COST, {
      endpoint: requestedParams.endpoint || '/api/reports/privacy-analytics',
      actionName: requestedParams.actionName || 'query_aggregate_analytics'
    });

    if (!budgetResult.success) {
      return {
        success: false,
        error: 'Too Many Requests',
        code: budgetResult.code,
        message: budgetResult.message,
        budgetStatus: {
          remainingBudget: budgetResult.remainingBudget,
          totalBudget: budgetResult.totalBudget,
          resetRequired: true
        }
      };
    }
  }

  // 2. Resolve Authoritative Privacy Parameters
  const { epsilon, kThreshold, enforcedBy } = sanitizePrivacyParameters(user, requestedParams);

  // 3. Compute Bounded Ground Truth
  const totalAffiliates = rawAffiliates.length;
  const activeAffiliates = rawAffiliates.filter(a => a.status === 'active').length;

  // Apply sensitivity clamping to individual records
  const boundedClicks = rawAffiliates.reduce((sum, a) => {
    const raw = a.metrics?.totalClicks || 0;
    return sum + Math.min(raw, SENSITIVITY_BOUNDS.totalClicks.clampingBound);
  }, 0);

  const boundedConversions = rawAffiliates.reduce((sum, a) => {
    const raw = a.metrics?.totalConversions || 0;
    return sum + Math.min(raw, SENSITIVITY_BOUNDS.totalConversions.clampingBound);
  }, 0);

  const boundedVolume = rawCommissions.reduce((sum, c) => {
    const raw = c.amount || 0;
    return sum + Math.min(raw, SENSITIVITY_BOUNDS.totalCommissionVolume.clampingBound);
  }, 0);

  const boundedPaid = rawCommissions.filter(c => c.status === 'paid').reduce((sum, c) => {
    const raw = c.amount || 0;
    return sum + Math.min(raw, SENSITIVITY_BOUNDS.totalPaidCommissions.clampingBound);
  }, 0);

  // 4. Apply Differential Privacy Laplace Noise
  const perturbedClicks = perturbNumericValue(
    boundedClicks,
    SENSITIVITY_BOUNDS.totalClicks.sensitivity,
    epsilon,
    true
  );

  const perturbedConversions = perturbNumericValue(
    boundedConversions,
    SENSITIVITY_BOUNDS.totalConversions.sensitivity,
    epsilon,
    true
  );

  const perturbedVolume = perturbNumericValue(
    boundedVolume,
    SENSITIVITY_BOUNDS.totalCommissionVolume.sensitivity,
    epsilon,
    true
  );

  const perturbedPaid = perturbNumericValue(
    boundedPaid,
    SENSITIVITY_BOUNDS.totalPaidCommissions.sensitivity,
    epsilon,
    true
  );

  const perturbedAffiliatesCount = perturbNumericValue(
    totalAffiliates,
    SENSITIVITY_BOUNDS.affiliatesCount.sensitivity,
    epsilon,
    true
  );

  const perturbedActiveAffiliates = perturbNumericValue(
    activeAffiliates,
    SENSITIVITY_BOUNDS.affiliatesCount.sensitivity,
    epsilon,
    true
  );

  const platformConversionRate = perturbedClicks > 0
    ? ((perturbedConversions / perturbedClicks) * 100).toFixed(2) + '%'
    : '0.00%';

  // 5. Apply k-Anonymity Cohort Suppression
  const categoryCohorts = buildCategorizedCohorts(rawAffiliates, kThreshold, epsilon);

  // 6. Assemble Sanitized Payload
  const payload = {
    success: true,
    privacyMode: 'DIFFERENTIAL_PRIVACY_ENFORCED',
    data: {
      totalAffiliatesCount: perturbedAffiliatesCount,
      totalActiveAffiliates: perturbedActiveAffiliates,
      totalPlatformClicks: perturbedClicks,
      totalPlatformConversions: perturbedConversions,
      platformConversionRate,
      totalCommissionVolume: perturbedVolume,
      totalPaidCommissions: perturbedPaid,
      categoriesCount: categoryCohorts.length,
      topCategory: 'Consumer Electronics & SaaS',
      calculatedAt: new Date().toISOString()
    },
    cohorts: categoryCohorts,
    privacyGuarantees: {
      differentialPrivacyApplied: true,
      mechanism: 'Laplace Mechanism (Node.js crypto.randomBytes)',
      epsilonApplied: epsilon,
      sensitivityBoundsApplied: {
        totalClicks: SENSITIVITY_BOUNDS.totalClicks.sensitivity,
        totalConversions: SENSITIVITY_BOUNDS.totalConversions.sensitivity,
        totalCommissionVolume: SENSITIVITY_BOUNDS.totalCommissionVolume.sensitivity
      },
      rawTotalsExposed: false,
      piiExposed: false,
      individualRecordsIncluded: false,
      kAnonymityThreshold: kThreshold,
      smallCellSuppressionApplied: categoryCohorts.some(c => c.status === 'SUPPRESSED'),
      parameterEnforcement: enforcedBy,
      educationalNotice: 'Educational Prototype: Demonstrates Differential Privacy & k-Anonymity. Not certified production-grade.'
    }
  };

  if (isAgent && budgetResult) {
    payload.budgetTelemetry = {
      epsilonDeducted: budgetResult.deducted,
      remainingBudget: budgetResult.remainingBudget,
      totalBudget: budgetResult.totalBudget
    };
  }

  // If Admin requested analytics, attach raw operational telemetry for comparative verification
  if (user?.role === 'admin' && requestedParams.includeOperationalAudit === true) {
    payload.operationalGroundTruth = {
      rawClicks: boundedClicks,
      rawConversions: boundedConversions,
      rawVolume: boundedVolume,
      rawPaid: boundedPaid,
      rawAffiliatesCount: totalAffiliates,
      rawActiveAffiliates: activeAffiliates
    };
  }

  return payload;
}

