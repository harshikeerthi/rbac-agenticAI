# Module 2: Agent Governance & Audit for Agentic AI

## Overview
While Role-Based Access Control (RBAC) answers **who** is allowed to call an API, **Agent Governance** answers **how autonomous agents make decisions, what tool actions they are permitted to execute, what boundaries constrain them, and when human oversight is mandatory**.

Module 2 provides a comprehensive, educational implementation of **Agent Governance & Audit**, featuring a Dual-Layer Security Model, Human-in-the-Loop (HITL) review queues, and an append-only audit stream.

---

## 1. Dual-Layer Defense Architecture

Every agent request must pass through two sequential security checkpoints:

```
[Simulated Agent Request: POST /api/governance/dispatch]
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│ LAYER 1: Existing RBAC Authorization (rbac.js)         │
│ • Validates x-demo-user-id                             │
│ • Checks if user has 'governance:execute'              │
│ • Rejects unauthorized callers with 403                │
└─────────────────────────┬──────────────────────────────┘
                          │ Pass
                          ▼
┌────────────────────────────────────────────────────────┐
│ LAYER 2: Governance Engine (governance.js)             │
│ • Loads agent_policies.json                            │
│ • Classifies requested action:                         │
│   - ALLOWED             ──► Executes immediately       │
│   - REQUIRES_APPROVAL   ──► Intercepts & queues (HITL) │
│   - PROHIBITED          ──► Terminated immediately     │
│   - UNKNOWN (Zero-Trust)──► Terminated immediately     │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│ Stamped into agent_audit.json (Append-Only Stream)     │
└────────────────────────────────────────────────────────┘
```

---

## 2. The Three Demonstration Agent Actions

| Action Name | Policy Classification | Behavior | HTTP Outcome |
| :--- | :---: | :--- | :--- |
| **`query_aggregate_metrics`** | **Allowed** | Low-risk mathematical analytics. The agent computes platform totals without exposing personal partner data. Executes autonomously. | `200 OK`<br>`outcome: "EXECUTED"` |
| **`propose_commission_adjustment`** | **Requires Approval** | High-impact financial modification. The agent cannot directly modify affiliate payouts. The change is intercepted and stored in `agent_proposals.json` for Admin review. | `202 Accepted`<br>`outcome: "QUEUED_FOR_APPROVAL"` |
| **`read_affiliate_pii`** | **Prohibited** | Direct partner contact data exfiltration attempt (names, emails, websites). Blocked immediately by policy. | `403 Forbidden`<br>`code: "POLICY_VIOLATION"` |

---

## 3. Human-in-the-Loop (HITL) Approval Workflow

When an agent proposes an action requiring approval, it is placed in the queue as `pending`. When Admin Alex reviews the proposal via `POST /api/governance/proposals/:id/approve`, the server performs **strict revalidations** before applying any changes:

1. **Role Authorization**: Approver must be an authorized Admin (`adminUser.role === 'admin'`).
2. **Self-Approval Prevention**: The entity that generated the proposal cannot approve it (`adminUser.id !== proposal.agentId`).
3. **Duplicate Prevention**: Status must be `pending`. If already approved or rejected, it is rejected with `400 PROPOSAL_ALREADY_RESOLVED`.
4. **Entity Validation**: The target affiliate must exist in `affiliates.json`.
5. **Safe Boundary Range**: The proposed commission rate must be numeric and within the hard safety range:
   $$\text{Commission Rate} \in [1.0\%, 50.0\%]$$
6. **Execution & Audit**: Once validated, the affiliate's rate in `affiliates.json` is updated, the proposal is marked `approved`, and an `APPROVED_BY_ADMIN` record is appended to `agent_audit.json`.

---

## 4. Protected Governance Audit Trail

- **Separation from Decision Log**: General HTTP/RBAC events are kept in `activity_logs.json`. Agent governance decisions are recorded exclusively in `agent_audit.json`.
- **Append-Only Protection**: The server exposes no `PUT` or `DELETE` endpoints for `agent_audit.json`. Records are generated solely through server-side logic and capped at 150 items to prevent unbounded file growth.
- **Audit Schema**:
  ```json
  {
    "id": "gaudit_1793772904644_abc12",
    "timestamp": "2026-11-04T12:00:00.000Z",
    "agentId": "usr_agent_spark",
    "actionName": "propose_commission_adjustment",
    "policyEvaluated": "HUMAN_IN_THE_LOOP_APPROVAL",
    "outcome": "APPROVED_BY_ADMIN",
    "details": "Admin usr_admin_alex approved commission adjustment for Alice Rivera from 15% to 18%.",
    "actorId": "usr_admin_alex",
    "reviewerId": "usr_admin_alex"
  }
  ```

---

## 5. API Endpoints

| Endpoint | Method | Permission | Purpose |
| :--- | :---: | :--- | :--- |
| `/api/governance/dispatch` | `POST` | `governance:execute` or `governance:admin` | Main execution gateway for agent actions |
| `/api/governance/policies` | `GET` | `governance:admin` | Inspect active policies and guardrails |
| `/api/governance/proposals` | `GET` | `governance:admin` | List proposals (optional `?status=pending`) |
| `/api/governance/proposals/:id/approve` | `POST` | `governance:admin` | Approve proposal and apply rate change |
| `/api/governance/proposals/:id/reject` | `POST` | `governance:admin` | Reject proposal with justification reason |
| `/api/governance/audit` | `GET` | `governance:admin` | Retrieve append-only agent audit stream |
