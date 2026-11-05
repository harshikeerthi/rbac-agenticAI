import React, { useState } from 'react';
import {
  DollarSign,
  CheckCircle,
  Clock,
  Lock,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { approveCommission } from '../api';

export default function CommissionsView({
  commissions = [],
  currentUser,
  onRefresh,
  onNotify
}) {
  const [loadingId, setLoadingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
      <div className="panel p-8 text-center max-w-2xl mx-auto space-y-4 bg-white border border-rose-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">403 Forbidden: Financial Ledgers Inaccessible</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          The <strong>MarketPulse AI Agent</strong> is constrained by the principle of least privilege and cannot view raw commission payouts or financial ledger rows.
        </p>
        <div className="bg-slate-900 text-white rounded-xl p-4 text-left font-mono text-xs space-y-1">
          <div className="text-rose-400 font-bold">HTTP Status: 403 Forbidden</div>
          <div className="text-slate-300">Error Code: INSUFFICIENT_PERMISSIONS</div>
          <div className="text-slate-400">Missing: [commissions:read:all OR commissions:read:assigned OR commissions:read:own]</div>
        </div>
      </div>
    );
  }

  // Filter commissions
  const filteredCommissions = commissions.filter(comm => {
    const matchesSearch = searchQuery.trim() === '' ||
      (comm.id && comm.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (comm.affiliateName && comm.affiliateName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (comm.affiliateId && comm.affiliateId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || comm.status?.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);
  const pendingCount = filteredCommissions.filter(c => c.status !== 'paid').length;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
            <DollarSign size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Commission Management</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                MODULE 1
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin && 'Platform-wide financial ledger. Authorization required to approve payouts.'}
              {isManager && 'Displaying commission payouts for your assigned affiliate team only.'}
              {isAffiliate && 'Displaying your verified earned commission payouts and status.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-right">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Total In View</span>
            <span className="text-sm sm:text-base font-extrabold text-emerald-700">
              ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by transaction ID or partner..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
          >
            <option value="ALL">All Statuses ({commissions.length})</option>
            <option value="PENDING">Pending Approval</option>
            <option value="PAID">Paid / Completed</option>
          </select>
        </div>
      </div>

      {/* Financial Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200 tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Transaction ID</th>
                <th className="p-3.5">Affiliate Partner</th>
                <th className="p-3.5">Period</th>
                <th className="p-3.5">Payout Amount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Approved By</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Receipt size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No commission records found</p>
                    <p className="text-xs text-slate-400 mt-1">No transactions match your current filters and portfolio scope.</p>
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-mono text-slate-600 font-semibold">{comm.id}</td>
                    <td className="p-3.5 font-bold text-slate-900">
                      {comm.affiliateName || comm.affiliateId}
                    </td>
                    <td className="p-3.5 text-slate-600">{comm.period}</td>
                    <td className="p-3.5 font-extrabold text-emerald-700 text-sm">
                      ${comm.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5">
                      <span className={`badge ${comm.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                        {comm.status === 'paid' ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {comm.status}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">
                      {comm.approvedBy || <span className="text-slate-400 italic">Pending</span>}
                    </td>
                    <td className="p-3.5 text-right">
                      {comm.status === 'paid' ? (
                        <span className="text-xs text-slate-400 font-medium flex items-center justify-end gap-1">
                          <CheckCircle2 size={14} className="text-emerald-600" /> Settled
                        </span>
                      ) : isAdmin ? (
                        <button
                          onClick={() => handleApprove(comm.id)}
                          disabled={loadingId === comm.id}
                          className="btn-primary text-xs py-1 px-3 ml-auto"
                        >
                          {loadingId === comm.id ? 'Approving...' : 'Approve Payout'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 flex items-center justify-end gap-1" title="commissions:approve permission required">
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
