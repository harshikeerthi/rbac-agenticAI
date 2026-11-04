import React from 'react';
import { Grid, Check, X, Shield, Lock } from 'lucide-react';

export default function RbacMatrixView({ currentUser }) {
  const activeRole = currentUser?.role || 'admin';

  const matrixRows = [
    {
      operation: 'List Affiliates',
      endpoint: 'GET /api/affiliates',
      permission: 'affiliates:read:*',
      admin: { allowed: true, scope: 'Global (All 3)' },
      manager: { allowed: true, scope: 'Assigned Only (2)' },
      affiliate: { allowed: true, scope: 'Own Record Only (1)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      operation: 'Get Affiliate Details',
      endpoint: 'GET /api/affiliates/:id',
      permission: 'affiliates:read:*',
      admin: { allowed: true, scope: 'Any ID' },
      manager: { allowed: true, scope: 'Assigned ID Only' },
      affiliate: { allowed: true, scope: 'Own ID Only' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      operation: 'Create Affiliate Partner',
      endpoint: 'POST /api/affiliates',
      permission: 'affiliates:create',
      admin: { allowed: true, scope: 'Global Creation' },
      manager: { allowed: false, scope: 'Blocked (403)' },
      affiliate: { allowed: false, scope: 'Blocked (403)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      operation: 'Update Affiliate Profile',
      endpoint: 'PUT /api/affiliates/:id',
      permission: 'affiliates:update:*',
      admin: { allowed: true, scope: 'All Fields' },
      manager: { allowed: true, scope: 'Notes & Status (Assigned)' },
      affiliate: { allowed: true, scope: 'Website Only (Own)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      operation: 'Modify Commission Rate',
      endpoint: 'PUT /api/affiliates/:id (rate)',
      permission: 'Field Protection',
      admin: { allowed: true, scope: 'Authorized' },
      manager: { allowed: false, scope: 'Blocked (403 RESTRICTED_FIELD)' },
      affiliate: { allowed: false, scope: 'Blocked (403 RESTRICTED_FIELD)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      operation: 'Delete Affiliate',
      endpoint: 'DELETE /api/affiliates/:id',
      permission: 'affiliates:delete',
      admin: { allowed: true, scope: 'Global Deletion' },
      manager: { allowed: false, scope: 'Blocked (403)' },
      affiliate: { allowed: false, scope: 'Blocked (403)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      operation: 'View Commission Ledgers',
      endpoint: 'GET /api/commissions',
      permission: 'commissions:read:*',
      admin: { allowed: true, scope: 'All Transactions' },
      manager: { allowed: true, scope: 'Assigned Team Only' },
      affiliate: { allowed: true, scope: 'Own Payouts Only' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      operation: 'Approve Payout Batch',
      endpoint: 'POST /api/commissions/:id/approve',
      permission: 'commissions:approve',
      admin: { allowed: true, scope: 'Authorized' },
      manager: { allowed: false, scope: 'Blocked (403)' },
      affiliate: { allowed: false, scope: 'Blocked (403)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      operation: 'Query Aggregate Stats',
      endpoint: 'GET /api/reports/aggregate-stats',
      permission: 'reports:read:aggregate',
      admin: { allowed: true, scope: 'Platform Aggregates' },
      manager: { allowed: true, scope: 'Platform Aggregates' },
      affiliate: { allowed: false, scope: 'Blocked (403)' },
      agent: { allowed: true, scope: 'Zero PII Aggregates' }
    },
    {
      operation: 'View Decision Audit Stream',
      endpoint: 'GET /api/activity',
      permission: 'activity:read',
      admin: { allowed: true, scope: 'Global Audit Trail' },
      manager: { allowed: true, scope: 'Global Audit Trail' },
      affiliate: { allowed: false, scope: 'Blocked (403)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    },
    {
      operation: 'Dispatch Agent Action',
      endpoint: 'POST /api/governance/dispatch',
      permission: 'governance:execute',
      admin: { allowed: true, scope: 'Global Dispatch' },
      manager: { allowed: false, scope: 'Blocked (403)' },
      affiliate: { allowed: false, scope: 'Blocked (403)' },
      agent: { allowed: true, scope: 'Policy Guarded' }
    },
    {
      operation: 'Manage Policies & HITL Review',
      endpoint: 'GET/POST /api/governance/*',
      permission: 'governance:admin',
      admin: { allowed: true, scope: 'Full Oversight' },
      manager: { allowed: false, scope: 'Blocked (403)' },
      affiliate: { allowed: false, scope: 'Blocked (403)' },
      agent: { allowed: false, scope: 'Blocked (403)' }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Grid size={20} className="text-indigo-400" />
            Live RBAC & Least-Privilege Permission Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Authoritative mapping of operations, endpoints, and data scopes enforced by the Express server.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Current Role Highlighted:</span>
          <span className="badge badge-admin uppercase font-mono">{activeRole}</span>
        </div>
      </div>

      <div className="panel overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-300 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Operation & Route</th>
                <th className="p-3.5">Required Permission</th>
                <th className={`p-3.5 text-center ${activeRole === 'admin' ? 'bg-purple-950/40 text-purple-200' : ''}`}>
                  Admin
                </th>
                <th className={`p-3.5 text-center ${activeRole === 'affiliate_manager' ? 'bg-blue-950/40 text-blue-200' : ''}`}>
                  Manager
                </th>
                <th className={`p-3.5 text-center ${activeRole === 'affiliate_user' ? 'bg-emerald-950/40 text-emerald-200' : ''}`}>
                  Affiliate
                </th>
                <th className={`p-3.5 text-center ${activeRole === 'ai_agent' ? 'bg-amber-950/40 text-amber-200' : ''}`}>
                  AI Agent
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {matrixRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-850/40 transition">
                  <td className="p-3.5">
                    <div className="font-bold text-white">{row.operation}</div>
                    <div className="font-mono text-[11px] text-indigo-300">{row.endpoint}</div>
                  </td>
                  <td className="p-3.5 font-mono text-slate-300 text-[11px]">
                    {row.permission}
                  </td>

                  {/* Admin Cell */}
                  <td className={`p-3.5 text-center ${activeRole === 'admin' ? 'bg-purple-950/20' : ''}`}>
                    <div className="flex flex-col items-center gap-1">
                      {row.admin.allowed ? (
                        <Check size={16} className="text-emerald-400" />
                      ) : (
                        <X size={16} className="text-rose-400" />
                      )}
                      <span className="text-[10px] text-slate-400">{row.admin.scope}</span>
                    </div>
                  </td>

                  {/* Manager Cell */}
                  <td className={`p-3.5 text-center ${activeRole === 'affiliate_manager' ? 'bg-blue-950/20' : ''}`}>
                    <div className="flex flex-col items-center gap-1">
                      {row.manager.allowed ? (
                        <Check size={16} className="text-emerald-400" />
                      ) : (
                        <X size={16} className="text-rose-400" />
                      )}
                      <span className="text-[10px] text-slate-400">{row.manager.scope}</span>
                    </div>
                  </td>

                  {/* Affiliate Cell */}
                  <td className={`p-3.5 text-center ${activeRole === 'affiliate_user' ? 'bg-emerald-950/20' : ''}`}>
                    <div className="flex flex-col items-center gap-1">
                      {row.affiliate.allowed ? (
                        <Check size={16} className="text-emerald-400" />
                      ) : (
                        <X size={16} className="text-rose-400" />
                      )}
                      <span className="text-[10px] text-slate-400">{row.affiliate.scope}</span>
                    </div>
                  </td>

                  {/* AI Agent Cell */}
                  <td className={`p-3.5 text-center ${activeRole === 'ai_agent' ? 'bg-amber-950/20' : ''}`}>
                    <div className="flex flex-col items-center gap-1">
                      {row.agent.allowed ? (
                        <Check size={16} className="text-emerald-400" />
                      ) : (
                        <X size={16} className="text-rose-400" />
                      )}
                      <span className="text-[10px] text-slate-400">{row.agent.scope}</span>
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

