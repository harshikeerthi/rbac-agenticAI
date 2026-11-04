# System Architecture & Technical Design

## Architecture Overview
Affiliate Access Lab is designed as an educational, zero-cloud prototype demonstrating **Role-Based Access Control (RBAC)** alongside **Agent Governance & Audit**. The architecture separates concerns between human role boundaries and autonomous agent guardrails while sharing a unified Express and React runtime.

---

## 1. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Client: React 18 + Vite (SPA)                         │
│  ┌───────────────────────────────┐     ┌──────────────────────────────────┐ │
│  │ Module 1: RBAC & Permissions  │     │ Module 2: Agent Governance       │ │
│  │ - Dashboard                   │     │ - Policies & Limits              │ │
│  │ - Affiliates Directory        │     │ - Agent Action Simulator         │ │
│  │ - Commissions Ledger          │     │ - Human-in-the-Loop Queue        │ │
│  │ - Security Sandbox (7 Attacks)│     │ - Dedicated Agent Audit Stream   │ │
│  │ - In-App Decision Log         │     └──────────────────────────────────┘ │
│  │ - RBAC Matrix View            │                                          │
│  └───────────────────────────────┘                                          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / JSON
                                       │ (Header: x-demo-user-id)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Backend: Node.js + Express Server                       │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 1. Simulated Auth Middleware (auth.js)                                │  │
│  │    • Resolves server-side role from users.json and roles.json         │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 2. RBAC Permission Guard (rbac.js)                                    │  │
│  │    • Evaluates req.user.permissions (INSUFFICIENT_PERMISSIONS -> 403) │  │
│  └───────────────────┬───────────────────────────────────┬───────────────┘  │
│                      │                                   │                  │
│                      ▼                                   ▼                  │
│  ┌─────────────────────────────────────┐ ┌────────────────────────────────┐ │
│  │ Module 1 Guardrails (ownership.js)  │ │ Module 2 Engine (governance.js)│ │
│  │ • Tenant isolation (Alice vs Bob)   │ │ • Policy evaluation            │ │
│  │ • Portfolio scoping (Sarah vs David)│ │ • HITL Interception & Queuing  │ │
│  │ • Field-level mutation protection   │ │ • Zero-trust fallback (403)    │ │
│  └───────────────────┬─────────────────┘ └────────────────┬───────────────┘ │
│                      │                                    │                 │
│                      ▼                                    ▼                 │
│  ┌─────────────────────────────────────┐ ┌────────────────────────────────┐ │
│  │ Module 1 Resource Handlers          │ │ Module 2 Governance Handlers   │ │
│  │ • /api/affiliates                   │ │ • /api/governance/dispatch     │ │
│  │ • /api/commissions                  │ │ • /api/governance/policies     │ │
│  │ • /api/reports/aggregate-stats      │ │ • /api/governance/proposals    │ │
│  │ • /api/activity                     │ │ • /api/governance/audit        │ │
│  └───────────────────┬─────────────────┘ └────────────────┬───────────────┘ │
│                      │                                    │                 │
│                      ▼                                    ▼                 │
│  ┌─────────────────────────────────────┐ ┌────────────────────────────────┐ │
│  │ Module 1 Data Store                 │ │ Module 2 Data Store            │ │
│  │ • affiliates.json                   │ │ • agent_policies.json          │ │
│  │ • commissions.json                  │ │ • agent_proposals.json         │ │
│  │ • activity_logs.json                │ │ • agent_audit.json             │ │
│  └─────────────────────────────────────┘ └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

- **Frontend**: React 18, Vite 6, Tailwind CSS v3, PostCSS, Lucide React icons.
- **Backend**: Node.js (v24 native ESM), Express 4, native CORS.
- **Storage**: Local JSON flat files with atomic read/write helpers and canonical seed recovery.
- **Testing**: Node.js native test runner (`node:test`, `node:assert/strict`).

---

## 3. Separation of Concerns Between Modules

| Capability | Module 1: RBAC & Least Privilege | Module 2: Agent Governance & Audit |
| :--- | :--- | :--- |
| **Primary Focus** | Human user permissions & resource boundaries | AI Agent action evaluation & human oversight |
| **Enforcement Layer** | `rbac.js` & `ownership.js` | `governance.js` policy evaluation engine |
| **Audit Log File** | `activity_logs.json` (General HTTP/RBAC events) | `agent_audit.json` (Dedicated agent telemetry) |
| **Admin Controls** | Create partners, payout approvals | Review & approve/reject agent proposals |
| **Agent Capabilities** | Read-only aggregate stats (`reports:read:aggregate`) | Dispatch action pipeline (`governance:execute`) |
| **Data Scope** | Row-level tenant isolation & manager assignments | Tool allowlists, rate bounds & HITL queues |

