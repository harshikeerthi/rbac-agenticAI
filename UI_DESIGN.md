# UI/UX Design & User Experience Specification

**Project:** Affiliate Access Lab — RBAC and Least-Privilege Prototype  
**Phase:** Phase 3 — Design  
**Status:** Ready for Review & Approval  

---

## 1. Visual Design Philosophy & Layout Architecture

The user interface is designed to make **backend security decisions transparent and observable**. Rather than silently hiding elements, the UI clearly illustrates *why* access is granted or denied, contrasting client-side visibility with server-side enforcement.

### 1.1 Layout Wireframe

```
+----------------------------------------------------------------------------------------------------+
|  [Logo] AFFILIATE ACCESS LAB  |  SIMULATION ENVIRONMENT  | Active User: [ Sarah Jenkins (Manager) v] |
+----------------------------------------------------------------------------------------------------+
|  [ Dashboard ]  [ Affiliates ]  [ Commissions ]  [ AI Insights ]  [ Security Sandbox ]  [ Audit Log ]|
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [ Current Identity Banner ]                                                                       |
|  Logged in as: Sarah Jenkins | Role: Affiliate Manager | Assigned Scope: Team Alpha (2 Partners)   |
|  Granted Permissions: [affiliates:read:assigned] [affiliates:update:assigned] [reports:read:agg]  |
|                                                                                                    |
|  +-----------------------------------------------------------------------------------------------+ |
|  | ACTIVE SCREEN CONTENT (Changes dynamically based on selected tab and user role)               | |
|  |                                                                                               | |
|  +-----------------------------------------------------------------------------------------------+ |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
|  Footer: Node.js 24 + Express Backend (Port 5000) | Vite + React Frontend (Port 5173) | Zero Ext DB|
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Key Screen Specifications

### 2.1 Top Bar & Simulated Identity Switcher
- **Visual Design:** Dark obsidian background (`#0f172a`) with a bright contrasting banner:
  > `⚠️ SIMULATED IDENTITY ENVIRONMENT (Header: x-demo-user-id) — Not Production Authentication`
- **Identity Dropdown Options:**
  1. `Alex Carter` — **Admin** (Purple Badge)
  2. `Sarah Jenkins` — **Affiliate Manager [Alpha Team]** (Blue Badge)
  3. `David Kim` — **Affiliate Manager [Beta Team]** (Blue Badge)
  4. `Alice Rivera` — **Affiliate User [Publisher 1]** (Emerald Badge)
  5. `Bob Chen` — **Affiliate User [Publisher 2]** (Emerald Badge)
  6. `MarketPulse AI` — **Simulated AI Agent** (Amber Badge)
- **Immediate State Reaction:** Changing the dropdown instantly updates the client's HTTP header, clears stale state, re-queries `/api/me`, and refreshes the current view.

---

### 2.2 Screen 1: Dashboard / Overview
Adapts dynamically according to the active role:
- **Admin View:**
  - 4 Metric Cards: Total Affiliates (3), Gross Platform Sales (\$18,950), Pending Commission Approvals (2), Total System Events (42).
  - Quick action: "Add New Affiliate", "Review Pending Payouts".
- **Affiliate Manager View:**
  - 3 Metric Cards: Assigned Affiliates (2), Team Conversion Rate (5.8%), Team Pending Payouts (\$1,100).
  - Scoping notice: *"Showing only affiliates assigned to Sarah Jenkins (`usr_mgr_sarah`)."*
- **Affiliate User View:**
  - 3 Metric Cards: My Personal Earnings (\$12,750), My Total Clicks (14,200), My Current Commission Rate (15%).
  - My Referral Link Box: `https://brand.local/ref/ALICE-TECH-2026` with one-click copy.
- **Simulated AI Agent View:**
  - An automated service telemetry card:
    - Status: Autonomous Worker (Active).
    - Granted Scopes: Aggregate Statistics Only.
    - Personal Data Access: Blocked.

---

### 2.3 Screen 2: Affiliate Directory & Details
- **List View:**
  - Displays affiliate cards or a table with Name, Website, Manager, Commission Rate, and Actions.
  - **Admin:** Sees all 3 affiliates. "Add Affiliate" button is active.
  - **Manager Sarah:** Sees only Alice and Bob. "Add Affiliate" button is disabled with tooltip: *"Admin permission required: [affiliates:create]"*.
  - **Affiliate Alice:** Sees only Alice Rivera. Bob and Charlie are filtered out by the backend.
  - **AI Agent:** Sees a prominent Access Denied card: *"The AI Agent role does not have permission to view individual affiliate partner records."*
- **Detail & Edit Drawer:**
  - Click on an affiliate to open their profile.
  - Notes field: Editable by Admin and assigned Manager; read-only or hidden for the affiliate.
  - Commission rate: Editable strictly by Admin. Locked with a padlock icon for Managers and Affiliates.

---

### 2.4 Screen 3: Commission Ledgers & Payout Approvals
- Displays payout records: Affiliate Name, Month, Amount, Status (`paid` vs `pending`), and Action.
- **Approve Button:**
  - Active for **Admin**. Clicking issues `POST /api/commissions/:id/approve` and marks as paid.
  - Disabled or hidden for **Managers** and **Affiliates**.

---

### 2.5 Screen 4: Simulated AI Insights (Least-Privilege Demonstration)
- Demonstrates how autonomous agents can deliver business value safely without access to sensitive PII.
- **UI Structure:**
  - Top Card: **Data Pipeline Audit**
    - Query Sent: `GET /api/reports/aggregate-stats`
    - Payload Received: 5 aggregate numbers (Affiliate Count, Total Clicks, Conversions, Overall Avg Rate).
    - Blocked Fields: Names, Emails, Phone Numbers, Bank Accounts, Personal Tax IDs (All 0% exposed).
  - Bottom Card: **Simulated AI Synthesis**
    - Formats the aggregate numbers into an executive summary:
      > *"MarketPulse Analysis: Platform conversion health is strong at 5.37% across 25,400 user clicks. Category performance is led by Tech & Electronics."*
    - Note: *"Generated deterministically on the server from anonymized totals."*

---

### 2.6 Screen 5: Security Sandbox ("Tamper & Test" Playground)
The centerpiece for demonstrating and learning RBAC. Provides one-click buttons to simulate real-world attack vectors:

| Attack Vector Button | Simulated Request | Who Attempts It | Expected Result |
| :--- | :--- | :--- | :--- |
| **1. Privilege Escalation** | `POST /api/affiliates` | Affiliate User Alice | **403 Forbidden** (`INSUFFICIENT_PERMISSIONS`) |
| **2. Cross-Tenant Tampering (IDOR)** | `PUT /api/affiliates/aff_bob` | Affiliate User Alice | **403 Forbidden** (`OBJECT_OWNERSHIP_DENIED`) |
| **3. Portfolio Boundary Violation** | `GET /api/affiliates/aff_charlie` | Manager Sarah (Charlie belongs to David) | **403 Forbidden** (`OBJECT_ASSIGNMENT_DENIED`) |
| **4. AI Agent Data Exfiltration** | `GET /api/affiliates` | MarketPulse AI Agent | **403 Forbidden** (`INSUFFICIENT_PERMISSIONS`) |
| **5. Direct API Request (No Auth)** | Raw request without `x-demo-user-id` | Unauthenticated Client | **401 Unauthorized** (`MISSING_IDENTITY`) |

Each button sends a live HTTP request to the Express backend and displays:
- Raw Request URL & Method.
- Headers sent.
- Raw HTTP Status Code (`403 Forbidden`).
- Raw JSON Response Body with syntax highlighting.
- Clear educational explanation of why the backend rejected the attempt.

---

### 2.7 Screen 6: In-App Activity & Decision Log
- Displays a real-time table of all decisions made by the backend during the session.
- Columns: Timestamp, User, Role, HTTP Method, Target Path, Outcome (`ALLOWED` in green, `DENIED` in red), Reason.
- Filterable by: All, Allowed Only, Denied Only.
- Shows that every click in the UI or Security Sandbox leaves an auditable decision trail.

---

### 2.8 Screen 7: Interactive RBAC Matrix Reference
- An interactive reference table displaying the full matrix of Roles vs Permissions.
- Hovering over any cell highlights the active user's permissions in real time.

