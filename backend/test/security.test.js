import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer } from '../src/server.js';
import { resetStore } from '../src/store.js';

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
});

