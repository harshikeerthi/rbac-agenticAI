import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer } from '../src/server.js';
import { resetStore, createAgentProposal, getAllContainmentStates } from '../src/store.js';

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

  // =========================================================================
  // MODULE 3: AGENT KILL SWITCH & RUNTIME CONTAINMENT TESTS (TC-34 to TC-45)
  // =========================================================================

  // TC-34: Admin can read containment status (200 OK)
  test('TC-34: Authorized Admin reads agent containment status and circuit breaker (200 OK)', async () => {
    await resetStore();
    const res = await fetch(`${BASE_URL}/containment/status`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.agentId, 'usr_agent_spark');
    assert.equal(body.data.containmentMode, 'NORMAL');
    assert.equal(body.data.killSwitchEngaged, false);
    assert.equal(body.circuitBreaker.tripThreshold, 3);
    assert.equal(body.circuitBreaker.currentViolations, 0);
  });

  // TC-35: Admin can activate the kill switch
  test('TC-35: Authorized Admin activates emergency Kill Switch (200 OK, mode: TERMINATED)', async () => {
    const res = await fetch(`${BASE_URL}/containment/kill-switch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        engage: true,
        reason: 'Emergency containment test drill'
      })
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.killSwitchEngaged, true);
    assert.equal(body.data.containmentMode, 'TERMINATED');
    assert.equal(body.data.lastTransition.triggeredBy, 'usr_admin_alex');
  });

  // TC-36: MarketPulse aggregate-stat requests return HTTP 503 when terminated
  test('TC-36: MarketPulse aggregate stats request blocked with 503 AGENT_CONTAINMENT_ACTIVE when terminated', async () => {
    // Kill switch is currently engaged from TC-35
    const res = await fetch(`${BASE_URL}/reports/aggregate-stats`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    const body = await res.json();
    assert.equal(res.status, 503);
    assert.equal(body.code, 'AGENT_CONTAINMENT_ACTIVE');
    assert.equal(body.containmentMode, 'TERMINATED');
    assert.equal(body.killSwitchEngaged, true);
  });

  // TC-37: MarketPulse governance dispatch returns HTTP 503 when terminated
  test('TC-37: MarketPulse governance dispatch blocked with 503 AGENT_CONTAINMENT_ACTIVE when terminated', async () => {
    const res = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionName: 'query_aggregate_metrics' })
    });
    const body = await res.json();
    assert.equal(res.status, 503);
    assert.equal(body.code, 'AGENT_CONTAINMENT_ACTIVE');
    assert.equal(body.containmentMode, 'TERMINATED');
  });

  // TC-38: Human administrator requests remain unaffected
  test('TC-38: Human users (Admin, Manager, Affiliate) remain completely unaffected by active Kill Switch', async () => {
    // Admin reads aggregate stats -> 200 OK
    const adminRes = await fetch(`${BASE_URL}/reports/aggregate-stats`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    assert.equal(adminRes.status, 200);

    // Manager reads affiliates -> 200 OK
    const mgrRes = await fetch(`${BASE_URL}/affiliates`, {
      headers: { 'x-demo-user-id': 'usr_mgr_sarah' }
    });
    assert.equal(mgrRes.status, 200);

    // Affiliate Alice reads own commissions -> 200 OK
    const affRes = await fetch(`${BASE_URL}/commissions`, {
      headers: { 'x-demo-user-id': 'usr_aff_alice' }
    });
    assert.equal(affRes.status, 200);
  });

  // TC-39: Non-admin users cannot activate or reset containment
  test('TC-39: Non-admin users (Manager, Affiliate, Agent) cannot manage containment (403 INSUFFICIENT_PERMISSIONS)', async () => {
    // Sarah tries to disengage kill switch
    const sarahRes = await fetch(`${BASE_URL}/containment/kill-switch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_mgr_sarah',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ engage: false, reason: 'Manager attempt' })
    });
    assert.equal(sarahRes.status, 403);
    const sarahBody = await sarahRes.json();
    assert.equal(sarahBody.code, 'INSUFFICIENT_PERMISSIONS');

    // Alice tries to change mode
    const aliceRes = await fetch(`${BASE_URL}/containment/mode`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_aff_alice',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mode: 'NORMAL', reason: 'Affiliate attempt' })
    });
    assert.equal(aliceRes.status, 403);

    // Agent MarketPulse tries to reset
    const agentRes = await fetch(`${BASE_URL}/containment/reset`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Self reset attempt' })
    });
    assert.ok([403, 503].includes(agentRes.status));
  });

  // TC-40: QUARANTINE blocks autonomous execution and proposal submissions
  test('TC-40: QUARANTINE mode blocks proposals with 403 AGENT_QUARANTINED but allows read-only aggregate diagnostics', async () => {
    // Admin sets mode to QUARANTINE
    const modeRes = await fetch(`${BASE_URL}/containment/mode`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: 'QUARANTINE',
        reason: 'Quarantine investigation active'
      })
    });
    assert.equal(modeRes.status, 200);

    // 1. MarketPulse submitting proposal is blocked (403 AGENT_QUARANTINED)
    const propRes = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionName: 'propose_commission_adjustment',
        parameters: { targetAffiliateId: 'aff_alice', proposedRate: 15.0, reason: 'Quarantined attempt' }
      })
    });
    const propBody = await propRes.json();
    assert.equal(propRes.status, 403);
    assert.equal(propBody.code, 'AGENT_QUARANTINED');

    // 2. MarketPulse reading aggregate stats is permitted (200 OK)
    const readRes = await fetch(`${BASE_URL}/reports/aggregate-stats`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(readRes.status, 200);

    // 3. MarketPulse dispatching query_aggregate_metrics is permitted (200 OK)
    const dispatchReadRes = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionName: 'query_aggregate_metrics' })
    });
    assert.equal(dispatchReadRes.status, 200);
  });

  // TC-41: Three prohibited actions trigger automatic quarantine
  test('TC-41: Three prohibited actions automatically trip the Safety Circuit Breaker into QUARANTINE', async () => {
    await resetStore(); // Restores agent to NORMAL with 0 violations

    // 1st violation
    const v1 = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionName: 'read_affiliate_pii' })
    });
    assert.equal(v1.status, 403);

    // 2nd violation
    const v2 = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionName: 'export_customer_emails' })
    });
    assert.equal(v2.status, 403);

    // Verify still in NORMAL mode with 2 violations
    const midStatusRes = await fetch(`${BASE_URL}/containment/status`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const midStatus = await midStatusRes.json();
    assert.equal(midStatus.data.containmentMode, 'NORMAL');
    assert.equal(midStatus.circuitBreaker.currentViolations, 2);

    // 3rd violation -> Trips Circuit Breaker!
    const v3 = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionName: 'read_affiliate_pii' })
    });
    assert.equal(v3.status, 403);

    // Verify status is now automatically QUARANTINE
    const postStatusRes = await fetch(`${BASE_URL}/containment/status`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const postStatus = await postStatusRes.json();
    assert.equal(postStatus.data.containmentMode, 'QUARANTINE');
    assert.equal(postStatus.circuitBreaker.isTripped, true);
    assert.equal(postStatus.circuitBreaker.currentViolations, 3);

    // Verify proposal submission is now blocked by quarantine
    const propRes = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionName: 'propose_commission_adjustment',
        parameters: { targetAffiliateId: 'aff_bob', proposedRate: 16.0, reason: 'Blocked test' }
      })
    });
    assert.equal(propRes.status, 403);
    const propBody = await propRes.json();
    assert.equal(propBody.code, 'AGENT_QUARANTINED');
  });

  // TC-42: Authorized reset restores NORMAL mode
  test('TC-42: Authorized Admin reset clears circuit breaker and restores NORMAL mode (200 OK)', async () => {
    // Admin resets circuit breaker
    const resetRes = await fetch(`${BASE_URL}/containment/reset`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'Security team verified incident resolution and cleared breach logs'
      })
    });
    const resetBody = await resetRes.json();
    assert.equal(resetRes.status, 200);
    assert.equal(resetBody.success, true);
    assert.equal(resetBody.data.containmentMode, 'NORMAL');
    assert.equal(resetBody.data.circuitBreaker.currentViolations, 0);
    assert.equal(resetBody.data.circuitBreaker.isTripped, false);

    // MarketPulse proposal submission is now functional again
    const propRes = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionName: 'propose_commission_adjustment',
        parameters: { targetAffiliateId: 'aff_bob', proposedRate: 14.5, reason: 'Post reset proposal' }
      })
    });
    assert.equal(propRes.status, 202);
    const propBody = await propRes.json();
    assert.equal(propBody.outcome, 'QUEUED_FOR_APPROVAL');
  });

  // TC-43: State persists across server restarts
  test('TC-43: Containment state persists across simulated server restart', async () => {
    // 1. Admin engages kill switch
    await fetch(`${BASE_URL}/containment/kill-switch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ engage: true, reason: 'Persistence test termination' })
    });

    // 2. Restart backend server
    await stopServer();
    await startServer(PORT);

    // 3. Status must still be TERMINATED
    const statusRes = await fetch(`${BASE_URL}/containment/status`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const statusBody = await statusRes.json();
    assert.equal(statusBody.data.containmentMode, 'TERMINATED');
    assert.equal(statusBody.data.killSwitchEngaged, true);
    assert.equal(statusBody.data.lastTransition.reason, 'Persistence test termination');

    // 4. Agent requests must still be blocked by 503
    const agentRes = await fetch(`${BASE_URL}/reports/aggregate-stats`, {
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(agentRes.status, 503);

    // Clean up: Reset store for following tests/suite clean exit
    await resetStore();
  });

  // TC-44: Every transition is recorded in the audit log
  test('TC-44: Containment audit log records state transitions and administrative actions', async () => {
    // Trigger known containment transitions
    await fetch(`${BASE_URL}/containment/kill-switch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ engage: true, reason: 'Audit drill engagement' })
    });

    await fetch(`${BASE_URL}/containment/reset`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Audit drill reset' })
    });

    const auditRes = await fetch(`${BASE_URL}/containment/audit`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    assert.equal(auditRes.status, 200);
    const auditBody = await auditRes.json();
    assert.ok(Array.isArray(auditBody.data));

    const eventTypes = auditBody.data.map(e => e.eventType);
    assert.ok(eventTypes.includes('KILL_SWITCH_ENGAGED'), 'Must record KILL_SWITCH_ENGAGED');
    assert.ok(eventTypes.includes('CIRCUIT_BREAKER_RESET'), 'Must record CIRCUIT_BREAKER_RESET');
  });

  // TC-45: Audit logs cannot be modified through an unauthorized API
  test('TC-45: Containment audit log cannot be modified, replaced or deleted through API (404 Not Found)', async () => {
    // Attempting PUT on audit log returns 404
    const putRes = await fetch(`${BASE_URL}/containment/audit`, {
      method: 'PUT',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: [] })
    });
    assert.equal(putRes.status, 404);

    // Attempting DELETE on audit log returns 404
    const delRes = await fetch(`${BASE_URL}/containment/audit`, {
      method: 'DELETE',
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    assert.equal(delRes.status, 404);

    // Attempting POST directly on audit log returns 404
    const postRes = await fetch(`${BASE_URL}/containment/audit`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ eventType: 'FORGED_EVENT' })
    });
    assert.equal(postRes.status, 404);

    // Reset store to return environment to clean seed state
    await resetStore();
  });

  // TC-46: Redundant kill switch activation returns 400 ALREADY_ENGAGED without duplicate audit
  test('TC-46: Redundant kill switch activation returns 400 ALREADY_ENGAGED without duplicate audit', async () => {
    await resetStore();
    // 1. Engage kill switch
    const engageRes1 = await fetch(`${BASE_URL}/containment/kill-switch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ engage: true, reason: 'Initial emergency drill' })
    });
    assert.equal(engageRes1.status, 200);

    // 2. Count audit records
    const auditRes1 = await fetch(`${BASE_URL}/containment/audit`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const audit1 = await auditRes1.json();
    const countBefore = audit1.data.length;

    // 3. Attempt redundant engagement
    const engageRes2 = await fetch(`${BASE_URL}/containment/kill-switch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ engage: true, reason: 'Redundant second engagement attempt' })
    });
    assert.equal(engageRes2.status, 400);
    const body2 = await engageRes2.json();
    assert.equal(body2.code, 'ALREADY_ENGAGED');

    // 4. Verify no duplicate audit was appended
    const auditRes2 = await fetch(`${BASE_URL}/containment/audit`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const audit2 = await auditRes2.json();
    assert.equal(audit2.data.length, countBefore, 'Audit log length must remain identical after rejected redundant engagement');
  });

  // TC-47: Kill switch deactivation records KILL_SWITCH_DISENGAGED in audit stream
  test('TC-47: Kill switch deactivation records KILL_SWITCH_DISENGAGED in audit stream', async () => {
    // Disengage kill switch with reason
    const disengageRes = await fetch(`${BASE_URL}/containment/kill-switch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ engage: false, reason: 'Security clearance verified by SecOps' })
    });
    assert.equal(disengageRes.status, 200);
    const disengageBody = await disengageRes.json();
    assert.equal(disengageBody.data.killSwitchEngaged, false);
    assert.equal(disengageBody.data.containmentMode, 'NORMAL');

    // Check audit stream
    const auditRes = await fetch(`${BASE_URL}/containment/audit`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const auditBody = await auditRes.json();
    const disengageLog = auditBody.data.find(l => l.eventType === 'KILL_SWITCH_DISENGAGED');
    assert.ok(disengageLog, 'Must record KILL_SWITCH_DISENGAGED event in audit stream');
    assert.equal(disengageLog.triggeredBy, 'usr_admin_alex');
    assert.equal(disengageLog.reason, 'Security clearance verified by SecOps');
  });

  // TC-48: Agent requests fail closed (HTTP 503 CONTAINMENT_STATE_INVALID) when state is unreadable
  test('TC-48: Agent requests fail closed (HTTP 503 CONTAINMENT_STATE_INVALID) when state is unreadable', async () => {
    // Simulate corrupt state by clearing in-memory containment state for the agent
    const states = getAllContainmentStates();
    const originalSparkState = states.usr_agent_spark;
    delete states.usr_agent_spark;

    try {
      const res = await fetch(`${BASE_URL}/reports/aggregate-stats`, {
        headers: { 'x-demo-user-id': 'usr_agent_spark' }
      });
      const body = await res.json();
      assert.equal(res.status, 503);
      assert.equal(body.code, 'CONTAINMENT_STATE_INVALID');
      assert.equal(body.success, false);
    } finally {
      // Restore valid state
      states.usr_agent_spark = originalSparkState;
    }
  });

  // TC-49: Queued proposals cannot be executed by agent; proposal submissions blocked in QUARANTINE
  test('TC-49: Queued proposals cannot be executed by agent; proposal submissions blocked in QUARANTINE', async () => {
    await resetStore();

    // 1. Submit proposal while NORMAL
    const propRes = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionName: 'propose_commission_adjustment',
        parameters: { targetAffiliateId: 'aff_alice', proposedRate: 15.5, reason: 'Pending proposal test' }
      })
    });
    assert.equal(propRes.status, 202);
    const propData = await propRes.json();
    const proposalId = propData.proposal.id;

    // 2. Admin shifts agent to QUARANTINE
    await fetch(`${BASE_URL}/containment/mode`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mode: 'QUARANTINE', reason: 'Audit hold' })
    });

    // 3. Agent attempts to approve its own proposal -> Blocked by RBAC and containment
    const agentApproveRes = await fetch(`${BASE_URL}/governance/proposals/${proposalId}/approve`, {
      method: 'POST',
      headers: { 'x-demo-user-id': 'usr_agent_spark' }
    });
    assert.equal(agentApproveRes.status, 403);

    // 4. Agent attempts new proposal while quarantined -> Blocked with 403 AGENT_QUARANTINED
    const newPropRes = await fetch(`${BASE_URL}/governance/dispatch`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_agent_spark',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionName: 'propose_commission_adjustment',
        parameters: { targetAffiliateId: 'aff_bob', proposedRate: 14.0, reason: 'Blocked quarantine attempt' }
      })
    });
    assert.equal(newPropRes.status, 403);
    const newPropBody = await newPropRes.json();
    assert.equal(newPropBody.code, 'AGENT_QUARANTINED');

    // 5. Rate remains unchanged until human admin explicitly approves
    const affCheck = await fetch(`${BASE_URL}/affiliates/aff_alice`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const affData = await affCheck.json();
    assert.notEqual(affData.data.commissionRate, 15.5, 'Rate must not update without administrator approval');
  });

  // TC-50: Beyond-threshold violation accumulation is safely recorded without state divergence
  test('TC-50: Violations beyond threshold (e.g. 5 attempts) are tracked safely without breaking circuit breaker state', async () => {
    await resetStore();

    // Send 5 prohibited attempts
    for (let i = 1; i <= 5; i++) {
      const res = await fetch(`${BASE_URL}/governance/dispatch`, {
        method: 'POST',
        headers: {
          'x-demo-user-id': 'usr_agent_spark',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ actionName: 'read_affiliate_pii' })
      });
      assert.equal(res.status, 403);
    }

    // Status must accurately reflect 5 violations, tripped = true, mode = QUARANTINE
    const statusRes = await fetch(`${BASE_URL}/containment/status`, {
      headers: { 'x-demo-user-id': 'usr_admin_alex' }
    });
    const statusBody = await statusRes.json();
    assert.equal(statusBody.data.containmentMode, 'QUARANTINE');
    assert.equal(statusBody.circuitBreaker.currentViolations, 5);
    assert.equal(statusBody.circuitBreaker.isTripped, true);

    // Resetting restores violations to 0 and mode to NORMAL
    const resetRes = await fetch(`${BASE_URL}/containment/reset`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': 'usr_admin_alex',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Admin cleared elevated violation count' })
    });
    assert.equal(resetRes.status, 200);
    const resetBody = await resetRes.json();
    assert.equal(resetBody.data.circuitBreaker.currentViolations, 0);
    assert.equal(resetBody.data.containmentMode, 'NORMAL');

    await resetStore();
  });
});

