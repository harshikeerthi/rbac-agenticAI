import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer } from '../src/server.js';
import { resetStore } from '../src/store.js';
import { resetPrivacyState, getPrivacyBudget } from '../src/services/privacyEngine.js';

const PORT = 5056;
const BASE_URL = `http://localhost:${PORT}/api`;

describe('Module 4: API Route Hardening & Privacy Integration Suite', () => {
  before(async () => {
    await startServer(PORT);
    await resetStore();
    await resetPrivacyState();
  });

  after(async () => {
    await stopServer();
    await resetPrivacyState();
  });

  beforeEach(async () => {
    await resetPrivacyState();
  });

  // =========================================================================
  // 1. LEGACY ANALYTICS & GOVERNANCE DISPATCH RETROFIT
  // =========================================================================

  test('TC-M4-01: MarketPulse access to legacy GET /api/reports/aggregate-stats enforces Differential Privacy and deducts budget', async () => {
    const budgetBefore = await getPrivacyBudget('usr_agent_spark');
    assert.equal(budgetBefore.remainingBudget, 10.0);

    const res = await fetch(`${BASE_URL}/reports/aggregate-stats`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.privacyGuarantees.differentialPrivacyApplied, true);
    assert.equal(body.privacyGuarantees.rawTotalsExposed, false);
    assert.equal(body.privacyGuarantees.piiExposed, false);
    assert.equal(body.meta.enforcement, 'PRIVACY_POLICY_ENGINE_ENFORCED');

    // Budget deduction verified
    assert.equal(body.budgetTelemetry.epsilonDeducted, 1.0);
    assert.equal(body.budgetTelemetry.remainingBudget, 9.0);

    const budgetAfter = await getPrivacyBudget('usr_agent_spark');
    assert.equal(budgetAfter.remainingBudget, 9.0);
  });

  test('TC-M4-02: MarketPulse governance dispatch action query_aggregate_metrics enforces Differential Privacy and deducts budget', async () => {
    const res = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionName: 'query_aggregate_metrics' })
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.outcome, 'EXECUTED');
    assert.equal(body.policyCategory, 'ALLOWED');
    assert.equal(body.privacyGuarantees.differentialPrivacyApplied, true);
    assert.equal(body.privacyGuarantees.rawTotalsExposed, false);
    assert.ok(typeof body.budgetTelemetry.remainingBudget === 'number');
  });

  // =========================================================================
  // 2. DEDICATED MODULE 4 PRIVACY ANALYTICS ENDPOINT
  // =========================================================================

  test('TC-M4-03: MarketPulse accessing GET /api/reports/privacy-analytics receives perturbed stats without raw-data-dependent cohorts', async () => {
    // 1. MarketPulse query: cohorts are withheld to prevent unbudgeted threshold leakage
    const res = await fetch(`${BASE_URL}/reports/privacy-analytics`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.privacyMode, 'DIFFERENTIAL_PRIVACY_ENFORCED');
    assert.equal(body.privacyGuarantees.differentialPrivacyApplied, true);
    assert.equal(body.cohorts, null, 'Cohorts must be withheld from autonomous agent');
    assert.equal(body.data.categoriesCount, null, 'categoriesCount must be withheld from agent');
    assert.equal(body.data.topCategory, null, 'topCategory must be withheld from agent');
    assert.equal(body.privacyGuarantees.smallCellSuppressionApplied, null, 'Threshold status must not be disclosed');

    // 2. Admin Alex query: receives supervisory k-anonymized cohorts for governance oversight
    const adminRes = await fetch(`${BASE_URL}/reports/privacy-analytics`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const adminBody = await adminRes.json();
    assert.equal(adminRes.status, 200);
    assert.ok(Array.isArray(adminBody.cohorts), 'Admin must receive supervisory cohorts array');
    assert.equal(adminBody.cohorts.length, 3);
  });

  // =========================================================================
  // 3. PRIVACY BUDGET DEPLETION & HALTING
  // =========================================================================

  test('TC-M4-04: Agent privacy budget depletion halts legacy analytics and governance dispatch with HTTP 429', async () => {
    // Consume remaining 10 budget units
    for (let i = 0; i < 10; i++) {
      const qRes = await fetch(`${BASE_URL}/reports/aggregate-stats`, {
        headers: { 'x-demo-user-id': 'usr_agent_spark' }
      });
      assert.equal(qRes.status, 200);
    }

    // 11th call to legacy endpoint: blocked with 429
    const blockedStats = await fetch(`${BASE_URL}/reports/aggregate-stats`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    const blockedStatsBody = await blockedStats.json();
    assert.equal(blockedStats.status, 429);
    assert.equal(blockedStatsBody.code, 'PRIVACY_BUDGET_EXHAUSTED');

    // 11th call to governance dispatch: blocked with 429
    const blockedDispatch = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionName: 'query_aggregate_metrics' })
    });
    const blockedDispatchBody = await blockedDispatch.json();
    assert.equal(blockedDispatch.status, 429);
    assert.equal(blockedDispatchBody.code, 'PRIVACY_BUDGET_EXHAUSTED');
  });

  test('TC-M4-05: Depleted privacy budget halts GET /api/reports/privacy-analytics with HTTP 429 without releasing data', async () => {
    // Deplete budget
    for (let i = 0; i < 10; i++) {
      await fetch(`${BASE_URL}/reports/privacy-analytics`, {
        headers: { 'x-demo-user-id': 'usr_agent_spark' }
      });
    }

    const res = await fetch(`${BASE_URL}/reports/privacy-analytics`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    const body = await res.json();
    assert.equal(res.status, 429);
    assert.equal(body.code, 'PRIVACY_BUDGET_EXHAUSTED');
    assert.equal(body.data, undefined, 'Must not release analytics data when budget is depleted');
  });

  // =========================================================================
  // 4. BUDGET RESET SECURITY & ROLE ENFORCEMENT
  // =========================================================================

  test('TC-M4-06: Non-admin personas cannot reset privacy budget (403 UNAUTHORIZED_ADMIN)', async () => {
    // MarketPulse attempts self-reset
    const agentRes = await fetch(`${BASE_URL}/reports/privacy-budget/reset`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Self-replenish attempt' })
    });
    assert.equal(agentRes.status, 403);
    const agentBody = await agentRes.json();
    assert.equal(agentBody.code, 'UNAUTHORIZED_ADMIN');

    // Manager Sarah attempts reset
    const mgrRes = await fetch(`${BASE_URL}/reports/privacy-budget/reset`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_mgr_sarah',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Manager replenish' })
    });
    assert.equal(mgrRes.status, 403);

    // Affiliate Alice attempts reset (denied by RBAC or admin check)
    const affRes = await fetch(`${BASE_URL}/reports/privacy-budget/reset`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_aff_alice',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Affiliate replenish' })
    });
    assert.equal(affRes.status, 403);
  });

  test('TC-M4-07: Admin reset requires valid justification reason (400 INVALID_REASON)', async () => {
    const res = await fetch(`${BASE_URL}/reports/privacy-budget/reset`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: '   ' })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, 'INVALID_REASON');
  });

  test('TC-M4-08: Authorized Admin resets budget with justification and restores agent query capability', async () => {
    // Deplete budget
    for (let i = 0; i < 10; i++) {
      await fetch(`${BASE_URL}/reports/aggregate-stats`, {
        headers: { 'x-demo-user-id': 'usr_agent_spark' }
      });
    }

    // Verify depleted
    const checkBefore = await fetch(`${BASE_URL}/reports/privacy-budget`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const budgetBefore = await checkBefore.json();
    assert.equal(budgetBefore.data.remainingBudget, 0.0);

    // Admin executes reset
    const resetRes = await fetch(`${BASE_URL}/reports/privacy-budget/reset`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Authorized weekly telemetry budget replenishment' })
    });
    assert.equal(resetRes.status, 200);
    const resetBody = await resetRes.json();
    assert.equal(resetBody.success, true);
    assert.equal(resetBody.data.remainingBudget, 10.0);

    // Agent queries are restored
    const queryAfter = await fetch(`${BASE_URL}/reports/aggregate-stats`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(queryAfter.status, 200);
  });

  // =========================================================================
  // 5. PII EXCLUSION & ANTI-TAMPERING
  // =========================================================================

  test('TC-M4-09: Agent analytics response strictly excludes raw individual records, names, emails, and notes', async () => {
    const res = await fetch(`${BASE_URL}/reports/privacy-analytics`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.data.name, undefined);
    assert.equal(body.data.email, undefined);
    assert.equal(body.data.website, undefined);
    assert.equal(body.data.internalNotes, undefined);
    assert.equal(body.data.referralCode, undefined);
    assert.equal(body.operationalGroundTruth, undefined);
  });

  test('TC-M4-10: Agent cannot manipulate epsilon or k-threshold parameters (Server-Authoritative Enforcement)', async () => {
    const res = await fetch(`${BASE_URL}/reports/privacy-analytics?epsilon=999.0&k_threshold=1`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    // Must enforce default epsilon (1.0) and default k (3)
    assert.equal(body.privacyGuarantees.epsilonApplied, 1.0);
    assert.equal(body.privacyGuarantees.kAnonymityThreshold, 3);
    assert.equal(body.privacyGuarantees.parameterEnforcement, 'SERVER_AUTHORITATIVE_POLICY');
  });

  // =========================================================================
  // 6. CONTAINMENT (MODULE 3) INTEGRATION
  // =========================================================================

  test('TC-M4-11: QUARANTINE mode permits read-only privacy-protected analytics diagnostics', async () => {
    // Put agent in QUARANTINE
    await fetch(`${BASE_URL}/containment/mode`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mode: 'QUARANTINE', reason: 'Module 4 quarantine test' })
    });

    // 1. Reading privacy analytics: allowed under quarantine
    const analyticsRes = await fetch(`${BASE_URL}/reports/privacy-analytics`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(analyticsRes.status, 200);

    // 2. Reading privacy budget: allowed under quarantine
    const budgetRes = await fetch(`${BASE_URL}/reports/privacy-budget`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(budgetRes.status, 200);

    // Restore to NORMAL
    await fetch(`${BASE_URL}/containment/mode`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mode: 'NORMAL', reason: 'Restore normal mode' })
    });
  });

  test('TC-M4-12: TERMINATED mode blocks MarketPulse analytics with 503 before budget consumption', async () => {
    const budgetBefore = await getPrivacyBudget('usr_agent_spark');

    // Engage Kill Switch
    await fetch(`${BASE_URL}/containment/kill-switch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ engage: true, reason: 'Kill switch budget test' })
    });

    // Blocked with 503 AGENT_CONTAINMENT_ACTIVE
    const res = await fetch(`${BASE_URL}/reports/privacy-analytics`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.code, 'AGENT_CONTAINMENT_ACTIVE');

    // Verify ZERO budget was consumed
    const budgetAfter = await getPrivacyBudget('usr_agent_spark');
    assert.equal(budgetAfter.remainingBudget, budgetBefore.remainingBudget, 'Terminated agent request must not consume budget');

    // Disengage Kill Switch
    await fetch(`${BASE_URL}/containment/kill-switch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ engage: false, reason: 'Disengage kill switch' })
    });
  });

  // =========================================================================
  // 7. CONCURRENCY & HUMAN ROLE ACCESS
  // =========================================================================

  test('TC-M4-13: Concurrent analytics queries are atomically serialized and correctly deduct budget', async () => {
    // Fire 4 concurrent queries simultaneously via fetch
    const promises = Array.from({ length: 4 }, () =>
      fetch(`${BASE_URL}/reports/privacy-analytics`, {
        headers: { 'x-demo-user-id': 'usr_agent_spark' }
      })
    );

    const responses = await Promise.all(promises);
    for (const res of responses) {
      assert.equal(res.status, 200);
    }

    const budget = await getPrivacyBudget('usr_agent_spark');
    assert.equal(budget.remainingBudget, 6.0, 'Remaining budget must be exactly 6.0 after 4 concurrent deductions');
    assert.equal(budget.totalQueriesExecuted, 4);
  });

  test('TC-M4-14: Human Admin and Affiliate Manager retain authorized operational access without depleting agent budget', async () => {
    const agentBudgetBefore = await getPrivacyBudget('usr_agent_spark');

    // Admin reads aggregate stats -> receives operational unperturbed numbers
    const adminRes = await fetch(`${BASE_URL}/reports/aggregate-stats`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    assert.equal(adminRes.status, 200);
    const adminBody = await adminRes.json();
    assert.equal(adminBody.data.totalAffiliatesCount, 3);
    assert.equal(adminBody.data.totalPlatformClicks, 25400);

    // Manager Sarah reads aggregate stats
    const mgrRes = await fetch(`${BASE_URL}/reports/aggregate-stats`, {
      headers: { 'x-demo-user-id': 'usr_mgr_sarah' }
    });
    assert.equal(mgrRes.status, 200);

    // Verify Agent budget was NOT depleted
    const agentBudgetAfter = await getPrivacyBudget('usr_agent_spark');
    assert.equal(agentBudgetAfter.remainingBudget, agentBudgetBefore.remainingBudget);
  });

  test('TC-M4-15: Affiliate partner role without reports:read:aggregate is denied with 403 INSUFFICIENT_PERMISSIONS', async () => {
    const endpoints = [
      '/reports/aggregate-stats',
      '/reports/privacy-analytics',
      '/reports/privacy-budget'
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${BASE_URL}${ep}`, {
        headers: { 'x-demo-user-id': 'usr_aff_alice' }
      });
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.code, 'INSUFFICIENT_PERMISSIONS');
    }
  });

  test('TC-M4-16: Least-privilege access verification on GET /api/reports/privacy-budget', async () => {
    // 1. Manager Sarah has reports:read:aggregate, but is NOT admin or ai_agent -> denied 403
    const mgrBudgetRes = await fetch(`${BASE_URL}/reports/privacy-budget`, {
      headers: { 'x-demo-user-id': 'usr_mgr_sarah' }
    });
    assert.equal(mgrBudgetRes.status, 403);
    const mgrBudgetBody = await mgrBudgetRes.json();
    assert.equal(mgrBudgetBody.code, 'INSUFFICIENT_PERMISSIONS');

    // 2. Manager Sarah accessing /reports/privacy-analytics succeeds 200 and does NOT consume agent budget
    const budgetBefore = await getPrivacyBudget('usr_agent_spark');
    const mgrAnalyticsRes = await fetch(`${BASE_URL}/reports/privacy-analytics`, {
      headers: { 'x-demo-user-id': 'usr_mgr_sarah' }
    });
    assert.equal(mgrAnalyticsRes.status, 200);
    const budgetAfter = await getPrivacyBudget('usr_agent_spark');
    assert.equal(budgetAfter.remainingBudget, budgetBefore.remainingBudget);

    // 3. Admin Alex can inspect budget -> 200 OK
    const adminRes = await fetch(`${BASE_URL}/reports/privacy-budget`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    assert.equal(adminRes.status, 200);
    const adminBody = await adminRes.json();
    assert.equal(adminBody.success, true);
    assert.equal(adminBody.data.agentId, 'usr_agent_spark');

    // 4. Autonomous Agent MarketPulse can inspect its own budget telemetry -> 200 OK
    const agentRes = await fetch(`${BASE_URL}/reports/privacy-budget`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(agentRes.status, 200);
    const agentBody = await agentRes.json();
    assert.equal(agentBody.success, true);
    assert.equal(agentBody.data.agentId, 'usr_agent_spark');
  });

  test('TC-M4-17: Response metadata explicitly details metric-level epsilon allocations summing to 1.0', async () => {
    const res = await fetch(`${BASE_URL}/reports/privacy-analytics`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.success, true);
    assert.ok(body.privacyGuarantees.epsilonAllocations);
    const alloc = body.privacyGuarantees.epsilonAllocations;

    assert.equal(alloc.totalAffiliatesCount, 0.2);
    assert.equal(alloc.totalPlatformClicks, 0.2);
    assert.equal(alloc.totalPlatformConversions, 0.2);
    assert.equal(alloc.totalCommissionVolume, 0.2);
    assert.equal(alloc.totalPaidCommissions, 0.2);
    assert.equal(alloc.totalAllocated, 1.0);

    // Epsilon deducted in telemetry must match totalAllocated exactly
    assert.equal(body.budgetTelemetry.epsilonDeducted, 1.0);
    assert.equal(body.data.totalActiveAffiliates, null, 'Active affiliates must be omitted');

    // Calibrated noise scales
    assert.equal(body.privacyGuarantees.calibratedNoiseScales.totalPlatformClicks, 75000);
    assert.equal(body.privacyGuarantees.calibratedNoiseScales.totalPlatformConversions, 5000);
    assert.equal(body.privacyGuarantees.calibratedNoiseScales.totalCommissionVolume, 15000);
    assert.equal(body.privacyGuarantees.calibratedNoiseScales.totalPaidCommissions, 15000);
    assert.equal(body.privacyGuarantees.calibratedNoiseScales.totalAffiliatesCount, 5);
  });

  test('TC-M4-18: Repeated queries consistently deduct 1.0 epsilon per query across all three agent access paths', async () => {
    // 1. Initial budget is 10.0
    const b0 = await getPrivacyBudget('usr_agent_spark');
    assert.equal(b0.remainingBudget, 10.0);

    // 2. Query path 1: /reports/privacy-analytics
    const res1 = await fetch(`${BASE_URL}/reports/privacy-analytics`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(res1.status, 200);
    const b1 = await getPrivacyBudget('usr_agent_spark');
    assert.equal(b1.remainingBudget, 9.0);

    // 3. Query path 2: legacy /reports/aggregate-stats
    const res2 = await fetch(`${BASE_URL}/reports/aggregate-stats`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(res2.status, 200);
    const b2 = await getPrivacyBudget('usr_agent_spark');
    assert.equal(b2.remainingBudget, 8.0);

    // 4. Query path 3: /governance/dispatch (action: query_aggregate_metrics)
    const res3 = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionName: 'query_aggregate_metrics' })
    });
    assert.equal(res3.status, 200);
    const b3 = await getPrivacyBudget('usr_agent_spark');
    assert.equal(b3.remainingBudget, 7.0);

    // Verify all 3 queries deducted exactly 1.0 each
    assert.equal(b3.totalQueriesExecuted, 3);
  });

  test('TC-M4-19: None of the three MarketPulse access paths exposes raw-data-dependent cohort threshold status', async () => {
    // Path 1: GET /api/reports/privacy-analytics
    const res1 = await fetch(`${BASE_URL}/reports/privacy-analytics`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    const body1 = await res1.json();
    assert.equal(res1.status, 200);

    // Path 2: GET /api/reports/aggregate-stats
    const res2 = await fetch(`${BASE_URL}/reports/aggregate-stats`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    const body2 = await res2.json();
    assert.equal(res2.status, 200);

    // Path 3: POST /api/governance/dispatch (actionName: query_aggregate_metrics)
    const res3 = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionName: 'query_aggregate_metrics' })
    });
    const body3 = await res3.json();
    assert.equal(res3.status, 200);

    const responses = [body1, body2, body3];
    for (const b of responses) {
      // 1. cohorts array must be null or undefined
      assert.ok(b.cohorts === null || b.cohorts === undefined, 'No cohorts array permitted for agent');

      // 2. No SUPPRESSED or PUBLISHED threshold string anywhere in serialized response
      const serialized = JSON.stringify(b);
      assert.ok(!serialized.includes('"SUPPRESSED"'), 'Must not contain SUPPRESSED status');
      assert.ok(!serialized.includes('"PUBLISHED"'), 'Must not contain PUBLISHED status');

      // 3. data object must strictly contain only the 5 DP metrics + derived conversion rate
      const data = b.data;
      assert.ok(typeof data.totalAffiliatesCount === 'number');
      assert.ok(typeof data.totalPlatformClicks === 'number');
      assert.ok(typeof data.totalPlatformConversions === 'number');
      assert.ok(typeof data.totalCommissionVolume === 'number');
      assert.ok(typeof data.totalPaidCommissions === 'number');
      assert.ok(typeof data.platformConversionRate === 'string');

      // 4. No raw cohort size, active count, categories count, or topCategory
      assert.equal(data.totalActiveAffiliates, null);
      assert.equal(data.categoriesCount, null);
      assert.equal(data.topCategory, null);
      assert.equal(data.memberCount, undefined);

      // 5. smallCellSuppressionApplied threshold boolean must not be present
      assert.equal(b.privacyGuarantees.smallCellSuppressionApplied, null);
    }
  });
});

