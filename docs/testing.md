# Automated Test Suite Documentation

## Overview
The automated security suite is located in `backend/test/security.test.js`. It runs using Node.js's native test runner (`node:test`, `node:assert/strict`) without external testing frameworks.

- **Total Test Cases**: 33
- **Module 1 (RBAC & Platform Security)**: `TC-01` through `TC-20` (20 tests)
- **Module 2 (Agent Governance & Audit)**: `TC-21` through `TC-33` (13 tests)
- **Passing Status**: 33 passed, 0 failed, 0 skipped.

---

## 1. Test Suite Breakdown

### Module 1: RBAC & Least-Privilege Tests (`TC-01` to `TC-20`)

| Test ID | Test Name | Target Endpoint | Key Assertions |
| :--- | :--- | :--- | :--- |
| **TC-01** | Public Health Check | `GET /api/health` | Returns 200 OK, `status: 'healthy'` without authentication headers. |
| **TC-02** | Missing Identity Header | `GET /api/affiliates` | Returns 401 Unauthorized (`MISSING_IDENTITY`). |
| **TC-03** | Invalid Identity Header | `GET /api/affiliates` | Returns 401 Unauthorized (`INVALID_IDENTITY`) for unknown user IDs. |
| **TC-04** | Global Admin Scoping | `GET /api/affiliates` | Admin Alex sees all 3 affiliates across the platform. |
| **TC-05** | Manager Portfolio Scoping | `GET /api/affiliates` | Sarah Jenkins sees only Alice and Bob; Charlie Gomez is excluded. |
| **TC-06** | Affiliate Own-Record Scoping | `GET /api/affiliates` | Alice Rivera sees strictly her own profile (`aff_alice`). |
| **TC-07** | Admin Partner Creation | `POST /api/affiliates` | Returns 201 Created and persists new partner. |
| **TC-08** | Affiliate Creation Blocked | `POST /api/affiliates` | Alice Rivera receives 403 `INSUFFICIENT_PERMISSIONS`. |
| **TC-09** | Manager Creation Blocked | `POST /api/affiliates` | Sarah Jenkins receives 403 `INSUFFICIENT_PERMISSIONS`. |
| **TC-10** | Cross-Tenant Snooping Blocked | `GET /api/affiliates/aff_bob` | Alice inspecting Bob returns 403 `RESOURCE_ACCESS_DENIED`. |
| **TC-11** | Manager Boundary Breach | `GET /api/affiliates/aff_charlie` | Sarah inspecting David's partner returns 403 `ASSIGNMENT_VIOLATION`. |
| **TC-12** | Cross-Tenant Mutation Blocked | `PUT /api/affiliates/aff_bob` | Alice editing Bob's profile returns 403 `RESOURCE_ACCESS_DENIED`. |
| **TC-13** | Field Mutation Protection | `PUT /api/affiliates/aff_alice` | Alice altering `commissionRate` returns 403 `RESTRICTED_FIELD_UPDATE_DENIED`. |
| **TC-14** | Admin Payout Approval | `POST /api/commissions/:id/approve` | Admin approves payout -> 200 OK, `status: 'paid'`. |
| **TC-15** | Manager Payout Approval Blocked| `POST /api/commissions/:id/approve` | Sarah approving payout returns 403 `INSUFFICIENT_PERMISSIONS`. |
| **TC-16** | AI Agent Aggregate Analytics | `GET /api/reports/aggregate-stats` | MarketPulse reads aggregates -> 200 OK, `piiExposed: false`. |
| **TC-17** | AI Agent Directory Blocked | `GET /api/affiliates` | MarketPulse querying directory returns 403 `INSUFFICIENT_PERMISSIONS`. |
| **TC-18** | AI Agent Mutation Blocked | `POST /api/affiliates` | MarketPulse creating affiliate returns 403 `INSUFFICIENT_PERMISSIONS`. |
| **TC-19** | Body Role Spoofing Prevented | `POST /api/affiliates` | `{ role: 'admin' }` in body is ignored; server enforces real role (`affiliate_user`). |
| **TC-20** | In-App Decision Stream | `GET /api/activity` | Activity log records both `ALLOWED` and `DENIED` outcomes. |

---

### Module 2: Agent Governance & Audit Tests (`TC-21` to `TC-33`)

| Test ID | Test Name | Target Endpoint | Key Assertions |
| :--- | :--- | :--- | :--- |
| **TC-21** | Allowed Autonomous Action | `POST /api/governance/dispatch` | MarketPulse executes `query_aggregate_metrics` -> 200 OK, `outcome: 'EXECUTED'`, zero PII. |
| **TC-22** | High-Impact Action Interception | `POST /api/governance/dispatch` | MarketPulse executes `propose_commission_adjustment` -> 202 Accepted, `outcome: 'QUEUED_FOR_APPROVAL'`. Partner rate remains untouched. |
| **TC-23** | Prohibited Action Enforcement | `POST /api/governance/dispatch` | MarketPulse executes `read_affiliate_pii` -> 403 Forbidden, `code: 'POLICY_VIOLATION'`. |
| **TC-24** | Zero-Trust Unknown Actions | `POST /api/governance/dispatch` | Unlisted action returns 403 Forbidden (`POLICY_VIOLATION`). |
| **TC-25** | Admin Proposal Approval | `POST /api/governance/proposals/:id/approve`| Admin Alex approves pending proposal -> 200 OK, affiliate `commissionRate` updated, proposal marked `approved`. |
| **TC-26** | Duplicate Approval Blocked | `POST /api/governance/proposals/:id/approve`| Approving already resolved proposal returns 400 `PROPOSAL_ALREADY_RESOLVED`. |
| **TC-27** | Self-Approval Disallowed | `POST /api/governance/proposals/:id/approve`| MarketPulse cannot approve; proposal creator cannot self-approve (`SELF_APPROVAL_DISALLOWED`). |
| **TC-28** | Non-Admin Policy Isolation | `GET /api/governance/policies` | Managers, Affiliates, and Agent receive 403 `INSUFFICIENT_PERMISSIONS`. |
| **TC-29** | Non-Admin Review Blocking | `POST /api/governance/proposals/:id/approve`| Managers and Affiliates receive 403 `INSUFFICIENT_PERMISSIONS`. |
| **TC-30** | Full Audit Lifecycle Stream | `GET /api/governance/audit` | Dedicated audit log contains `EXECUTED`, `PROHIBITED`, `QUEUED_FOR_APPROVAL`, `APPROVED_BY_ADMIN`, and `REJECTED_BY_ADMIN`. |
| **TC-31** | Agent Least-Privilege Isolation| Multiple endpoints | Adding `governance:execute` did not grant direct data permissions (affiliates, commissions, payouts remain 403). |
| **TC-32** | Rate & Existence Validation | `POST /api/governance/dispatch` | Rates outside $[1.0\%, 50.0\%]$ return 400; non-existent affiliate returns 404. |
| **TC-33** | Rate & API Immutability | Multiple endpoints | Rejected proposal never modifies rate; `PUT`/`DELETE /governance/audit` return 404; role spoofing in body is rejected. |

---

## 2. Running the Test Suite

From the repository root:
```powershell
npm test
```

### Verification Output:
```
> node --test test/**/*.test.js

[Affiliate Access Lab] Backend listening on port 5055
▶ Security & RBAC Authorization Suite
  ✔ TC-01: Health check is public and returns 200 OK (58.35ms)
  ✔ TC-02: Missing identity header returns 401 MISSING_IDENTITY (9.38ms)
  ✔ TC-03: Invalid identity header returns 401 INVALID_IDENTITY (4.59ms)
  ✔ TC-04: Admin lists all affiliates across platform (Global scope) (5.21ms)
  ✔ TC-05: Affiliate Manager Sarah sees only assigned affiliates (Alice & Bob) (6.05ms)
  ✔ TC-06: Affiliate User Alice sees only her own record (5.19ms)
  ✔ TC-07: Admin creates new affiliate successfully (201 Created) (29.86ms)
  ✔ TC-08: Affiliate User Alice denied creation (403 INSUFFICIENT_PERMISSIONS) (6.12ms)
  ✔ TC-09: Affiliate Manager Sarah denied creation (403 INSUFFICIENT_PERMISSIONS) (4.68ms)
  ✔ TC-10: Affiliate Alice reading Bob is rejected (403 RESOURCE_ACCESS_DENIED) (4.17ms)
  ✔ TC-11: Manager Sarah reading unassigned Charlie is rejected (403 RESOURCE_ACCESS_DENIED) (2.62ms)
  ✔ TC-12: Affiliate Alice modifying Bob is rejected (403 RESOURCE_ACCESS_DENIED) (4.44ms)
  ✔ TC-13: Affiliate Alice modifying commissionRate is rejected (403 RESTRICTED_FIELD_UPDATE_DENIED) (6.25ms)
  ✔ TC-14: Admin approves commission payout (200 OK) (5.56ms)
  ✔ TC-15: Affiliate Manager Sarah approving payout is rejected (403 INSUFFICIENT_PERMISSIONS) (4.16ms)
  ✔ TC-16: Simulated AI Agent reads aggregate stats (200 OK, zero PII) (5.67ms)
  ✔ TC-17: Simulated AI Agent reading affiliate list is rejected (403 INSUFFICIENT_PERMISSIONS) (3.85ms)
  ✔ TC-18: Simulated AI Agent creating affiliate is rejected (403 INSUFFICIENT_PERMISSIONS) (4.67ms)
  ✔ TC-19: Body-level role spoofing is ignored; server enforces backend role (4.50ms)
  ✔ TC-20: In-App Activity Log records audit stream (Admin: 200 OK) (2.25ms)
  ✔ TC-21: MarketPulse can execute query_aggregate_metrics (200 OK / EXECUTED) (4.40ms)
  ✔ TC-22: MarketPulse submits propose_commission_adjustment and receives 202 QUEUED_FOR_APPROVAL (9.53ms)
  ✔ TC-23: MarketPulse attempting read_affiliate_pii receives 403 POLICY_VIOLATION (3.90ms)
  ✔ TC-24: Unknown agent actions are rejected by default (403 POLICY_VIOLATION) (2.98ms)
  ✔ TC-25: Authorised Admin approves valid proposal and commission rate updates (200 OK) (15.40ms)
  ✔ TC-26: Duplicate approval is rejected with 400 PROPOSAL_ALREADY_RESOLVED (2.00ms)
  ✔ TC-27: Self-approval is rejected (Agent cannot approve; creator cannot approve) (6.20ms)
  ✔ TC-28: Non-admin users cannot view policies or proposals (403 INSUFFICIENT_PERMISSIONS) (8.73ms)
  ✔ TC-29: Non-admin users cannot approve or reject proposals (403 INSUFFICIENT_PERMISSIONS) (5.01ms)
  ✔ TC-30: Agent governance audit records capture full lifecycle outcomes (20.85ms)
  ✔ TC-31: MarketPulse cannot directly access affiliate records or commission approval (8.62ms)
  ✔ TC-32: Invalid commission rates and invalid affiliate IDs are rejected (400 / 404) (4.00ms)
  ✔ TC-33: Rejected proposals never modify rates; duplicate execution is blocked; audit cannot be mutated (19.48ms)
[Affiliate Access Lab] Backend stopped.
✔ Security & RBAC Authorization Suite (313.26ms)
ℹ tests 33
ℹ suites 1
ℹ pass 33
ℹ fail 0
```
