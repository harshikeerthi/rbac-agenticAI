import React from 'react';
import { Grid, Check, X, Shield, Lock, CheckCircle2, XCircle } from 'lucide-react';

export default function RbacMatrixView({ currentUser }) {
  const activeRole = currentUser?.role || 'admin';

  const matrixRows = [
    {
      category: 'Affiliate Directory',
      operation: 'List Affiliates',
      endpoint: 'GET /api/affiliates',
      permission: 'affiliates:read:*',
      admin: { allowed: true, scope: 'Global (All 3)' },
      manager: { allowed: true, scope: 'Assigned Only (2)' },
      affiliate: { allowed: true, scope: 'Own Record Only (1)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      category: 'Affiliate Directory',
      operation: 'Get Affiliate Details',
      endpoint: 'GET /api/affiliates/:id',
      permission: 'affiliates:read:*',
      admin: { allowed: true, scope: 'Any ID' },
      manager: { allowed: true, scope: 'Assigned ID Only' },
      affiliate: { allowed: true, scope: 'Own ID Only' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      category: 'Affiliate Directory',
      operation: 'Create Affiliate Partner',
      endpoint: 'POST /api/affiliates',
      permission: 'affiliates:create',
      admin: { allowed: true, scope: 'Global Creation' },
      manager: { allowed: false, scope: 'Blocked (403)' },
      affiliate: { allowed: false, scope: 'Blocked (403)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      category: 'Affiliate Directory',
      operation: 'Update Affiliate Profile',
      endpoint: 'PUT /api/affiliates/:id',
      permission: 'affiliates:update:*',
      admin: { allowed: true, scope: 'All Fields' },
      manager: { allowed: true, scope: 'Notes & Status (Assigned)' },
      affiliate: { allowed: true, scope: 'Website Only (Own)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      category: 'Affiliate Directory',
      operation: 'Modify Commission Rate',
      endpoint: 'PUT /api/affiliates/:id (rate)',
      permission: 'Field Protection',
      admin: { allowed: true, scope: 'Authorized' },
      manager: { allowed: false, scope: 'Blocked (403 RESTRICTED_FIELD)' },
      affiliate: { allowed: false, scope: 'Blocked (403 RESTRICTED_FIELD)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      category: 'Affiliate Directory',
      operation: 'Delete Affiliate Account',
      endpoint: 'DELETE /api/affiliates/:id',
      permission: 'affiliates:delete',
      admin: { allowed: true, scope: 'Global Deletion' },
      manager: { allowed: false, scope: 'Blocked (403)' },
      affiliate: { allowed: false, scope: 'Blocked (403)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      category: 'Commissions & Finance',
      operation: 'View Commission Ledgers',
      endpoint: 'GET /api/commissions',
      permission: 'commissions:read:*',
      admin: { allowed: true, scope: 'All Transactions' },
      manager: { allowed: true, scope: 'Assigned Team Only' },
      affiliate: { allowed: true, scope: 'Own Payouts Only' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      category: 'Commissions & Finance',
      operation: 'Approve Payout Batch',
      endpoint: 'POST /api/commissions/:id/approve',
      permission: 'commissions:approve',
      admin: { allowed: true, scope: 'Authorized' },
      manager: { allowed: false, scope: 'Blocked (403)' },
      affiliate: { allowed: false, scope: 'Blocked (403)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      category: 'AI Telemetry & Reports',
      operation: 'Query Aggregate Stats',
      endpoint: 'GET /api/reports/aggregate-stats',
      permission: 'reports:read:aggregate',
      admin: { allowed: true, scope: 'Platform Aggregates' },
      manager: { allowed: true, scope: 'Platform Aggregates' },
      affiliate: { allowed: false, scope: 'Blocked (403)' },
      agent: { allowed: true, scope: 'Zero PII Aggregates' }
    },
    {
      category: 'Security & Audit',
      operation: 'View Decision Audit Stream',
      endpoint: 'GET /api/activity',
      permission: 'activity:read',
      admin: { allowed: true, scope: 'Global Audit Trail' },
      manager: { allowed: true, scope: 'Global Audit Trail' },
      affiliate: { allowed: false, scope: 'Blocked (403)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      category: 'AI Governance',
      operation: 'Dispatch Agent Action',
      endpoint: 'POST /api/governance/dispatch',
      permission: 'governance:execute',
      admin: { allowed: true, scope: 'Global Dispatch' },
      manager: { allowed: false, scope: 'Blocked (403)' },
      affiliate: { allowed: false, scope: 'Blocked (403)' },
      agent: { allowed: true, scope: 'Policy Guarded' }
    },
    {
      category: 'AI Governance',
      operation: 'Manage Policies & HITL Review',
      endpoint: 'GET/POST /api/governance/*',
      permission: 'governance:admin',
      admin: { allowed: true, scope: 'Full Oversight' },
      manager: { allowed: false, scope: 'Blocked (403)' },
      affiliate: { allowed: false, scope: 'Blocked (403)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      category: 'Security & Containment',
      operation: 'Engage Kill Switch / Set Mode',
      endpoint: 'POST /api/containment/*',
      permission: 'containment:manage',
      admin: { allowed: true, scope: 'Full Admin Control' },
      manager: { allowed: false, scope: 'Blocked (403)' },
      affiliate: { allowed: false, scope: 'Blocked (403)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
            <Grid size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">RBAC Permission Matrix</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                MODULE 1
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Authoritative mapping of operations, endpoints, and data scoping enforced independently by the Express backend.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Active Identity Highlighted:</span>
          <span className="badge badge-admin uppercase font-mono">{activeRole}</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Operation & HTTP Route</th>
                <th className="p-4">Required Permission</th>
                <th className={`p-4 text-center ${activeRole === 'admin' ? 'bg-purple-50 text-purple-900 border-x border-purple-200' : ''}`}>
                  Admin
                </th>
                <th className={`p-4 text-center ${activeRole === 'affiliate_manager' ? 'bg-sky-50 text-sky-900 border-x border-sky-200' : ''}`}>
                  Manager
                </th>
                <th className={`p-4 text-center ${activeRole === 'affiliate_user' ? 'bg-emerald-50 text-emerald-900 border-x border-emerald-200' : ''}`}>
                  Affiliate
                </th>
                <th className={`p-4 text-center ${activeRole === 'ai_agent' ? 'bg-purple-50 text-purple-900 border-x border-purple-200' : ''}`}>
                  AI Agent
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrixRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition">
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{row.operation}</div>
                    <div className="font-mono text-[11px] text-emerald-700 font-semibold">{row.endpoint}</div>
                  </td>
                  <td className="p-4 font-mono text-slate-600 text-[11px]">
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {row.permission}
                    </span>
                  </td>

                  {/* Admin Cell */}
                  <td className={`p-4 text-center ${activeRole === 'admin' ? 'bg-purple-50/40 border-x border-purple-100' : ''}`}>
                    <div className="flex flex-col items-center gap-1">
                      {row.admin.allowed ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <Check size={14} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                          <X size={14} />
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500 font-medium">{row.admin.scope}</span>
                    </div>
                  </td>

                  {/* Manager Cell */}
                  <td className={`p-4 text-center ${activeRole === 'affiliate_manager' ? 'bg-sky-50/40 border-x border-sky-100' : ''}`}>
                    <div className="flex flex-col items-center gap-1">
                      {row.manager.allowed ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <Check size={14} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                          <X size={14} />
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500 font-medium">{row.manager.scope}</span>
                    </div>
                  </td>

                  {/* Affiliate Cell */}
                  <td className={`p-4 text-center ${activeRole === 'affiliate_user' ? 'bg-emerald-50/40 border-x border-emerald-100' : ''}`}>
                    <div className="flex flex-col items-center gap-1">
                      {row.affiliate.allowed ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <Check size={14} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                          <X size={14} />
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500 font-medium">{row.affiliate.scope}</span>
                    </div>
                  </td>

                  {/* AI Agent Cell */}
                  <td className={`p-4 text-center ${activeRole === 'ai_agent' ? 'bg-purple-50/40 border-x border-purple-100' : ''}`}>
                    <div className="flex flex-col items-center gap-1">
                      {row.agent.allowed ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <Check size={14} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                          <X size={14} />
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500 font-medium">{row.agent.scope}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
