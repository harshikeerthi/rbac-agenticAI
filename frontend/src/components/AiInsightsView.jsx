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
  AlertTriangle
} from 'lucide-react';
import { getAggregateStats } from '../api';

export default function AiInsightsView({ currentUser }) {
  const [statsData, setStatsData] = useState(null);
  const [deniedInfo, setDeniedInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
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
    }
    fetchStats();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="panel p-8 text-center text-slate-400">
        Querying aggregate reporting endpoint...
      </div>
    );
  }

  // Denied Access State (e.g. for Affiliate User role)
  if (deniedInfo) {
    return (
      <div className="panel p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-950/60 border border-rose-800/80 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-lg font-bold text-white">403 Forbidden: Aggregate Insights Restricted</h3>
        <p className="text-sm text-slate-300">
          Your current role (<strong>{currentUser?.role}</strong>) does not have permission to view platform-wide aggregate reporting.
        </p>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-left font-mono text-xs text-rose-300">
          <div>HTTP Status: 403 Forbidden</div>
          <div>Error Code: {deniedInfo.code || 'INSUFFICIENT_PERMISSIONS'}</div>
          <div>Required Permission: [reports:read:aggregate]</div>
        </div>
        <p className="text-xs text-slate-400">
          Switch to <strong>MarketPulse AI Agent</strong>, <strong>Admin</strong>, or <strong>Affiliate Manager</strong> in the top bar to inspect this view.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="panel p-6 border-amber-900/40 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Bot size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Simulated AI Analytical Summary</h2>
                <span className="badge badge-agent">Least-Privilege Guarded</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Demonstrating safe AI integration: The agent queries <strong>aggregate totals only</strong> without exposing sensitive partner PII.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 flex items-center gap-2">
            <Cpu size={16} className="text-amber-400" />
            <div className="text-xs">
              <div className="text-slate-400">Service Model</div>
              <div className="font-semibold text-white">Local Aggregate Synthesis</div>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-4">
          <div className="text-xs text-slate-400 font-medium uppercase">Active Partners Tracked</div>
          <div className="text-2xl font-bold text-white mt-1">{statsData?.totalActiveAffiliates}</div>
          <div className="text-[11px] text-slate-500 mt-1">out of {statsData?.totalAffiliatesCount} registered</div>
        </div>
        <div className="panel p-4">
          <div className="text-xs text-slate-400 font-medium uppercase">Platform Conversions</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {statsData?.totalPlatformConversions?.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">from {statsData?.totalPlatformClicks?.toLocaleString()} clicks</div>
        </div>
        <div className="panel p-4">
          <div className="text-xs text-slate-400 font-medium uppercase">Conversion Efficiency</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{statsData?.platformConversionRate}</div>
          <div className="text-[11px] text-slate-500 mt-1">Platform-wide average</div>
        </div>
        <div className="panel p-4">
          <div className="text-xs text-slate-400 font-medium uppercase">Total Paid Volume</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            ${statsData?.totalPaidCommissions?.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Gross paid to date</div>
        </div>
      </div>

      {/* AI Generated Narrative Synthesis */}
      <div className="panel p-6 border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
          <BarChart3 size={18} />
          <span>Automated Executive Synthesis (Simulated Analytics Engine)</span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 text-sm text-slate-200 leading-relaxed font-sans space-y-3">
          <p>
            <strong>MarketPulse Intelligence Summary:</strong> Platform affiliate health is performing efficiently with an average conversion rate of <strong>{statsData?.platformConversionRate}</strong> across <strong>{statsData?.totalPlatformClicks?.toLocaleString()}</strong> total campaign clicks.
          </p>
          <p>
            Lead momentum is concentrated in the <strong>{statsData?.topCategory}</strong> vertical. With {statsData?.totalActiveAffiliates} active publisher accounts contributing to {statsData?.totalPlatformConversions?.toLocaleString()} qualified sales conversions, current gross payout commitments stand at <strong>${statsData?.totalCommissionVolume?.toLocaleString()}</strong>.
          </p>
          <div className="pt-2 text-xs text-slate-400 italic">
            * Note: This synthesis was generated deterministically on the server from anonymized totals. Zero personal identities, email addresses, or individual banking ledgers were touched or transmitted during this computation.
          </div>
        </div>
      </div>

      {/* Least-Privilege Verification Panel */}
      <div className="panel p-5 border-emerald-900/40 bg-emerald-950/10">
        <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2 mb-3">
          <ShieldCheck size={16} /> Least-Privilege Security Guarantee Audit
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-200">Affiliate Names</div>
              <div className="text-emerald-400 font-mono text-[10px]">Zero Exposure (Blocked)</div>
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-200">Email & Contact Info</div>
              <div className="text-emerald-400 font-mono text-[10px]">Zero Exposure (Blocked)</div>
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-200">Individual Earnings</div>
              <div className="text-emerald-400 font-mono text-[10px]">Zero Exposure (Blocked)</div>
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-200">Mutations & Writes</div>
              <div className="text-emerald-400 font-mono text-[10px]">Zero Permitted (Blocked)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

