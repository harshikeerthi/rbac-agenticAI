# REST API Specification & Endpoint Design

**Project:** Affiliate Access Lab — RBAC and Least-Privilege Prototype  
**Phase:** Phase 3 — Design  
**Status:** Ready for Review & Approval  

---

## 1. Global API Conventions

### Base URL
All API routes are served under the prefix:
`http://localhost:5000/api`

### Standard Headers
Every incoming request must include:
- `Content-Type: application/json`
- `x-demo-user-id: <user_id>` (e.g., `usr_admin_alex`, `usr_mgr_sarah`, `usr_aff_alice`, `usr_agent_spark`)

### Standard HTTP Status Codes
| Status Code | Meaning | When It Is Returned |
| :--- | :--- | :--- |
| **`200 OK`** | Success | Request succeeded and data payload is returned. |
| **`201 Created`** | Created | A new resource (e.g., affiliate partner) was created. |
| **`400 Bad Request`** | Validation Error | Missing required body fields or invalid parameter types. |
| **`401 Unauthorized`** | Authentication Failure | Missing or unrecognized `x-demo-user-id` header. |
| **`403 Forbidden`** | Authorization Failure | Valid identity, but role lacks required permission or fails ownership/assignment check. |
| **`404 Not Found`** | Resource Missing | The requested resource ID does not exist in local data. |

---

## 2. Standardized Response Formats

### 2.1 Success Response Wrapper
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requester": "usr_mgr_sarah",
    "role": "affiliate_manager",
    "timestamp": "2026-11-03T12:00:00.000Z"
  }
}
```

### 2.2 Standardized Denied Response Format (RBAC Permission Failure)
```json
{
  "success": false,
  "error": "Forbidden",
  "code": "INSUFFICIENT_PERMISSIONS",
  "message": "Access Denied: Missing required permission [affiliates:create]",
  "details": {
    "user": "usr_aff_alice",
    "role": "affiliate_user",
    "requiredPermission": "affiliates:create",
    "attemptedAction": "POST /api/affiliates"
  }
}
```

### 2.3 Standardized Denied Response Format (Data Ownership & Assignment Failure)
Standardized code: `RESOURCE_ACCESS_DENIED`
```json
{
  "success": false,
  "error": "Forbidden",
  "code": "RESOURCE_ACCESS_DENIED",
  "message": "Access Denied: You are not authorized to access record aff_bob",
  "details": {
    "user": "usr_aff_alice",
    "role": "affiliate_user",
    "reason": "OWNERSHIP_VIOLATION",
    "targetRecordId": "aff_bob",
    "attemptedAction": "GET /api/affiliates/aff_bob"
  }
}
```

### 2.4 Standardized Denied Response Format (Restricted Field Update Failure)
Standardized code: `RESTRICTED_FIELD_UPDATE_DENIED`
```json
{
  "success": false,
  "error": "Forbidden",
  "code": "RESTRICTED_FIELD_UPDATE_DENIED",
  "message": "Access Denied: You do not have permission to modify restricted field(s): [commissionRate, assignedManagerId]",
  "details": {
    "user": "usr_aff_alice",
    "role": "affiliate_user",
    "restrictedFields": ["commissionRate", "assignedManagerId"],
    "attemptedAction": "PUT /api/affiliates/aff_alice"
  }
}
```

---

## 3. Endpoints Specification

### 3.1 System & Identity Endpoints

#### `GET /api/health`
- **Purpose:** Health check to verify backend availability.
- **Required Permission:** Public (None).
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-11-03T12:00:00.000Z",
    "version": "1.0.0"
  }
  ```

#### `GET /api/me`
- **Purpose:** Resolves active identity, role, and granted permissions for the active `x-demo-user-id`.
- **Required Permission:** Authenticated demo identity.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "user": {
      "id": "usr_mgr_sarah",
      "name": "Sarah Jenkins",
      "email": "sarah.jenkins@platform.local",
      "role": "affiliate_manager",
      "permissions": [
        "affiliates:read:assigned",
        "affiliates:update:assigned",
        "commissions:read:assigned",
        "reports:read:aggregate",
        "activity:read"
      ]
    }
  }
  ```

#### `GET /api/users` & `GET /api/roles`
- **Purpose:** Supplies demo identities and role metadata for the UI switcher and permission matrix.
- **Required Permission:** Public (for prototype demonstration purposes).

#### `POST /api/reset-data`
- **Purpose:** Resets local JSON storage to initial seed values for fresh testing.
- **Required Permission:** `admin` role only.

---

### 3.2 Affiliates Management Endpoints

#### `GET /api/affiliates`
- **Purpose:** List affiliate records with automatic server-side data scoping.
- **Required Permission:** `affiliates:read:all` OR `affiliates:read:assigned` OR `affiliates:read:own`.
- **Data Scoping Rules:**
  - `admin` (`affiliates:read:all`) $\rightarrow$ Returns **all** affiliates in `affiliates.json`.
  - `affiliate_manager` (`affiliates:read:assigned`) $\rightarrow$ Returns only affiliates where `assignedManagerId === req.user.id`.
  - `affiliate_user` (`affiliates:read:own`) $\rightarrow$ Returns only the record where `userId === req.user.id`.
  - `ai_agent` $\rightarrow$ Has none of these permissions $\rightarrow$ Returns `403 Forbidden`.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "count": 2,
    "data": [
      {
        "id": "aff_alice",
        "userId": "usr_aff_alice",
        "name": "Alice Rivera",
        "website": "https://techreviews.com",
        "assignedManagerId": "usr_mgr_sarah",
        "status": "active",
        "commissionRate": 15.0,
        "referralCode": "ALICE-TECH-2026",
        "metrics": { "totalClicks": 14200, "totalConversions": 850, "totalEarnings": 12750.00 }
      }
    ]
  }
  ```

#### `GET /api/affiliates/:id`
- **Purpose:** Retrieve an individual affiliate's detailed profile.
- **Required Permission:** `affiliates:read:all` OR `affiliates:read:assigned` OR `affiliates:read:own`.
- **Data Ownership Rules:**
  - Admin $\rightarrow$ Can fetch any `:id`.
  - Manager $\rightarrow$ Allowed only if `target.assignedManagerId === req.user.id`. Otherwise `403 Forbidden`.
  - Affiliate $\rightarrow$ Allowed only if `target.userId === req.user.id`. Otherwise `403 Forbidden`.
  - AI Agent $\rightarrow$ Denied (`403 Forbidden`).

#### `POST /api/affiliates`
- **Purpose:** Register a new affiliate partner.
- **Required Permission:** `affiliates:create` (Admins only).
- **Request Body:**
  ```json
  {
    "name": "David Publisher",
    "email": "david@publish.org",
    "website": "https://publish.org",
    "assignedManagerId": "usr_mgr_sarah",
    "commissionRate": 12.0
  }
  ```
- **Responses:**
  - `201 Created` for Admin.
  - `403 Forbidden` for Manager, Affiliate User, or AI Agent.

#### `PUT /api/affiliates/:id`
- **Purpose:** Update an affiliate profile or notes.
- **Required Permission:** `affiliates:update:all` OR `affiliates:update:assigned` OR `affiliates:update:own`.
- **Field-Level Protection:**
  - **Admin:** Can update any field (status, commission rate, assigned manager, notes).
  - **Manager:** Can update `internalNotes` and `status` for *assigned* affiliates only. Cannot change `commissionRate` or `assignedManagerId`.
  - **Affiliate:** Can update only `website` and personal contact preferences. Cannot modify `commissionRate`, `status`, or `assignedManagerId`.
  - **AI Agent:** Denied (`403 Forbidden`).

#### `DELETE /api/affiliates/:id`
- **Purpose:** Terminate or delete an affiliate partner.
- **Required Permission:** `affiliates:delete` (Admins only).
- **Responses:**
  - `200 OK` for Admin.
  - `403 Forbidden` for all other roles.

---

### 3.3 Financial & Commission Endpoints

#### `GET /api/commissions`
- **Purpose:** Fetch commission payout records.
- **Required Permission:** `commissions:read:all` OR `commissions:read:assigned` OR `commissions:read:own`.
- **Scoping Rules:**
  - `admin` $\rightarrow$ Returns all commission records across all affiliates.
  - `affiliate_manager` $\rightarrow$ Returns commissions for assigned affiliates only.
  - `affiliate_user` $\rightarrow$ Returns only commissions belonging to `userId === req.user.id`.
  - `ai_agent` $\rightarrow$ Returns `403 Forbidden`.

#### `POST /api/commissions/:id/approve`
- **Purpose:** Approve a pending commission payout.
- **Required Permission:** `commissions:approve` (Admins only).
- **Responses:**
  - `200 OK` for Admin (sets status to `"paid"` and records `approvedBy: req.user.id`).
  - `403 Forbidden` for Managers, Affiliates, or AI Agent.

---

### 3.4 Aggregate Reporting & AI Agent Endpoint

#### `GET /api/reports/aggregate-stats`
- **Purpose:** Returns privacy-preserving, high-level summary statistics.
- **Required Permission:** `reports:read:aggregate`.
- **Allowed Roles:** `admin`, `affiliate_manager`, `ai_agent`. (Denied to `affiliate_user`).
- **Data Returned:**
  ```json
  {
    "success": true,
    "data": {
      "totalAffiliatesCount": 3,
      "totalActiveAffiliates": 2,
      "totalPlatformClicks": 25400,
      "totalPlatformConversions": 1365,
      "platformConversionRate": "5.37%",
      "totalGrossCommissionsPaid": 18950.00,
      "topPerformingCategory": "Tech & Electronics"
    },
    "privacyGuarantees": [
      "Zero personally identifiable information (PII) included.",
      "Zero individual affiliate earnings exposed.",
      "Strictly calculated mathematical aggregates."
    ]
  }
  ```

---

### 3.5 In-App Activity & Audit Endpoint

#### `GET /api/activity`
- **Purpose:** Fetches the real-time access decision stream.
- **Required Permission:** `activity:read` (`admin` and `affiliate_manager`).
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "count": 10,
    "data": [
      {
        "id": "act_101",
        "timestamp": "2026-11-03T12:05:00.000Z",
        "userId": "usr_aff_alice",
        "role": "affiliate_user",
        "method": "POST",
        "endpoint": "/api/affiliates",
        "outcome": "DENIED",
        "code": "INSUFFICIENT_PERMISSIONS",
        "reason": "Missing required permission [affiliates:create]"
      }
    ]
  }
  ```

