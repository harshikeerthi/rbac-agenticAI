import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer } from '../src/server.js';
import { resetStore, createAgentProposal } from '../src/store.js';

const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}/api`;

describe('Security & RBAC Authorization Suite', () => {
  before(async () => {
    await startServer(PORT);
    await resetStore();
  });

  after(async () => {
    await stopServer();
  });

  // TC-01: Health check
  test('TC-01: Health check is public and returns 200 OK', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, 'healthy');
  });

  // TC-02: Missing identity header
  test('TC-02: Missing identity header returns 401 MISSING_IDENTITY', async () => {
    const res = await fetch(`${BASE_URL}/affiliates`);
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.code, 'MISSING_IDENTITY');
    assert.equal(body.success, false);
  });

  // TC-03: Invalid identity header
  test('TC-03: Invalid identity header returns 401 INVALID_IDENTITY', async () => {
    const res = await fetch(`${BASE_URL}/affiliates`, {
      headers: { 'x-demo-user-id': 'usr_fake_attacker' }
    });
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.code, 'INVALID_IDENTITY');
    assert.equal(body.success, false);
  });

  // TC-04: Admin lists all affiliates
  test('TC-04: Admin lists all affiliates across platform (Global scope)', async () => {
    const res = await fetch(`${BASE_URL}/affiliates`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.equal(body.count, 3, 'Admin should see all 3 affiliates');
  });

  // TC-05: Affiliate Manager lists assigned affiliates only
  test('TC-05: Affiliate Manager Sarah sees only assigned affiliates (Alice & Bob)', async () => {
    const res = await fetch(`${BASE_URL}/affiliates`, {
      headers: { 'x-demo-user-id': 'usr_mgr_sarah' }
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.count, 2, 'Sarah manages only Alice and Bob');
    const ids = body.data.map(a => a.id);
    assert.ok(ids.includes('aff_alice'));
    assert.ok(ids.includes('aff_bob'));
    assert.ok(!ids.includes('aff_charlie'), 'Charlie belongs to David, must not be visible to Sarah');
  });

  // TC-06: Affiliate User lists own profile only
  test('TC-06: Affiliate User Alice sees only her own record', async () => {
    const res = await fetch(`${BASE_URL}/affiliates`, {
      headers: { 'x-demo-user-id': 'usr_aff_alice' }
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.count, 1, 'Alice should only see her own card');
    assert.equal(body.data[0].id, 'aff_alice');
  });

  // TC-07: Admin creates affiliate
  test('TC-07: Admin creates new affiliate successfully (201 Created)', async () => {
    const res = await fetch(`${BASE_URL}/affiliates`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Eva Publisher',
        email: 'eva@editorial.com',
        website: 'https://editorial.com',
        assignedManagerId: 'usr_mgr_sarah',
        commissionRate: 14.0
      })
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.name, 'Eva Publisher');
  });

  // TC-08: Affiliate User tries to create affiliate
  test('TC-08: Affiliate User Alice denied creation (403 INSUFFICIENT_PERMISSIONS)', async () => {
    const res = await fetch(`${BASE_URL}/affiliates`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_aff_alice',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Unauthorized Affiliate',
        email: 'hack@test.com'
      })
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'INSUFFICIENT_PERMISSIONS');
    assert.equal(body.success, false);
  });

  // TC-09: Affiliate Manager tries to create affiliate
  test('TC-09: Affiliate Manager Sarah denied creation (403 INSUFFICIENT_PERMISSIONS)', async () => {
    const res = await fetch(`${BASE_URL}/affiliates`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_mgr_sarah',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Manager Created Partner',
        email: 'partner@sarah.com'
      })
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'INSUFFICIENT_PERMISSIONS');
  });

  // TC-10: Cross-tenant data access (Alice tries to read Bob)
  test('TC-10: Affiliate Alice reading Bob is rejected (403 RESOURCE_ACCESS_DENIED / OWNERSHIP_VIOLATION)', async () => {
    const res = await fetch(`${BASE_URL}/affiliates/aff_bob`, {
      headers: { 'x-demo-user-id': 'usr_aff_alice' }
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'RESOURCE_ACCESS_DENIED');
    assert.equal(body.details.reason, 'OWNERSHIP_VIOLATION');
  });

  // TC-11: Manager boundary violation (Sarah reads David’s affiliate Charlie)
  test('TC-11: Manager Sarah reading unassigned Charlie is rejected (403 RESOURCE_ACCESS_DENIED / ASSIGNMENT_VIOLATION)', async () => {
    const res = await fetch(`${BASE_URL}/affiliates/aff_charlie`, {
      headers: { 'x-demo-user-id': 'usr_mgr_sarah' }
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'RESOURCE_ACCESS_DENIED');
    assert.equal(body.details.reason, 'ASSIGNMENT_VIOLATION');
  });

  // TC-12: Cross-tenant edit (Alice tries to update Bob)
  test('TC-12: Affiliate Alice modifying Bob is rejected (403 RESOURCE_ACCESS_DENIED)', async () => {
    const res = await fetch(`${BASE_URL}/affiliates/aff_bob`, {
      method: 'PUT',
      headers: {
        'x-demo-user-id': 'usr_aff_alice',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ website: 'https://tampered.com' })
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'RESOURCE_ACCESS_DENIED');
  });

  // TC-13: Field protection: Alice tries to alter her own commissionRate
  test('TC-13: Affiliate Alice modifying commissionRate is rejected (403 RESTRICTED_FIELD_UPDATE_DENIED)', async () => {
    const res = await fetch(`${BASE_URL}/affiliates/aff_alice`, {
      method: 'PUT',
      headers: {
        'x-demo-user-id': 'usr_aff_alice',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ commissionRate: 99.0 })
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'RESTRICTED_FIELD_UPDATE_DENIED');
    assert.ok(body.details.restrictedFields.includes('commissionRate'));
  });

  // TC-14: Admin approves commission payout
  test('TC-14: Admin approves commission payout (200 OK)', async () => {
    const res = await fetch(`${BASE_URL}/commissions/comm_102/approve`, {
      method: 'POST',
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'paid');
    assert.equal(body.data.approvedBy, 'usr_admin_alex');
  });

  // TC-15: Affiliate Manager tries to approve commission payout
  test('TC-15: Affiliate Manager Sarah approving payout is rejected (403 INSUFFICIENT_PERMISSIONS)', async () => {
    const res = await fetch(`${BASE_URL}/commissions/comm_103/approve`, {
      method: 'POST',
      headers: { 'x-demo-user-id': 'usr_mgr_sarah' }
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'INSUFFICIENT_PERMISSIONS');
  });

  // TC-16: AI Agent reads aggregate stats
  test('TC-16: Simulated AI Agent reads aggregate stats (200 OK, zero PII)', async () => {
    const res = await fetch(`${BASE_URL}/reports/aggregate-stats`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.totalAffiliatesCount >= 3);
    assert.ok(body.data.platformConversionRate);
    assert.equal(body.privacyGuarantees.piiExposed, false);
    // Verify no individual names or emails leaked
    assert.equal(body.data.name, undefined);
    assert.equal(body.data.email, undefined);
  });

  // TC-17: AI Agent tries to read affiliate directory
  test('TC-17: Simulated AI Agent reading affiliate list is rejected (403 INSUFFICIENT_PERMISSIONS)', async () => {
    const res = await fetch(`${BASE_URL}/affiliates`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'INSUFFICIENT_PERMISSIONS');
  });

  // TC-18: AI Agent tries to perform POST mutation
  test('TC-18: Simulated AI Agent creating affiliate is rejected (403 INSUFFICIENT_PERMISSIONS)', async () => {
    const res = await fetch(`${BASE_URL}/affiliates`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Bot Account', email: 'bot@system.internal' })
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'INSUFFICIENT_PERMISSIONS');
  });

  // TC-19: Role spoofing check
  test('TC-19: Body-level role spoofing is ignored; server enforces backend role', async () => {
    const res = await fetch(`${BASE_URL}/affiliates`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_aff_alice',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'admin', // Attacker claims to be admin in request body
        name: 'Spoofed Admin Affiliate',
        email: 'spoofed@admin.com'
      })
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'INSUFFICIENT_PERMISSIONS');
    assert.equal(body.details.role, 'affiliate_user');
  });

  // TC-20: In-App Activity Log records decisions
  test('TC-20: In-App Activity Log records audit stream (Admin: 200 OK)', async () => {
    const res = await fetch(`${BASE_URL}/activity`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.count > 0);
    // Verify that both ALLOWED and DENIED outcomes were logged
    const hasAllowed = body.data.some(log => log.outcome === 'ALLOWED');
    const hasDenied = body.data.some(log => log.outcome === 'DENIED');
    assert.ok(hasAllowed, 'Activity log should contain ALLOWED events');
    assert.ok(hasDenied, 'Activity log should contain DENIED events');
  });

  // TC-21: MarketPulse can execute query_aggregate_metrics
  test('TC-21: MarketPulse can execute query_aggregate_metrics (200 OK / EXECUTED)', async () => {
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
    assert.equal(body.success, true);
    assert.equal(body.outcome, 'EXECUTED');
    assert.equal(body.policyCategory, 'ALLOWED');
    assert.equal(body.data.privacyGuarantees.piiExposed, false);
    assert.ok(body.data.totalAffiliatesCount >= 3);
  });

  // TC-22: MarketPulse can submit propose_commission_adjustment and receives 202 QUEUED_FOR_APPROVAL
  test('TC-22: MarketPulse submits propose_commission_adjustment and receives 202 QUEUED_FOR_APPROVAL', async () => {
    const res = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionName: 'propose_commission_adjustment',
        parameters: {
          targetAffiliateId: 'aff_bob',
          proposedRate: 16.5,
          reason: 'High retention and Q3 conversion volume'
        }
      })
    });
    const body = await res.json();
    assert.equal(res.status, 202);
    assert.equal(body.success, true);
    assert.equal(body.outcome, 'QUEUED_FOR_APPROVAL');
    assert.equal(body.policyCategory, 'REQUIRES_APPROVAL');
    assert.equal(body.proposal.status, 'pending');
    assert.equal(body.proposal.proposedRate, 16.5);

    // Verify Bob\'s actual commissionRate is still unchanged at 12.5%
    const checkRes = await fetch(`${BASE_URL}/affiliates/aff_bob`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const checkBody = await checkRes.json();
    assert.equal(checkBody.data.commissionRate, 12.5, 'Rate must not change until approved');
  });

  // TC-23: MarketPulse attempting read_affiliate_pii receives 403 POLICY_VIOLATION
  test('TC-23: MarketPulse attempting read_affiliate_pii receives 403 POLICY_VIOLATION', async () => {
    const res = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionName: 'read_affiliate_pii' })
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'POLICY_VIOLATION');
    assert.equal(body.policyCategory, 'PROHIBITED');
  });

  // TC-24: Unknown agent actions are rejected by default (Zero Trust)
  test('TC-24: Unknown agent actions are rejected by default (403 POLICY_VIOLATION)', async () => {
    const res = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionName: 'export_database_unrestricted' })
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'POLICY_VIOLATION');
    assert.equal(body.policyCategory, 'PROHIBITED');
  });

  // TC-25: An authorised Admin can approve a valid pending proposal and the commission rate is updated
  test('TC-25: Authorised Admin approves valid proposal and commission rate updates (200 OK)', async () => {
    await resetStore(); // Reset so prop_seed_001 is clean and pending
    const res = await fetch(`${BASE_URL}/governance/proposals/prop_seed_001/approve`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'Verified high Q3 SaaS performance' })
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.proposal.status, 'approved');
    assert.equal(body.proposal.resolvedBy, 'usr_admin_alex');
    assert.equal(body.updatedAffiliate.commissionRate, 18.0);

    // Verify through direct affiliate detail query that Alice\'s rate is updated to 18.0%
    const checkRes = await fetch(`${BASE_URL}/affiliates/aff_alice`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const checkBody = await checkRes.json();
    assert.equal(checkBody.data.commissionRate, 18.0);
  });

  // TC-26: Duplicate approval is rejected
  test('TC-26: Duplicate approval is rejected with 400 PROPOSAL_ALREADY_RESOLVED', async () => {
    // Attempting to approve prop_seed_001 a second time
    const res = await fetch(`${BASE_URL}/governance/proposals/prop_seed_001/approve`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'Second redundant approval attempt' })
    });
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.code, 'PROPOSAL_ALREADY_RESOLVED');
  });

  // TC-27: Self-approval is rejected
  test('TC-27: Self-approval is rejected (Agent cannot approve; creator cannot approve)', async () => {
    // 1. Agent MarketPulse tries to approve a proposal -> blocked by RBAC
    const agentApproveRes = await fetch(`${BASE_URL}/governance/proposals/prop_seed_001/approve`, {
      method: 'POST',
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    const agentApproveBody = await agentApproveRes.json();
    assert.equal(agentApproveRes.status, 403);
    assert.equal(agentApproveBody.code, 'INSUFFICIENT_PERMISSIONS');

    // 2. Admin creates a proposal where agentId === usr_admin_alex and tries to approve it
    const selfProp = await createAgentProposal({
      agentId: 'usr_admin_alex',
      agentName: 'Alex Carter',
      actionName: 'propose_commission_adjustment',
      targetAffiliateId: 'aff_bob',
      proposedRate: 20.0,
      reason: 'Self created proposal'
    });
    const selfApproveRes = await fetch(`${BASE_URL}/governance/proposals/${selfProp.id}/approve`, {
      method: 'POST',
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const selfApproveBody = await selfApproveRes.json();
    assert.equal(selfApproveRes.status, 403);
    assert.equal(selfApproveBody.code, 'SELF_APPROVAL_DISALLOWED');
  });

  // TC-28: Non-admin users cannot view policies or proposals
  test('TC-28: Non-admin users cannot view policies or proposals (403 INSUFFICIENT_PERMISSIONS)', async () => {
    // Manager Sarah
    const mgrPolicyRes = await fetch(`${BASE_URL}/governance/policies`, {
      headers: { 'x-demo-user-id': 'usr_mgr_sarah' }
    });
    assert.equal(mgrPolicyRes.status, 403);
    const mgrPolicyBody = await mgrPolicyRes.json();
    assert.equal(mgrPolicyBody.code, 'INSUFFICIENT_PERMISSIONS');

    // Affiliate Alice
    const affPropRes = await fetch(`${BASE_URL}/governance/proposals`, {
      headers: { 'x-demo-user-id': 'usr_aff_alice' }
    });
    assert.equal(affPropRes.status, 403);
    const affPropBody = await affPropRes.json();
    assert.equal(affPropBody.code, 'INSUFFICIENT_PERMISSIONS');

    // Agent MarketPulse
    const agentPolicyRes = await fetch(`${BASE_URL}/governance/policies`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(agentPolicyRes.status, 403);
  });

  // TC-29: Non-admin users cannot approve or reject proposals
  test('TC-29: Non-admin users cannot approve or reject proposals (403 INSUFFICIENT_PERMISSIONS)', async () => {
    // Manager Sarah tries to approve
    const mgrApproveRes = await fetch(`${BASE_URL}/governance/proposals/prop_seed_001/approve`, {
      method: 'POST',
      headers: { 'x-demo-user-id': 'usr_mgr_sarah' }
    });
    assert.equal(mgrApproveRes.status, 403);
    const mgrApproveBody = await mgrApproveRes.json();
    assert.equal(mgrApproveBody.code, 'INSUFFICIENT_PERMISSIONS');

    // Affiliate Alice tries to reject
    const affRejectRes = await fetch(`${BASE_URL}/governance/proposals/prop_seed_001/reject`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_aff_alice',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Disallowed attempt' })
    });
    assert.equal(affRejectRes.status, 403);
    const affRejectBody = await affRejectRes.json();
    assert.equal(affRejectBody.code, 'INSUFFICIENT_PERMISSIONS');
  });

  // TC-30: Agent governance audit records are created for allowed, prohibited, queued, approved and rejected actions
  test('TC-30: Agent governance audit records capture full lifecycle outcomes', async () => {
    // 1. Trigger an allowed action -> logs EXECUTED
    await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionName: 'query_aggregate_metrics' })
    });

    // 2. Trigger a prohibited action -> logs PROHIBITED
    await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionName: 'read_affiliate_pii' })
    });

    // 3. Trigger a proposal action -> logs QUEUED_FOR_APPROVAL
    const propRes = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionName: 'propose_commission_adjustment',
        parameters: { targetAffiliateId: 'aff_alice', proposedRate: 17.5, reason: 'Lifecycle audit test' }
      })
    });
    const propData = await propRes.json();

    // 4. Admin approves the proposal -> logs APPROVED_BY_ADMIN
    await fetch(`${BASE_URL}/governance/proposals/${propData.proposal.id}/approve`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'Lifecycle approval' })
    });

    // 5. Create a proposal to reject -> logs REJECTED_BY_ADMIN
    const rejProp = await createAgentProposal({
      agentId: 'usr_agent_spark',
      agentName: 'MarketPulse AI Agent',
      actionName: 'propose_commission_adjustment',
      targetAffiliateId: 'aff_charlie',
      proposedRate: 15.0,
      reason: 'Charlie lifecycle reject test'
    });

    await fetch(`${BASE_URL}/governance/proposals/${rejProp.id}/reject`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Tax forms still pending review' })
    });

    // Fetch governance audit stream
    const auditRes = await fetch(`${BASE_URL}/governance/audit`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    assert.equal(auditRes.status, 200);
    const auditBody = await auditRes.json();
    assert.ok(Array.isArray(auditBody.data));

    const outcomes = auditBody.data.map(l => l.outcome);
    assert.ok(outcomes.includes('EXECUTED'), 'Must record EXECUTED outcome');
    assert.ok(outcomes.includes('PROHIBITED'), 'Must record PROHIBITED outcome');
    assert.ok(outcomes.includes('QUEUED_FOR_APPROVAL'), 'Must record QUEUED_FOR_APPROVAL outcome');
    assert.ok(outcomes.includes('APPROVED_BY_ADMIN'), 'Must record APPROVED_BY_ADMIN outcome');
    assert.ok(outcomes.includes('REJECTED_BY_ADMIN'), 'Must record REJECTED_BY_ADMIN outcome');
  });

  // TC-31: MarketPulse cannot directly access affiliate records or commission approval endpoints
  test('TC-31: MarketPulse cannot directly access affiliate records or commission approval (Least-Privilege Isolation)', async () => {
    // 1. Direct affiliate directory access denied
    const affListRes = await fetch(`${BASE_URL}/affiliates`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(affListRes.status, 403);

    // 2. Direct individual affiliate access denied
    const affDetailRes = await fetch(`${BASE_URL}/affiliates/aff_alice`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(affDetailRes.status, 403);

    // 3. Direct commission ledger access denied
    const commListRes = await fetch(`${BASE_URL}/commissions`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(commListRes.status, 403);

    // 4. Direct payout approval denied
    const payoutRes = await fetch(`${BASE_URL}/commissions/comm_102/approve`, {
      method: 'POST',
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(payoutRes.status, 403);
  });

  // TC-32: Invalid commission rates and invalid affiliate IDs are rejected
  test('TC-32: Invalid commission rates and invalid affiliate IDs are rejected (400 / 404)', async () => {
    // Rate above 50%
    const highRateRes = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionName: 'propose_commission_adjustment',
        parameters: { targetAffiliateId: 'aff_bob', proposedRate: 99.0, reason: 'Out of range rate' }
      })
    });
    const highRateBody = await highRateRes.json();
    assert.equal(highRateRes.status, 400);
    assert.equal(highRateBody.code, 'INVALID_COMMISSION_RATE');

    // Rate below 1%
    const lowRateRes = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionName: 'propose_commission_adjustment',
        parameters: { targetAffiliateId: 'aff_bob', proposedRate: 0.1, reason: 'Too low' }
      })
    });
    const lowRateBody = await lowRateRes.json();
    assert.equal(lowRateRes.status, 400);
    assert.equal(lowRateBody.code, 'INVALID_COMMISSION_RATE');

    // Invalid affiliate ID
    const ghostAffRes = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionName: 'propose_commission_adjustment',
        parameters: { targetAffiliateId: 'aff_non_existent', proposedRate: 15.0, reason: 'Ghost affiliate' }
      })
    });
    const ghostAffBody = await ghostAffRes.json();
    assert.equal(ghostAffRes.status, 404);
    assert.equal(ghostAffBody.code, 'AFFILIATE_NOT_FOUND');
  });

  // TC-33: A proposal cannot be executed twice, rejected proposals never update rates, and audit records cannot be mutated
  test('TC-33: Rejected proposals never modify rates; duplicate execution is blocked; audit cannot be mutated', async () => {
    await resetStore();

    // 1. Create a proposal for Bob and reject it
    const rejProp = await createAgentProposal({
      agentId: 'usr_agent_spark',
      agentName: 'MarketPulse AI Agent',
      actionName: 'propose_commission_adjustment',
      targetAffiliateId: 'aff_bob',
      proposedRate: 19.0,
      reason: 'Rejected proposal rate test'
    });

    const rejRes = await fetch(`${BASE_URL}/governance/proposals/${rejProp.id}/reject`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Sales volume dropped in October' })
    });
    assert.equal(rejRes.status, 200);

    // Verify Bob\'s commission rate is STILL 12.5%
    const bobRes = await fetch(`${BASE_URL}/affiliates/aff_bob`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const bobBody = await bobRes.json();
    assert.equal(bobBody.data.commissionRate, 12.5, 'Rejected proposal must never update rates');

    // Attempting to approve the rejected proposal is blocked
    const approveRejRes = await fetch(`${BASE_URL}/governance/proposals/${rejProp.id}/approve`, {
      method: 'POST',
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    assert.equal(approveRejRes.status, 400);
    const approveRejBody = await approveRejRes.json();
    assert.equal(approveRejBody.code, 'PROPOSAL_ALREADY_RESOLVED');

    // 2. Verify audit records cannot be modified or deleted through normal application APIs (404)
    const putAuditRes = await fetch(`${BASE_URL}/governance/audit`, {
      method: 'PUT',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: [] })
    });
    assert.equal(putAuditRes.status, 404, 'PUT /governance/audit must return 404 Not Found');

    const delAuditRes = await fetch(`${BASE_URL}/governance/audit`, {
      method: 'DELETE',
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    assert.equal(delAuditRes.status, 404, 'DELETE /governance/audit must return 404 Not Found');

    // 3. Request body role spoofing cannot bypass governance
    const spoofRes = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_aff_alice',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'admin', actionName: 'query_aggregate_metrics' })
    });
    assert.equal(spoofRes.status, 403, 'Role spoofing in body must not grant admin governance access');
  });
});

