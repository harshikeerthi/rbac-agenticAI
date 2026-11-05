import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { getActivityLogs, getGovernanceProposals, getContainmentStatus } from '../api';

export default function NotificationDrawer({
  isOpen,
  onClose,
  setActiveTab
}) {
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'alerts', 'proposals'
  const [recentLogs, setRecentLogs] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [containment, setContainment] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchNotificationData = async () => {
    setLoading(true);
    try {
      const [actRes, propRes, contRes] = await Promise.all([
        getActivityLogs(),
        getGovernanceProposals('pending'),
        getContainmentStatus()
      ]);

      if (actRes.ok) {
        setRecentLogs((actRes.data.data || []).slice(0, 15));
      }
      if (propRes.ok) {
        setProposals(propRes.data.data || []);
      }
      if (contRes.ok) {
        setContainment(contRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load notification events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotificationData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter items safely with nullish / type guards
  const alertLogs = recentLogs.filter(l => 
    l && (
      l.decision === 'DENIED' || 
      (typeof l.action === 'string' && (l.action.includes('CONTAINMENT') || l.action.includes('KILL_SWITCH')))
    )
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Notifications & Alerts</h2>
              <p className="text-xs text-slate-500">Real-time Sentinel Security Events</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchNotificationData}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 py-2 border-b border-slate-200 bg-white flex items-center gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Activity ({recentLogs.length})
          </button>
          <button
            onClick={() => setActiveFilter('alerts')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeFilter === 'alerts'
                ? 'bg-rose-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Security Alerts ({alertLogs.length})
          </button>
          <button
            onClick={() => setActiveFilter('proposals')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeFilter === 'proposals'
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Proposals ({proposals.length})
          </button>
        </div>

        {/* Status Callout if Containment is not NORMAL */}
        {containment && containment.mode !== 'NORMAL' && (
          <div className={`m-4 p-3 rounded-xl border flex items-start gap-3 ${
            containment.mode === 'TERMINATED'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <ShieldAlert size={20} className={containment.mode === 'TERMINATED' ? 'text-rose-600' : 'text-amber-600'} />
            <div className="flex-1 text-xs">
              <span className="font-bold uppercase tracking-wider block">Agent Containment Active: {containment.mode}</span>
              <p className="mt-0.5 text-slate-700">Reason: {containment.reason || 'Safety containment engaged.'}</p>
              <button
                onClick={() => { setActiveTab('containment'); onClose(); }}
                className="mt-2 text-xs font-bold underline flex items-center gap-1 hover:opacity-80"
              >
                Inspect Containment Console <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Content Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="text-center py-8 text-xs text-slate-400 animate-pulse font-mono">
              Loading recent security notifications...
            </div>
          )}

          {!loading && activeFilter === 'proposals' && (
            proposals.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No pending proposals</p>
                <p className="text-xs text-slate-400 mt-1">MarketPulse AI agent has no proposals queued for review.</p>
              </div>
            ) : (
              proposals.map(p => (
                <div key={p.id} className="p-3 rounded-xl border border-purple-200 bg-purple-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      Tier 2: Approval Required
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(p.proposedAt || p.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{p.actionName}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">{p.parameters?.reason || 'Proposal queued by AI Agent'}</p>
                  </div>
                  <div className="pt-2 border-t border-purple-100 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-purple-700">Target: {p.parameters?.targetAffiliateId || 'Platform'}</span>
                    <button
                      onClick={() => { setActiveTab('governance-proposals'); onClose(); }}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                    >
                      Review Queue <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {!loading && activeFilter !== 'proposals' && (
            (activeFilter === 'alerts' ? alertLogs : recentLogs).length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShieldCheck size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No notifications to display</p>
                <p className="text-xs text-slate-400 mt-1">Audit log is clean.</p>
              </div>
            ) : (
              (activeFilter === 'alerts' ? alertLogs : recentLogs).map((log, index) => {
                if (!log) return null;
                const isDenied = log.decision === 'DENIED';
                const actionText = typeof log.action === 'string'
                  ? log.action
                  : (log.action ? JSON.stringify(log.action) : log.endpoint || log.details || 'SYSTEM_EVENT');
                const actorId = log.userId || log.actor || 'system';
                const actorRole = log.role || log.actorRole || 'system';
                const timestampText = log.timestamp
                  ? new Date(log.timestamp).toLocaleTimeString()
                  : 'Recent';

                return (
                  <div
                    key={log.id || `notif-${index}`}
                    className={`p-3 rounded-xl border transition ${
                      isDenied
                        ? 'border-rose-200 bg-rose-50/50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isDenied
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {log.decision || 'LOG'} {log.statusCode ? `(${log.statusCode})` : ''}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {timestampText}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mt-1 font-mono break-all">
                      {actionText}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Actor: <strong className="text-slate-700">{actorId}</strong></span>
                      <span className="text-slate-400">{actorRole}</span>
                    </div>
                    {log.reason && typeof log.reason === 'string' && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium bg-rose-100/50 p-1.5 rounded">
                        {log.reason}
                      </p>
                    )}
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => { setActiveTab('activity'); onClose(); }}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
          >
            Open Full Decision Audit Stream <ArrowRight size={14} />
          </button>
          <span className="text-[11px] font-mono text-slate-400">Port 5000</span>
        </div>
      </div>
    </div>
  );
}

