# Affiliate Access Lab: RBAC & Agent Governance Platform

> An educational, standalone prototype demonstrating **Role-Based Access Control (RBAC)**, **Least-Privilege Authorization**, and **Agent Governance & Audit for Agentic AI**. Built from scratch with **React 18 + Vite**, **Node.js + Express**, and **local JSON file storage**.

---

## 1. Project Overview & Problem Statement

Modern SaaS applications are rapidly evolving from human-only interfaces to hybrid environments where human staff and autonomous AI agents collaborate. This shift introduces two distinct security challenges:

1. **Human Authorization (RBAC & Least Privilege)**: How do we prevent unauthorized data snooping, cross-tenant leaks (IDOR/BOLA), and unauthorized financial approvals among staff and partner users?
2. **AI Agent Governance & Audit**: When automated or agentic systems act within a business system, how do we guarantee they cannot exfiltrate sensitive partner data, make uncontrolled financial updates, or bypass human oversight?

**Affiliate Access Lab** addresses both challenges within a single, cohesive educational codebase organized into two independent modules:
- **Module 1**: Role-Based Access Control & Least Privilege (Core Human Authorization).
- **Module 2**: Agent Governance & Audit for Agentic AI (AI Action Policies, HITL Queues & Audit).

---

## 2. Module 1: RBAC & Least Privilege

Module 1 provides multi-tenant authorization for an affiliate marketing portal:

- **Canonical Demo Identities**:
  - `usr_admin_alex` (`admin`): Global platform access, partner creation, financial payout approvals.
  - `usr_mgr_sarah` & `usr_mgr_david` (`affiliate_manager`): Assigned portfolio scoping (Sarah manages Alice & Bob; David manages Charlie).
  - `usr_aff_alice`, `usr_aff_bob`, `usr_aff_charlie` (`affiliate_user`): Tenant-isolated partner dashboards.
  - `usr_agent_spark` (`ai_agent`): Strict least-privilege analytics (read-only aggregate statistics).
- **Security Safeguards**:
  - **Server-Side Role Resolution**: Identity is verified via `x-demo-user-id`, resolving authoritative permissions from `users.json` and `roles.json`. Client-supplied role claims are never trusted.
  - **Ownership & Boundary Guard**: Prevents cross-tenant snooping and manager portfolio leaks (`ownership.js`).
  - **Field-Level Protection**: Blocks non-admins from altering `commissionRate`, `assignedManagerId`, or `status`.
  - **Security Sandbox**: Interactive suite testing 7 real-world attack vectors.
  - **Decision Log**: Real-time audit stream of all access decisions (`activity_logs.json`).

📖 **Full Documentation**: [docs/rbac-module.md](docs/rbac-module.md)

---

## 3. Module 2: Agent Governance & Audit

Module 2 introduces enterprise governance for autonomous and agentic AI systems:

- **Dual-Layer Security Model**: Every agent request must pass through Layer 1 (RBAC permission check) and Layer 2 (Governance Policy Engine).
- **Three Demonstration Agent Actions**:
  1. `query_aggregate_metrics` (**Allowed**): Autonomous analytics; computed with zero personal information (PII).
  2. `propose_commission_adjustment` (**Requires Approval**): High-impact financial modification intercepted and queued for human review.
  3. `read_affiliate_pii` (**Prohibited**): Direct personal data exfiltration attempt blocked immediately with HTTP 403.
- **Human-in-the-Loop (HITL) Approval Queue**:
  - Admins review, approve, or reject pending agent proposals.
  - Revalidation checks: target partner existence, numeric boundary check ($1.0\%$ to $50.0\%$), duplicate execution prevention, and self-approval rejection.
- **Dedicated Append-Only Audit Stream**:
  - Captured in `agent_audit.json` separately from the Decision Log.
  - Protected from client modification or deletion through application APIs.

📖 **Full Documentation**: [docs/agent-governance-module.md](docs/agent-governance-module.md)

---

## 4. System Architecture & Request Pipeline

```
[Client (React + Vite)] ──► [x-demo-user-id]
                                    │
                                    ▼
┌────────────────────────────────────────────────────────┐
│ 1. auth.js: Resolves authoritative server role         │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. rbac.js: Verifies required permission (or 403)      │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
                ▼                        ▼
┌────────────────────────────┐ ┌─────────────────────────┐
│ Module 1: ownership.js     │ │ Module 2: governance.js │
│ (Tenant / Field Guards)    │ │ (Policy Evaluation)     │
└───────────────┬────────────┘ └─────────┬───────────────┘
                │                        │
                ▼                        ▼
┌────────────────────────────┐ ┌─────────────────────────┐
│ Module 1 Endpoints         │ │ Module 2 Endpoints      │
│ • /api/affiliates          │ │ • /api/governance/*     │
│ • /api/commissions         │ │   (/dispatch, /policies,│
│ • /api/reports/aggregate   │ │    /proposals, /audit)  │
│ • /api/activity            │ └─────────┬───────────────┘
└───────────────┬────────────┘           │
                │                        ▼
                ▼              ┌─────────────────────────┐
┌────────────────────────────┐ │ agent_audit.json        │
│ activity_logs.json         │ └─────────────────────────┘
└────────────────────────────┘
```

📖 **Full Architecture**: [docs/architecture.md](docs/architecture.md)

---

## 5. Technology Stack & Directory Structure

- **Frontend**: React 18, Vite 6, Tailwind CSS v3, Lucide React.
- **Backend**: Node.js v24 (Native ESM), Express 4, native CORS.
- **Storage**: Local JSON flat files (Zero external database required).
- **Testing**: Node.js native test runner (`node:test`, `node:assert/strict`).

```
affiliate-access-lab/
├── backend/
│   ├── data/
│   │   ├── activity_logs.json       # Module 1: General Decision Log
│   │   ├── affiliates.json          # Module 1: Affiliate partner records
│   │   ├── commissions.json         # Module 1: Commission ledger
│   │   ├── roles.json               # Canonical RBAC permissions
│   │   ├── users.json               # Seed demo identities
│   │   ├── agent_policies.json      # Module 2: Policy rules & boundaries
│   │   ├── agent_proposals.json     # Module 2: Pending/resolved HITL queue
│   │   └── agent_audit.json         # Module 2: Append-only agent audit stream
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.js              # Authentication & server role resolution
│   │   │   ├── ownership.js         # Row-level & field-level guards
│   │   │   ├── rbac.js              # requirePermission() middleware
│   │   │   └── governance.js        # Module 2: Policy evaluation engine
│   │   ├── routes/
│   │   │   ├── activity.js          # Module 1: Decision log endpoint
│   │   │   ├── affiliates.js        # Module 1: Scoped affiliates CRUD
│   │   │   ├── auth.js              # /api/me identity profile
│   │   │   ├── commissions.js       # Module 1: Commissions & payout approvals
│   │   │   ├── governance.js        # Module 2: Governance API endpoints
│   │   │   ├── reports.js           # Module 1: Aggregate stats endpoint
│   │   │   └── system.js            # POST /api/reset-data canonical reset
│   │   ├── server.js                # Express entrypoint
│   │   └── store.js                 # JSON file store & canonical reset helpers
│   └── test/
│       └── security.test.js         # Complete 33-test automated security suite
├── docs/
│   ├── rbac-module.md               # Module 1 detailed guide
│   ├── agent-governance-module.md   # Module 2 detailed guide
│   ├── architecture.md              # Technical design & data flows
│   └── testing.md                   # 33-test documentation & logs
├── frontend/
│   ├── src/
│   │   ├── api.js                   # Unified API client with identity injection
│   │   ├── App.jsx                  # Main application state & view routing
│   │   ├── components/
│   │   │   ├── ActivityLogView.jsx  # Module 1: Decision Log UI
│   │   │   ├── AffiliatesView.jsx   # Module 1: Partner management UI
│   │   │   ├── AgentGovernanceView.jsx # Module 2: Full Governance suite
│   │   │   ├── AiInsightsView.jsx   # Module 1: AI Summary UI
│   │   │   ├── CommissionsView.jsx  # Module 1: Ledger & Payouts UI
│   │   │   ├── DashboardView.jsx    # Module 1: Role Overview UI
│   │   │   ├── Navbar.jsx           # Module 1 / Module 2 Switcher & Nav
│   │   │   ├── RbacMatrixView.jsx   # Module 1 & 2: Live Permission Grid
│   │   │   └── SecuritySandboxView.jsx # Module 1: Attack simulator
│   │   ├── index.css                # Tailwind directives & theme
│   │   └── main.jsx                 # React root
│   └── package.json
└── package.json                     # Root orchestrator scripts
```

---

## 6. Quick Start & Execution Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node.js v24.13.0)
- **npm**: v9+ (tested on npm 11.6.2)

### Installation
From the root directory:
```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
cd ..
```

### Running the Application

Open two terminal windows:

#### Terminal 1: Start Backend (Port 5000)
```bash
npm start
```
*(or `npm run start:backend`)*

#### Terminal 2: Start Frontend (Port 5173 / 5174)
```bash
npm run dev
```
*(or `npm run start:frontend`)*

Open your browser at **`http://localhost:5173`**.

---

## 7. Running the Automated Test Suite

Run all 33 automated security tests:
```bash
npm test
```

### Verified Test Results (33 Passed / 0 Failed):
- **Tests TC-01 to TC-20**: Module 1 RBAC verbs, data scoping, manager assignments, field protections, financial approvals, AI aggregate isolation, and role spoofing prevention.
- **Tests TC-21 to TC-33**: Module 2 Agent governance dispatch, autonomous execution, proposal queuing, prohibited action blocking, admin approval, duplicate prevention, self-approval prevention, range validation, and audit stream integrity.

📖 **Full Test Documentation**: [docs/testing.md](docs/testing.md)

---

## 8. Limitations & Future Roadmap

- **Simulated Demo Identities**: Identity is transmitted via the demo header `x-demo-user-id`. In a production deployment, this must be replaced with cryptographically signed JWTs, secure HttpOnly session cookies, and multi-factor authentication (MFA).
- **Local File Persistence**: Data is persisted to local JSON flat files. Future production systems would migrate to PostgreSQL with Row-Level Security (RLS) while preserving the identical middleware interface.
- **Deterministic Agent**: MarketPulse simulates agentic behavior deterministically. Real LLM tool-calling can be plugged directly into `/api/governance/dispatch` without changing the governance architecture.

---

## 9. License
Educational prototype developed for studying enterprise RBAC and Agentic AI governance boundaries.
