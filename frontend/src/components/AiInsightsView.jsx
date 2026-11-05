import React, { useEffect, useState } from 'react';
import {
  Bot,
  ShieldCheck,
  ShieldAlert,
  Lock,
  TrendingUp,
  BarChart3,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Check,
  RefreshCw
} from 'lucide-react';
import { getAggregateStats } from '../api';

export default function AiInsightsView({ currentUser }) {
  const [statsData, setStatsData] = useState(null);
  const [deniedInfo, setDeniedInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    const res = await getAggregateStats();
    if (res.ok) {
      setStatsData(res.data.data);
      setDeniedInfo(null);
    } else {
      setStatsData(null);
      setDeniedInfo(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm font-semibold text-slate-700">Querying MarketPulse aggregate telemetry...</p>
        <p className="text-xs text-slate-400 font-mono mt-0.5">GET /api/reports/aggregate-stats</p>
      </div>
    );
  }

  // Denied Access State (e.g. for Affiliate User role)
  if (deniedInfo) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center max-w-2xl mx-auto space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">403 Forbidden: Aggregate Insights Restricted</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Your current role (<strong>{currentUser?.role}</strong>) does not have permission to view platform-wide aggregate reporting.
        </p>
        <div className="bg-slate-900 text-white rounded-xl p-4 text-left font-mono text-xs space-y-1">
          <div className="text-rose-400 font-bold">HTTP Status: 403 Forbidden</div>
          <div className="text-slate-300">Error Code: {deniedInfo.code || 'INSUFFICIENT_PERMISSIONS'}</div>
          <div className="text-slate-400">Required Permission: [reports:read:aggregate]</div>
        </div>
        <p className="text-xs text-slate-500">
          Switch to <strong>MarketPulse AI Agent</strong>, <strong>Admin</strong>, or <strong>Affiliate Manager</strong> using the top bar to inspect this view.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shadow-xs flex-shrink-0">
            <Bot size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">MarketPulse AI Insights</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                MODULE 2
              </span>
              <span className="badge badge-agent text-[10px]">Least-Privilege Guarded</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Demonstrating safe AI integration: The agent queries <strong>anonymized aggregate totals only</strong> with zero exposure of sensitive partner PII or individual banking ledgers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            className="btn-secondary text-xs"
            title="Refresh AI synthesis"
          >
            <RefreshCw size={14} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Aggregate Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-5 bg-white">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Partners Tracked</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1.5">{statsData?.totalActiveAffiliates}</div>
          <div className="text-[11px] text-slate-400 mt-1">out of {statsData?.totalAffiliatesCount} registered in system</div>
        </div>

        <div className="panel p-5 bg-white">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Platform Conversions</div>
          <div className="text-2xl font-extrabold text-purple-700 mt-1.5">
            {statsData?.totalPlatformConversions?.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">from {statsData?.totalPlatformClicks?.toLocaleString()} total clicks</div>
        </div>

        <div className="panel p-5 bg-white">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Conversion Efficiency</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1.5">{statsData?.platformConversionRate}</div>
          <div className="text-[11px] text-slate-400 mt-1">Platform average rate</div>
        </div>

        <div className="panel p-5 bg-white">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Gross Commission Volume</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1.5">
            ${statsData?.totalCommissionVolume?.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">${statsData?.totalPaidCommissions?.toLocaleString()} settled to date</div>
        </div>
      </div>

      {/* AI Generated Narrative Synthesis */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
          <BarChart3 size={18} />
          <span>Automated Executive Synthesis (Simulated Analytics Engine)</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-700 leading-relaxed space-y-3">
          <p>
            <strong className="text-slate-900">MarketPulse Intelligence Summary:</strong> Platform affiliate ecosystem is operating at high efficiency with an average conversion rate of <strong>{statsData?.platformConversionRate}</strong> across <strong>{statsData?.totalPlatformClicks?.toLocaleString()}</strong> total campaign clicks.
          </p>
          <p>
            Campaign momentum is concentrated in the <strong className="text-purple-700">{statsData?.topCategory}</strong> vertical. With {statsData?.totalActiveAffiliates} active publisher accounts contributing to {statsData?.totalPlatformConversions?.toLocaleString()} qualified sales conversions, current gross commission commitments stand at <strong>${statsData?.totalCommissionVolume?.toLocaleString()}</strong>.
          </p>
          <div className="pt-2 text-xs text-slate-500 italic border-t border-slate-200/60">
            * Note: This synthesis was generated deterministically on the server from anonymized totals. Zero personal identities, email addresses, or individual banking ledgers were touched or transmitted during this computation.
          </div>
        </div>
      </div>

      {/* Least-Privilege Verification Panel */}
      <div className="p-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 shadow-sm">
        <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2 mb-3">
          <ShieldCheck size={18} className="text-emerald-700" /> Least-Privilege Security Guarantee Audit
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-white border border-emerald-200 p-3.5 rounded-xl shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span className="font-bold text-slate-800">Affiliate Names</span>
            </div>
            <div className="text-emerald-700 font-mono text-[11px] font-semibold">Zero Exposure (Blocked)</div>
          </div>

          <div className="bg-white border border-emerald-200 p-3.5 rounded-xl shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span className="font-bold text-slate-800">Email & Contact Info</span>
            </div>
            <div className="text-emerald-700 font-mono text-[11px] font-semibold">Zero Exposure (Blocked)</div>
          </div>

          <div className="bg-white border border-emerald-200 p-3.5 rounded-xl shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span className="font-bold text-slate-800">Individual Earnings</span>
            </div>
            <div className="text-emerald-700 font-mono text-[11px] font-semibold">Zero Exposure (Blocked)</div>
          </div>

          <div className="bg-white border border-emerald-200 p-3.5 rounded-xl shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span className="font-bold text-slate-800">Mutations & Writes</span>
            </div>
            <div className="text-emerald-700 font-mono text-[11px] font-semibold">Zero Permitted (Blocked)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
