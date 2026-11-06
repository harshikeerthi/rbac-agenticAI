import React, { useState } from 'react';
import {
  ShieldCheck,
  Key,
  Users,
  DollarSign,
  TrendingUp,
  Lock,
  Copy,
  CheckCircle2,
  AlertCircle,
  Shield,
  ArrowRight,
  Bot,
  ShieldAlert,
  Sliders,
  Check,
  ExternalLink,
  Layers,
  Zap,
  Activity,
  AlertOctagon
} from 'lucide-react';

export default function DashboardView({
  currentUser,
  stats,
  affiliatesCount,
  commissionsCount,
  setActiveTab
}) {
  const [copied, setCopied] = useState(false);

  if (!currentUser) {
    return (
      <div className="panel p-8 text-center text-slate-500 space-y-3 bg-white">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold text-slate-700">Loading authenticated identity profile from backend...</p>
        <p className="text-xs text-slate-400 font-mono">Querying GET /api/me with x-demo-user-id</p>
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

  const getRoleBadgeClass = (r) => {
    switch (r) {
      case 'admin': return 'badge-admin';
      case 'affiliate_manager': return 'badge-manager';
      case 'affiliate_user': return 'badge-affiliate';
      case 'ai_agent': return 'badge-agent';
      default: return 'badge-admin';
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Active Identity Context Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
              {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">{currentUser.name}</h2>
                <span className={`badge ${getRoleBadgeClass(role)}`}>
                  {role}
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  ID: {currentUser.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                {role === 'admin' && 'System Administrator with full platform visibility across all partners, manager assignments, and commission payouts.'}
                {role === 'affiliate_manager' && 'Partner Manager responsible for assigned partner portfolio. Scope is strictly isolated to assigned affiliates.'}
                {role === 'affiliate_user' && 'Independent Publisher restricted strictly to personal performance data, tracking links, and payouts.'}
                {role === 'ai_agent' && 'MarketPulse AI Agent operating under strict least privilege: authorized for aggregate trends only, zero PII access.'}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center md:flex-col md:items-end justify-between flex-shrink-0 gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <ShieldCheck size={15} className="text-emerald-600" />
              <span>Server Authorization</span>
            </div>
            <div className="text-xs font-mono text-emerald-700 font-bold">
              {permissions.length} Active Permission{permissions.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Compact Granted Permissions Cloud */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Key size={13} className="text-slate-400" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Granted Server Permissions</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {permissions.length === 0 ? (
              <span className="text-xs text-slate-400 italic">No permissions assigned</span>
            ) : (
              permissions.map((perm) => (
                <span
                  key={perm}
                  className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200"
                >
                  {perm}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2. Core Architecture & Security Modules Hub (PROMINENT AT TOP) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={15} className="text-emerald-600" />
              Core Platform Architecture & Modules
            </h3>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">• Direct runtime console access</span>
          </div>
          <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            All 4 Modules Online
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* Module 1 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-xs transition group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Users size={17} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    MODULE 1
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">RBAC</span>
                </div>
              </div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition">
                Affiliate Management & RBAC
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Role-based access control, manager portfolio scoping, and field protection for financial records.
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveTab && setActiveTab('affiliates')}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition flex items-center gap-1"
              >
                Affiliates <ArrowRight size={10} />
              </button>
              <button
                onClick={() => setActiveTab && setActiveTab('commissions')}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition flex items-center gap-1"
              >
                Commissions <ArrowRight size={10} />
              </button>
              <button
                onClick={() => setActiveTab && setActiveTab('matrix')}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition flex items-center gap-1"
              >
                RBAC Matrix <ArrowRight size={10} />
              </button>
            </div>
          </div>

          {/* Module 2 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-400 hover:shadow-xs transition group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Bot size={17} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    MODULE 2
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">HITL</span>
                </div>
              </div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition">
                Agent Governance & Guardrails
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                3-Tier guardrails (Autonomous / HITL / Prohibited), human approval queue, and tamper-proof audit trail.
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveTab && setActiveTab('governance-policies')}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded transition flex items-center gap-1"
              >
                Policies <ArrowRight size={10} />
              </button>
              <button
                onClick={() => setActiveTab && setActiveTab('governance-proposals')}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded transition flex items-center gap-1"
              >
                Approval Queue <ArrowRight size={10} />
              </button>
              <button
                onClick={() => setActiveTab && setActiveTab('governance-simulator')}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded transition flex items-center gap-1"
              >
                Simulator <ArrowRight size={10} />
              </button>
            </div>
          </div>

          {/* Module 3 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-rose-400 hover:shadow-xs transition group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                  <ShieldAlert size={17} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    MODULE 3
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">CONTAIN</span>
                </div>
              </div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-rose-700 transition">
                Agent Kill Switch & Containment
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Emergency server kill switch, 3-mode state machine (NORMAL / QUARANTINE / TERMINATED), and circuit breaker.
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveTab && setActiveTab('containment')}
                className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded transition flex items-center gap-1"
              >
                Kill Switch Console <ArrowRight size={10} />
              </button>
              <button
                onClick={() => setActiveTab && setActiveTab('sandbox')}
                className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition flex items-center gap-1"
              >
                Attack Sandbox <ArrowRight size={10} />
              </button>
            </div>
          </div>

          {/* Module 4 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Lock size={17} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                    MODULE 4
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">PRIVACY</span>
                </div>
              </div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition">
                Privacy-Aware Aggregate Analytics
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Differential Privacy (Laplace noise), k-anonymity cohort suppression (k ≥ 3), and dynamic epsilon budget tracking.
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveTab && setActiveTab('privacy-analytics')}
                className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition flex items-center gap-1"
              >
                {role === 'ai_agent' ? 'MarketPulse Analytics' : role === 'admin' ? 'Privacy Controls' : 'Privacy Analytics'} <ArrowRight size={10} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Live Platform Telemetry & Scoped Metrics */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={15} className="text-slate-500" />
            Live Scoped Telemetry (Enforced via Backend API)
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">Real-time Port 5000 Sync</span>
        </div>

        {/* Admin Metrics */}
        {role === 'admin' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="panel p-3.5 sm:p-4 bg-white">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Affiliates</span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Users size={16} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900">{affiliatesCount || 3}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Platform directory visibility</p>
            </div>

            <div className="panel p-3.5 sm:p-4 bg-white">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Platform Clicks</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900">{stats ? stats.totalPlatformClicks?.toLocaleString() : '25,400'}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Verified aggregate conversions</p>
            </div>

            <div className="panel p-3.5 sm:p-4 bg-white">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Gross Commission Volume</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-700">
                ${stats ? stats.totalCommissionVolume?.toLocaleString() : '3,950'}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Across all approved payouts</p>
            </div>

            <div className="panel p-3.5 sm:p-4 bg-white">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Platform Conversion Rate</span>
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900">{stats ? stats.platformConversionRate : '5.37%'}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">System-wide campaign efficiency</p>
            </div>
          </div>
        )}

        {/* Manager Metrics */}
        {role === 'affiliate_manager' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="panel p-3.5 sm:p-4 bg-white">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Assigned Team Partners</span>
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Users size={16} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900">{affiliatesCount} Partners</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Scoped to your manager portfolio</p>
            </div>

            <div className="panel p-3.5 sm:p-4 bg-white">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Team Payout Records</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900">{commissionsCount} Records</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Scoped to your assigned affiliates</p>
            </div>

            <div className="panel p-3.5 sm:p-4 bg-white">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Manager Access Boundary</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Lock size={16} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-700">Enforced</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Restricted from other managers' partners</p>
            </div>
          </div>
        )}

        {/* Affiliate Metrics */}
        {role === 'affiliate_user' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="panel p-3.5 sm:p-4 bg-white">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">My Total Earnings</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <DollarSign size={16} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-700">
                  ${currentUser.earnings ? currentUser.earnings.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '12,750.00'}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Personal verified revenue</p>
              </div>

              <div className="panel p-3.5 sm:p-4 bg-white">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">My Total Clicks</span>
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {currentUser.clicks ? currentUser.clicks.toLocaleString() : '14,200'}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Across approved campaigns</p>
              </div>

              <div className="panel p-3.5 sm:p-4 bg-white">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">My Commission Tier</span>
                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                    <ShieldCheck size={16} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {currentUser.commissionRate ? `${currentUser.commissionRate}%` : '15.0%'}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Managed by partner manager</p>
              </div>
            </div>

            {/* Active Referral Tracking Link Container */}
            <div className="p-3.5 sm:p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-emerald-950">My Active Referral Tracking Link</h4>
                <p className="text-[11px] text-emerald-700 mt-0.5">Use this unique link to track attributed sales and commissions.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-white px-3 py-1.5 rounded-lg border border-emerald-300 text-slate-800 font-semibold select-all">
                  https://brand.local/ref/{currentUser.referralCode || 'ALICE-TECH'}
                </span>
                <button
                  onClick={() => handleCopyLink(currentUser.referralCode || 'ALICE-TECH')}
                  className="btn-primary text-xs flex items-center gap-1.5 whitespace-nowrap"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Agent Guidance Panel */}
        {role === 'ai_agent' && (
          <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/70 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot size={20} />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-sm font-bold text-purple-950">MarketPulse AI Agent — Least Privilege Active</h3>
                <p className="text-xs text-purple-800 leading-relaxed">
                  The <strong>MarketPulse AI Agent</strong> is governed by strict least-privilege boundary enforcement:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs mb-0.5">
                      <CheckCircle2 size={13} /> Authorized
                    </div>
                    <p className="text-[10px] text-slate-600 font-mono">GET /api/reports/aggregate-stats</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Anonymized platform metrics only</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs mb-0.5">
                      <Sliders size={13} /> Approval Required
                    </div>
                    <p className="text-[10px] text-slate-600 font-mono">POST /api/governance/dispatch</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Commission proposals queued for HITL review</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs mb-0.5">
                      <Lock size={13} /> Prohibited & Guarded
                    </div>
                    <p className="text-[10px] text-slate-600 font-mono">PII & Direct Payouts</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Circuit breaker trips after 3 violations</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
