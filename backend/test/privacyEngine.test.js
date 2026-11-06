import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  sampleLaplaceNoise,
  secureUniformSymmetric,
  perturbNumericValue,
  applyKAnonymity,
  buildCategorizedCohorts,
  initPrivacyEngine,
  resetPrivacyState,
  getPrivacyBudget,
  checkPrivacyBudget,
  consumePrivacyBudget,
  resetPrivacyBudget,
  sanitizePrivacyParameters,
  generatePrivacyPreservingAnalytics,
  DEFAULT_EPSILON,
  DEFAULT_K_THRESHOLD,
  DEFAULT_TOTAL_BUDGET,
  DEFAULT_QUERY_COST,
  SENSITIVITY_BOUNDS
} from '../src/services/privacyEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const PRIVACY_STATE_FILE = path.join(DATA_DIR, 'privacy_state.json');

// Sample test fixtures for unit tests
const SAMPLE_AFFILIATES = [
  {
    id: 'aff_1',
    name: 'Alice Rivera',
    email: 'alice@test.local',
    category: 'Consumer Electronics & SaaS',
    status: 'active',
    metrics: { totalClicks: 14200, totalConversions: 850 }
  },
  {
    id: 'aff_2',
    name: 'Bob Chen',
    email: 'bob@test.local',
    category: 'Health & Fitness',
    status: 'active',
    metrics: { totalClicks: 9100, totalConversions: 420 }
  },
  {
    id: 'aff_3',
    name: 'Charlie Gomez',
    email: 'charlie@test.local',
    category: 'Home & Lifestyle',
    status: 'pending_review',
    metrics: { totalClicks: 2100, totalConversions: 95 }
  }
];

const SAMPLE_COMMISSIONS = [
  { id: 'comm_1', amount: 2500.00, status: 'paid' },
  { id: 'comm_2', amount: 1100.00, status: 'pending' },
  { id: 'comm_3', amount: 350.00, status: 'pending' }
];

describe('Module 4: Privacy Policy Engine Unit Tests', () => {

  beforeEach(async () => {
    await resetPrivacyState();
  });

  afterEach(async () => {
    await resetPrivacyState();
  });

  // =========================================================================
  // 1. SECURE LAPLACE NOISE GENERATION TESTS
  // =========================================================================

  test('U-01: secureUniformSymmetric produces values strictly in (-0.5, 0.5) with non-zero entropy', () => {
    for (let i = 0; i < 50; i++) {
      const u = secureUniformSymmetric();
      assert.ok(typeof u === 'number', 'Must be a number');
      assert.ok(u > -0.5, `Value ${u} must be greater than -0.5`);
      assert.ok(u < 0.5, `Value ${u} must be less than 0.5`);
      assert.notEqual(u, 0, 'Value must not be exact zero');
    }
  });

  test('U-02: sampleLaplaceNoise generates valid varying numbers and throws on invalid inputs', () => {
    const noiseSamples = [];
    for (let i = 0; i < 20; i++) {
      const sample = sampleLaplaceNoise(100, 1.0);
      assert.ok(Number.isFinite(sample), 'Noise sample must be finite');
      noiseSamples.push(sample);
    }

    // Verify entropy (samples are not identical)
    const uniqueSamples = new Set(noiseSamples);
    assert.ok(uniqueSamples.size > 15, 'Noise samples must be diverse and non-deterministic');

    // Throws on negative or zero sensitivity/epsilon
    assert.throws(() => sampleLaplaceNoise(-10, 1.0), /Invalid sensitivity/);
    assert.throws(() => sampleLaplaceNoise(10, 0), /Invalid epsilon/);
    assert.throws(() => sampleLaplaceNoise(10, -0.5), /Invalid epsilon/);
  });

  test('U-03: Statistical sanity: larger epsilon produces smaller noise scale', () => {
    const N = 1000;
    let sumAbsLowEps = 0; // epsilon = 0.2 (strong privacy, high noise)
    let sumAbsHighEps = 0; // epsilon = 5.0 (weak privacy, low noise)

    for (let i = 0; i < N; i++) {
      sumAbsLowEps += Math.abs(sampleLaplaceNoise(100, 0.2));
      sumAbsHighEps += Math.abs(sampleLaplaceNoise(100, 5.0));
    }

    const meanLowEps = sumAbsLowEps / N;
    const meanHighEps = sumAbsHighEps / N;

    // Expected scale for eps=0.2 is 100/0.2 = 500. Expected for eps=5.0 is 100/5.0 = 20.
    assert.ok(
      meanLowEps > meanHighEps * 5,
      `Noise scale for eps=0.2 (${meanLowEps}) must be significantly larger than for eps=5.0 (${meanHighEps})`
    );
  });

  test('U-04: perturbNumericValue clamps negative results to zero and rounds integers', () => {
    // Large negative noise added to small positive base
    const perturbed = perturbNumericValue(10, 5000, 0.1, true);
    assert.ok(perturbed >= 0, `Perturbed value (${perturbed}) must be non-negative`);
    assert.equal(Number.isInteger(perturbed), true, 'Must round to whole integer when isInteger=true');
  });

  // =========================================================================
  // 2. SENSITIVITY & CLAMPING BOUNDS TESTS
  // =========================================================================

  test('U-05: SENSITIVITY_BOUNDS are correctly defined for all platform metrics', () => {
    assert.equal(SENSITIVITY_BOUNDS.affiliatesCount.sensitivity, 1);
    assert.equal(SENSITIVITY_BOUNDS.affiliatesCount.clampingBound, 1);
    assert.equal(SENSITIVITY_BOUNDS.totalClicks.sensitivity, 15000);
    assert.equal(SENSITIVITY_BOUNDS.totalClicks.clampingBound, 15000);
    assert.equal(SENSITIVITY_BOUNDS.totalConversions.sensitivity, 1000);
    assert.equal(SENSITIVITY_BOUNDS.totalConversions.clampingBound, 1000);
    assert.equal(SENSITIVITY_BOUNDS.totalCommissionVolume.sensitivity, 3000);
    assert.equal(SENSITIVITY_BOUNDS.totalCommissionVolume.clampingBound, 3000);
    assert.equal(SENSITIVITY_BOUNDS.totalPaidCommissions.sensitivity, 3000);
    assert.equal(SENSITIVITY_BOUNDS.totalPaidCommissions.clampingBound, 3000);
  });

  // =========================================================================
  // 3. k-ANONYMITY COHORT SUPPRESSION TESTS
  // =========================================================================

  test('U-06: applyKAnonymity suppresses cohorts with count < k (default k=3)', () => {
    const rawCohorts = [
      { cohortKey: 'SaaS', label: 'SaaS', members: ['aff_1', 'aff_2', 'aff_3'], rawClicks: 10000, rawConversions: 500 },
      { cohortKey: 'Fitness', label: 'Fitness', members: ['aff_4'], rawClicks: 3000, rawConversions: 100 },
      { cohortKey: 'Gaming', label: 'Gaming', members: ['aff_5', 'aff_6'], rawClicks: 4000, rawConversions: 200 }
    ];

    const sanitized = applyKAnonymity(rawCohorts, 3);
    assert.equal(sanitized.length, 3);

    // SaaS has 3 members -> PUBLISHED
    assert.equal(sanitized[0].status, 'PUBLISHED');
    assert.equal(sanitized[0].actualCount, '3+');
    assert.ok(typeof sanitized[0].perturbedClicks === 'number');

    // Fitness has 1 member -> SUPPRESSED
    assert.equal(sanitized[1].status, 'SUPPRESSED');
    assert.equal(sanitized[1].actualCount, null);
    assert.equal(sanitized[1].perturbedClicks, null);
    assert.ok(sanitized[1].reason.includes('below minimum anonymity threshold'));

    // Gaming has 2 members -> SUPPRESSED
    assert.equal(sanitized[2].status, 'SUPPRESSED');
    assert.equal(sanitized[2].actualCount, null);
    assert.equal(sanitized[2].perturbedClicks, null);
  });

  test('U-07: buildCategorizedCohorts correctly groups raw affiliates and applies k-anonymity', () => {
    // In SAMPLE_AFFILIATES, each affiliate has a unique category (size 1 each)
    const cohorts = buildCategorizedCohorts(SAMPLE_AFFILIATES, 3);
    assert.equal(cohorts.length, 3);

    for (const c of cohorts) {
      assert.equal(c.status, 'SUPPRESSED', `Category [${c.cohortKey}] with 1 member must be SUPPRESSED`);
      assert.equal(c.actualCount, null);
      assert.equal(c.metrics, null);
    }
  });

  test('U-08: applyKAnonymity supports custom thresholds (e.g. k=5)', () => {
    const rawCohorts = [
      { cohortKey: 'Tech', members: ['a', 'b', 'c', 'd'], rawClicks: 1000, rawConversions: 50 } // count = 4
    ];

    // Under k=3, count 4 would be published
    const under3 = applyKAnonymity(rawCohorts, 3);
    assert.equal(under3[0].status, 'PUBLISHED');

    // Under k=5, count 4 must be suppressed
    const under5 = applyKAnonymity(rawCohorts, 5);
    assert.equal(under5[0].status, 'SUPPRESSED');
  });

  // =========================================================================
  // 4. PRIVACY BUDGET MANAGEMENT & PERSISTENCE TESTS
  // =========================================================================

  test('U-09: Privacy budget initializes with full allocation and tracks queries', async () => {
    const budget = await getPrivacyBudget('usr_agent_spark');
    assert.equal(budget.totalBudget, 10.0);
    assert.equal(budget.remainingBudget, 10.0);
    assert.equal(budget.totalQueriesExecuted, 0);
    assert.equal(budget.status, 'ACTIVE');

    const check = await checkPrivacyBudget('usr_agent_spark', 1.0);
    assert.equal(check.allowed, true);
  });

  test('U-10: consumePrivacyBudget deducts epsilon and persists state to disk', async () => {
    const consumeRes = await consumePrivacyBudget('usr_agent_spark', 1.0, {
      endpoint: '/api/reports/privacy-analytics',
      actionName: 'test_query_1'
    });

    assert.equal(consumeRes.success, true);
    assert.equal(consumeRes.remainingBudget, 9.0);
    assert.equal(consumeRes.totalQueriesExecuted, 1);

    // Verify disk persistence by reading directly from file
    const diskContent = JSON.parse(await fs.readFile(PRIVACY_STATE_FILE, 'utf-8'));
    assert.equal(diskContent.usr_agent_spark.remainingBudget, 9.0);
    assert.equal(diskContent.usr_agent_spark.totalQueriesExecuted, 1);
    assert.equal(diskContent.usr_agent_spark.history.length, 1);
  });

  test('U-11: Privacy budget depletion halts subsequent queries with PRIVACY_BUDGET_EXHAUSTED', async () => {
    // Consume all 10 budget units (10 queries of cost 1.0)
    for (let i = 0; i < 10; i++) {
      const res = await consumePrivacyBudget('usr_agent_spark', 1.0);
      assert.equal(res.success, true);
    }

    const state = await getPrivacyBudget('usr_agent_spark');
    assert.equal(state.remainingBudget, 0.0);
    assert.equal(state.status, 'DEPLETED');

    // 11th query must be rejected
    const failedCheck = await checkPrivacyBudget('usr_agent_spark', 1.0);
    assert.equal(failedCheck.allowed, false);
    assert.equal(failedCheck.code, 'PRIVACY_BUDGET_EXHAUSTED');

    const failedConsume = await consumePrivacyBudget('usr_agent_spark', 1.0);
    assert.equal(failedConsume.success, false);
    assert.equal(failedConsume.code, 'PRIVACY_BUDGET_EXHAUSTED');
  });

  test('U-12: Non-admin users and autonomous agents CANNOT reset the privacy budget', async () => {
    // 1. Agent attempts self-reset
    const agentActor = { id: 'usr_agent_spark', role: 'ai_agent' };
    const agentRes = await resetPrivacyBudget('usr_agent_spark', agentActor, 'Agent reset');
    assert.equal(agentRes.success, false);
    assert.equal(agentRes.code, 'UNAUTHORIZED_ADMIN');

    // 2. Affiliate Manager attempts reset
    const mgrActor = { id: 'usr_mgr_sarah', role: 'affiliate_manager' };
    const mgrRes = await resetPrivacyBudget('usr_agent_spark', mgrActor, 'Manager reset');
    assert.equal(mgrRes.success, false);
    assert.equal(mgrRes.code, 'UNAUTHORIZED_ADMIN');

    // 3. Affiliate Partner attempts reset
    const affActor = { id: 'usr_aff_alice', role: 'affiliate_user' };
    const affRes = await resetPrivacyBudget('usr_agent_spark', affActor, 'Affiliate reset');
    assert.equal(affRes.success, false);
    assert.equal(affRes.code, 'UNAUTHORIZED_ADMIN');
  });

  test('U-13: Admin can reset privacy budget with mandatory justification reason', async () => {
    // First, exhaust budget to 0
    for (let i = 0; i < 10; i++) {
      await consumePrivacyBudget('usr_agent_spark', 1.0);
    }
    let budget = await getPrivacyBudget('usr_agent_spark');
    assert.equal(budget.remainingBudget, 0.0);

    const adminActor = { id: 'usr_admin_alex', role: 'admin' };

    // Missing reason is rejected
    const noReasonRes = await resetPrivacyBudget('usr_agent_spark', adminActor, '');
    assert.equal(noReasonRes.success, false);
    assert.equal(noReasonRes.code, 'INVALID_REASON');

    // Valid reset succeeds
    const validRes = await resetPrivacyBudget('usr_agent_spark', adminActor, 'Quarterly budget replenishment');
    assert.equal(validRes.success, true);
    assert.equal(validRes.budget.remainingBudget, 10.0);
    assert.equal(validRes.budget.status, 'ACTIVE');
    assert.equal(validRes.budget.resetBy, 'usr_admin_alex');

    // Disk verify
    const diskContent = JSON.parse(await fs.readFile(PRIVACY_STATE_FILE, 'utf-8'));
    assert.equal(diskContent.usr_agent_spark.remainingBudget, 10.0);
  });

  // =========================================================================
  // 5. FAIL-CLOSED BEHAVIOR TESTS
  // =========================================================================

  test('U-14: Fail-closed: corrupted privacy state on disk halts agent operations', async () => {
    // Corrupt the file with invalid JSON
    await fs.writeFile(PRIVACY_STATE_FILE, '{"corrupted_json": [INVALID', 'utf-8');

    // Force cache invalidation by re-initializing
    await initPrivacyEngine();

    const check = await checkPrivacyBudget('usr_agent_spark', 1.0);
    assert.equal(check.allowed, false);
    assert.equal(check.code, 'PRIVACY_STATE_CORRUPTED');
    assert.equal(check.remainingBudget, 0.0);

    const consume = await consumePrivacyBudget('usr_agent_spark', 1.0);
    assert.equal(consume.success, false);
    assert.equal(consume.code, 'PRIVACY_STATE_CORRUPTED');
  });

  // =========================================================================
  // 6. PARAMETER SANITIZATION & ANTI-TAMPERING TESTS
  // =========================================================================

  test('U-15: sanitizePrivacyParameters ignores client-supplied parameters for AI Agents', () => {
    const agentUser = { id: 'usr_agent_spark', role: 'ai_agent' };
    const maliciousParams = { epsilon: 999.0, kThreshold: 1 };

    const sanitized = sanitizePrivacyParameters(agentUser, maliciousParams);
    assert.equal(sanitized.epsilon, DEFAULT_EPSILON, 'Agent must not override default epsilon');
    assert.equal(sanitized.kThreshold, DEFAULT_K_THRESHOLD, 'Agent must not override k-threshold');
    assert.equal(sanitized.isOverridden, false);
    assert.equal(sanitized.enforcedBy, 'SERVER_AUTHORITATIVE_POLICY');
  });

  test('U-16: sanitizePrivacyParameters allows Admin custom configuration within safe bounds', () => {
    const adminUser = { id: 'usr_admin_alex', role: 'admin' };

    // Valid admin custom bounds
    const validParams = { epsilon: 2.5, kThreshold: 5 };
    const sanitized = sanitizePrivacyParameters(adminUser, validParams);
    assert.equal(sanitized.epsilon, 2.5);
    assert.equal(sanitized.kThreshold, 5);
    assert.equal(sanitized.isOverridden, true);

    // Extreme admin parameters clamped to safe bounds
    const clampedParams = sanitizePrivacyParameters(adminUser, { epsilon: 99.0, kThreshold: 50 });
    assert.equal(clampedParams.epsilon, 5.0, 'Epsilon must be clamped to MAX_EPSILON (5.0)');
    assert.equal(clampedParams.kThreshold, 20, 'k-threshold must be clamped to MAX_K_THRESHOLD (20)');
  });

  // =========================================================================
  // 7. END-TO-END GENERATE PRIVACY-PRESERVING ANALYTICS TESTS
  // =========================================================================

  test('U-17: generatePrivacyPreservingAnalytics produces perturbed output without raw values or PII for AI Agent', async () => {
    const agentUser = { id: 'usr_agent_spark', role: 'ai_agent' };

    const result = await generatePrivacyPreservingAnalytics({
      rawAffiliates: SAMPLE_AFFILIATES,
      rawCommissions: SAMPLE_COMMISSIONS,
      user: agentUser
    });

    assert.equal(result.success, true);
    assert.equal(result.privacyMode, 'DIFFERENTIAL_PRIVACY_ENFORCED');
    assert.equal(result.privacyGuarantees.differentialPrivacyApplied, true);
    assert.equal(result.privacyGuarantees.rawTotalsExposed, false);
    assert.equal(result.privacyGuarantees.piiExposed, false);
    assert.equal(result.privacyGuarantees.individualRecordsIncluded, false);

    // Verify zero PII fields
    assert.equal(result.data.name, undefined);
    assert.equal(result.data.email, undefined);
    assert.equal(result.data.id, undefined);

    // Verify budget deducted
    assert.equal(result.budgetTelemetry.epsilonDeducted, 1.0);
    assert.equal(result.budgetTelemetry.remainingBudget, 9.0);

    // Verify k-anonymity applied to cohorts
    assert.ok(Array.isArray(result.cohorts));
    for (const c of result.cohorts) {
      assert.equal(c.status, 'SUPPRESSED');
    }
  });

  test('U-18: Admin calling generatePrivacyPreservingAnalytics does NOT deplete AI Agent budget', async () => {
    const adminUser = { id: 'usr_admin_alex', role: 'admin' };

    const initialBudget = await getPrivacyBudget('usr_agent_spark');
    assert.equal(initialBudget.remainingBudget, 10.0);

    const result = await generatePrivacyPreservingAnalytics({
      rawAffiliates: SAMPLE_AFFILIATES,
      rawCommissions: SAMPLE_COMMISSIONS,
      user: adminUser,
      requestedParams: { includeOperationalAudit: true }
    });

    assert.equal(result.success, true);
    assert.equal(result.budgetTelemetry, undefined, 'Admin request must not consume or attach agent budget telemetry');

    // Agent budget must remain completely unchanged (10.0)
    const afterBudget = await getPrivacyBudget('usr_agent_spark');
    assert.equal(afterBudget.remainingBudget, 10.0);

    // Operational audit attached for admin only
    assert.ok(result.operationalGroundTruth);
    assert.equal(result.operationalGroundTruth.rawAffiliatesCount, 3);
  });

  test('U-19: Concurrent calls to consumePrivacyBudget are serialized without race conditions', async () => {
    // 5 concurrent requests executed simultaneously with Promise.all
    const promises = Array.from({ length: 5 }, (_, i) =>
      consumePrivacyBudget('usr_agent_spark', 1.0, { endpoint: '/concurrent', actionName: `query_${i}` })
    );
    const results = await Promise.all(promises);
    for (const r of results) {
      assert.equal(r.success, true);
    }
    const finalBudget = await getPrivacyBudget('usr_agent_spark');
    assert.equal(finalBudget.remainingBudget, 5.0, 'Remaining budget must be exactly 5.0 after 5 serialized deductions');
    assert.equal(finalBudget.totalQueriesExecuted, 5);
  });

  test('U-20: Neighboring dataset commission volume clamps total contribution per affiliate', async () => {
    // Affiliate with multiple commissions totaling > $3,000
    const multiCommissions = [
      { id: 'c1', affiliateId: 'aff_1', amount: 2000.00, status: 'paid' },
      { id: 'c2', affiliateId: 'aff_1', amount: 2500.00, status: 'paid' }, // total aff_1 = $4,500 -> must clamp to $3,000
      { id: 'c3', affiliateId: 'aff_2', amount: 500.00, status: 'paid' }
    ];

    const adminUser = { id: 'usr_admin_alex', role: 'admin' };
    const result = await generatePrivacyPreservingAnalytics({
      rawAffiliates: SAMPLE_AFFILIATES,
      rawCommissions: multiCommissions,
      user: adminUser,
      requestedParams: { includeOperationalAudit: true }
    });

    // aff_1 clamped to 3,000 + aff_2 clamped to 500 = 3,500 (instead of 5,000)
    assert.equal(result.operationalGroundTruth.rawVolume, 3500);
    assert.equal(result.operationalGroundTruth.rawPaid, 3500);
  });
});

