import React, { useState } from 'react';
import { DollarSign, CheckCircle, Clock, Lock, ShieldAlert } from 'lucide-react';
import { approveCommission } from '../api';

export default function CommissionsView({
  commissions,
  currentUser,
  onRefresh,
  onNotify
}) {
  const [loadingId, setLoadingId] = useState(null);

  const role = currentUser?.role || 'unauthenticated';
  const isAdmin = role === 'admin';
  const isManager = role === 'affiliate_manager';
  const isAffiliate = role === 'affiliate_user';
  const isAiAgent = role === 'ai_agent';

  const handleApprove = async (id) => {
    setLoadingId(id);
    const res = await approveCommission(id);
    setLoadingId(null);

    if (res.ok) {
      onNotify('success', `Commission payout [${id}] approved successfully.`);
      onRefresh();
    } else {
      onNotify('error', `${res.data.code || 'APPROVAL_FAILED'}: ${res.data.message}`);
    }
  };

  if (isAiAgent) {
    return (
      <div className="panel p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-950/60 border border-rose-800/80 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-lg font-bold text-white">403 Forbidden: Financial Ledgers Inaccessible</h3>
        <p className="text-sm text-slate-300">
          The <strong>MarketPulse AI Agent</strong> is restricted under Least Privilege and cannot view raw commission payouts.
        </p>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-left font-mono text-xs text-rose-300">
          <div>HTTP Status: 403 Forbidden</div>
          <div>Error Code: INSUFFICIENT_PERMISSIONS</div>
          <div>Missing Permission: [commissions:read:*]</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-400" />
            Commission Ledgers & Financial Payouts
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdmin && 'Platform-wide financial ledger. Admin authorization required to approve payouts.'}
            {isManager && 'Displaying commission payouts for your assigned affiliate team only.'}
            {isAffiliate && 'Displaying your personal earned commission payouts and approval status.'}
          </p>
        </div>
      </div>

      <div className="panel overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Transaction ID</th>
                <th className="p-3.5">Affiliate Partner</th>
                <th className="p-3.5">Period</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Approved By</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {commissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No commission transactions found in your scoped portfolio.
                  </td>
                </tr>
              ) : (
                commissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-slate-850/50 transition">
                    <td className="p-3.5 font-mono text-slate-300">{comm.id}</td>
                    <td className="p-3.5 font-semibold text-white">
                      {comm.affiliateName || comm.affiliateId}
                    </td>
                    <td className="p-3.5 text-slate-300">{comm.period}</td>
                    <td className="p-3.5 font-bold text-emerald-400 text-sm">
                      ${comm.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5">
                      <span className={`badge ${comm.status === 'paid' ? 'badge-success' : 'badge-agent'}`}>
                        {comm.status === 'paid' ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {comm.status}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">
                      {comm.approvedBy || 'Pending'}
                    </td>
                    <td className="p-3.5 text-right">
                      {comm.status === 'paid' ? (
                        <span className="text-xs text-slate-500 font-medium">Completed</span>
                      ) : isAdmin ? (
                        <button
                          onClick={() => handleApprove(comm.id)}
                          disabled={loadingId === comm.id}
                          className="btn-primary text-xs py-1 px-3"
                        >
                          {loadingId === comm.id ? 'Approving...' : 'Approve Payout'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 flex items-center justify-end gap-1" title="commissions:approve permission required">
                          <Lock size={12} /> Admin Only
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

