# Module 1: Role-Based Access Control (RBAC) & Least Privilege

## Overview
Module 1 implements an enterprise-grade, standalone **Role-Based Access Control (RBAC)** and **Least-Privilege** authorization system for an affiliate marketing platform. It enforces multi-tenant data isolation, portfolio manager scoping, field-level protections, and decision logging without relying on external databases or cloud identity providers.

---

## 1. Demo Actors & Canonical Roles

The platform provides five canonical identities across four distinct roles:

| Identity ID | Name | Role | Access Scope & Capabilities |
| :--- | :--- | :--- | :--- |
| **`usr_admin_alex`** | Alex Carter | `admin` | **Global Platform Scope.** Can inspect all affiliates, create partners, update all fields, approve financial commission payouts, and view the global audit stream. |
| **`usr_mgr_sarah`** | Sarah Jenkins | `affiliate_manager` | **Assigned Portfolio Only.** Manages Affiliates Alice (`aff_alice`) and Bob (`aff_bob`). Blocked from unassigned affiliate Charlie. Blocked from creating affiliates or approving payouts. |
| **`usr_mgr_david`** | David Kim | `affiliate_manager` | **Assigned Portfolio Only.** Manages Affiliate Charlie (`aff_charlie`). Blocked from Sarah's affiliates Alice and Bob. |
| **`usr_aff_alice`** | Alice Rivera | `affiliate_user` | **Own Record Only.** Can only view and update her own profile (`aff_alice`). Blocked from cross-tenant access to Bob Chen. Blocked from altering her own `commissionRate`. |
| **`usr_aff_bob`** | Bob Chen | `affiliate_user` | **Own Record Only.** Can only view and update his own profile (`aff_bob`). |
| **`usr_aff_charlie`** | Charlie Gomez | `affiliate_user` | **Own Record Only.** Can only view and update his own profile (`aff_charlie`). |
| **`usr_agent_spark`** | MarketPulse AI | `ai_agent` | **Least-Privilege Isolation.** Permitted access strictly to privacy-preserving mathematical aggregates (`reports:read:aggregate`). Denied all individual partner records, ledgers, and mutations. |

---

## 2. Server-Enforced Middleware Pipeline

```
[Incoming HTTP Request] ──► [x-demo-user-id Header]
                                     │
                                     ▼
                   ┌───────────────────────────────────┐
                   │ 1. auth.js: authenticateDemoUser   │
                   │    - Validates identity exists     │
                   │    - Resolves server-side role     │
                   │    - Hydrates req.user permissions │
                   └─────────────────┬─────────────────┘
                                     │ Pass
                                     ▼
                   ┌───────────────────────────────────┐
                   │ 2. rbac.js: requirePermission     │
                   │    - Verifies required permission  │
                   │    - Rejects with 403 on failure   │
                   └─────────────────┬─────────────────┘
                                     │ Pass
                                     ▼
                   ┌───────────────────────────────────┐
                   │ 3. ownership.js: Row & Field Guard│
                   │    - Scopes list queries          │
                   │    - Enforces portfolio boundaries │
                   │    - Rejects restricted field edits│
                   └─────────────────┬─────────────────┘
                                     │ Pass
                                     ▼
                   ┌───────────────────────────────────┐
                   │ 4. Route Handler & Decision Log   │
                   │    - Executes business logic       │
                   │    - Appends to activity_logs.json │
                   └───────────────────────────────────┘
```

### Key Security Safeguards
1. **Server-Side Role Resolution**: The backend never trusts a role provided by the client (e.g. in the request body). The user's role and permissions are looked up strictly from `users.json` and `roles.json` on the server.
2. **Row-Level Ownership**: Affiliates cannot read other affiliates (IDOR / BOLA prevention). Managers cannot inspect or edit affiliates assigned to another manager.
3. **Field-Level Protection**: The `enforceFieldSecurity` middleware inspects `req.body` and strictly blocks non-admins from modifying sensitive fields (`commissionRate`, `assignedManagerId`, `status`, `id`, `userId`), returning `403 RESTRICTED_FIELD_UPDATE_DENIED`.
4. **Financial Payout Guard**: Only Admins can execute `POST /api/commissions/:id/approve`. Managers receive `403 INSUFFICIENT_PERMISSIONS`.

---

## 3. Frontend Features in Module 1

- **Dashboard**: Role overview, quick metrics, permitted capability list, and identity switcher.
- **Affiliates Directory**: Server-scoped partner cards with real-time editing.
- **Commissions Ledger**: Transaction table with Admin payout approval controls.
- **AI Agent Summary**: Synthetic analytics demonstrating safe, zero-PII data exposure for AI agents.
- **Security Sandbox**: Interactive testing console executing 7 pre-built cyber attack scenarios:
  1. Privilege Escalation (Affiliate creating partner).
  2. Cross-Tenant Snooping (Alice inspecting Bob).
  3. Manager Boundary Violation (Sarah inspecting David's affiliate).
  4. Restricted Field Tampering (Alice altering her commission rate).
  5. AI Agent Data Exfiltration (MarketPulse querying affiliate list).
  6. Unauthenticated Direct API Request.
  7. Request Body Role Spoofing (`{ "role": "admin" }`).
- **Decision Log**: Real-time audit stream of all backend access decisions from `activity_logs.json`.
- **RBAC Matrix**: Live visual grid displaying the permission-to-endpoint mappings across all roles.

