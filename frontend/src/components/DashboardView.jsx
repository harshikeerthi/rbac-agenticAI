import React from 'react';
import {
  ShieldCheck,
  Key,
  Users,
  DollarSign,
  TrendingUp,
  Lock,
  Copy,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function DashboardView({ currentUser, stats, affiliatesCount, commissionsCount }) {
  const [copied, setCopied] = React.useState(false);

  if (!currentUser) {
    return (
      <div className="panel p-12 text-center text-slate-400 space-y-3">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-medium text-slate-300">Loading authenticated identity profile from backend...</p>
        <p className="text-xs text-slate-500 font-mono">Querying GET /api/me with x-demo-user-id</p>
      </div>
    );
  }

  const role = currentUser.role;
  const permissions = currentUser.permissions || [];

  const handleCopyLink = (code) => {
    navigator.clipboard.writeText(`https://brand.local/ref/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Active Identity Hero Banner */}
      <div className="panel p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-indigo-900/40 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-xl shadow-inner">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{currentUser.name}</h2>
                <span className={`badge ${
                  role === 'admin' ? 'badge-admin' :
                  role === 'affiliate_manager' ? 'badge-manager' :
                  role === 'affiliate_user' ? 'badge-affiliate' : 'badge-agent'
                }`}>
                  {role}
                </span>
              </div>
              <p className="text-sm text-slate-400 font-mono">{currentUser.email} • ID: {currentUser.id}</p>
              <p className="text-xs text-indigo-300/80 mt-1">
                {role === 'admin' && '🌟 Global Administrator: Full platform visibility, tier editing, and payout authorization.'}
                {role === 'affiliate_manager' && '💼 Affiliate Manager: Responsible for assigned partner portfolio.'}
                {role === 'affiliate_user' && '🚀 Affiliate Partner: Publisher managing personal performance and payouts.'}
                {role === 'ai_agent' && '🤖 Simulated AI Analytical Worker: Operates strictly under Least Privilege (Aggregate Only).'}
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Server-Resolved Authorization</span>
            </div>
            <div className="text-xs font-mono text-emerald-400 mt-1 font-semibold">
              {permissions.length} Active Permission{permissions.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Granted Permissions Cloud */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Key size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Granted Server Permissions</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {permissions.map((perm) => (
              <span
                key={perm}
                className="font-mono text-[11px] px-2.5 py-1 rounded-md bg-slate-800/90 text-slate-200 border border-slate-700/80 shadow-sm"
              >
                {perm}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Role-Specific Metric Cards */}
      {role === 'admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="panel p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">Total Affiliates</span>
              <Users size={18} className="text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">{affiliatesCount || 3}</div>
            <p className="text-xs text-slate-400 mt-1">Platform-wide visibility</p>
          </div>
          <div className="panel p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">Total Clicks</span>
              <TrendingUp size={18} className="text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats ? stats.totalPlatformClicks : '25,400'}</div>
            <p className="text-xs text-slate-400 mt-1">Platform aggregated conversions</p>
          </div>
          <div className="panel p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">Gross Commissions</span>
              <DollarSign size={18} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              ${stats ? stats.totalCommissionVolume?.toLocaleString() : '18,950'}
            </div>
            <p className="text-xs text-slate-400 mt-1">Total platform commission volume</p>
          </div>
          <div className="panel p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">Conversion Rate</span>
              <ShieldCheck size={18} className="text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats ? stats.platformConversionRate : '5.37%'}</div>
            <p className="text-xs text-slate-400 mt-1">Platform average efficiency</p>
          </div>
        </div>
      )}

      {role === 'affiliate_manager' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="panel p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">Assigned Team Partners</span>
              <Users size={18} className="text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{affiliatesCount}</div>
            <p className="text-xs text-slate-400 mt-1">Scoped to your manager portfolio</p>
          </div>
          <div className="panel p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">Team Pending Payouts</span>
              <DollarSign size={18} className="text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">{commissionsCount} Records</div>
            <p className="text-xs text-slate-400 mt-1">Pending admin approval</p>
          </div>
          <div className="panel p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">Manager Access Boundary</span>
              <Lock size={18} className="text-emerald-400" />
            </div>
            <div className="text-sm font-semibold text-emerald-300">Portfolio Scoped</div>
            <p className="text-xs text-slate-400 mt-1">Protected from accessing other managers' teams</p>
          </div>
        </div>
      )}

      {role === 'affiliate_user' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="panel p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase">My Total Earnings</span>
                <DollarSign size={18} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">$12,750.00</div>
              <p className="text-xs text-slate-400 mt-1">Personal verified revenue</p>
            </div>
            <div className="panel p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase">My Total Clicks</span>
                <TrendingUp size={18} className="text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white">14,200</div>
              <p className="text-xs text-slate-400 mt-1">Across approved campaigns</p>
            </div>
            <div className="panel p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase">My Commission Tier</span>
                <ShieldCheck size={18} className="text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">15.0%</div>
              <p className="text-xs text-slate-400 mt-1">Managed by your partner manager</p>
            </div>
          </div>

          {/* Referral Link Widget */}
          <div className="panel p-5 border-emerald-900/40 bg-emerald-950/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-emerald-300">My Active Referral Tracking Link</h3>
                <p className="text-xs text-slate-400">Use this link in your campaigns to track conversions</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  readOnly
                  value="https://brand.local/ref/ALICE-TECH-2026"
                  className="bg-slate-900 text-xs font-mono text-emerald-200 border border-emerald-800/60 rounded-lg px-3 py-2 w-full sm:w-64"
                />
                <button
                  onClick={() => handleCopyLink('ALICE-TECH-2026')}
                  className="btn-primary text-xs whitespace-nowrap"
                >
                  {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {role === 'ai_agent' && (
        <div className="panel p-6 border-amber-900/40 bg-amber-950/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Lock size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-200">Least-Privilege Autonomous Agent Status</h3>
              <p className="text-sm text-slate-300 mt-1">
                The <strong>MarketPulse AI Agent</strong> is an automated service governed by strict least-privilege access control:
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 mt-3">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>Authorized to query <code>GET /api/reports/aggregate-stats</code> (Platform aggregates).</span>
                </li>
                <li className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-400" />
                  <span>Strictly prohibited from viewing individual affiliate records or contact info (Zero PII).</span>
                </li>
                <li className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-400" />
                  <span>Strictly prohibited from calling mutating endpoints (<code>POST</code>, <code>PUT</code>, <code>DELETE</code>).</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

