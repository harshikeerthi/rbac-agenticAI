import React from 'react';
import {
  Shield,
  Users,
  DollarSign,
  Bot,
  AlertOctagon,
  FileText,
  Grid,
  RotateCcw,
  UserCheck,
  Sliders,
  ShieldAlert
} from 'lucide-react';

export default function Navbar({
  users,
  activeUserId,
  currentUser,
  activeTab,
  setActiveTab,
  onSwitchUser,
  onResetData
}) {
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'badge-admin';
      case 'affiliate_manager': return 'badge-manager';
      case 'affiliate_user': return 'badge-affiliate';
      case 'ai_agent': return 'badge-agent';
      default: return 'badge-admin';
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  const rbacNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'affiliates', label: 'Affiliates', icon: Users },
    { id: 'commissions', label: 'Commissions', icon: DollarSign },
    { id: 'ai-insights', label: 'AI Agent Summary', icon: Bot },
    { id: 'sandbox', label: 'Security Sandbox', icon: AlertOctagon },
    { id: 'activity', label: 'Decision Log', icon: FileText },
    { id: 'matrix', label: 'RBAC Matrix', icon: Grid },
    ...(isAdmin ? [{ id: 'containment', label: 'Runtime Containment', icon: ShieldAlert }] : [])
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0c111d] border-b border-slate-800 shadow-md">
      {/* Top Simulation Warning Banner */}
      <div className="bg-amber-950/70 border-b border-amber-800/60 text-xs text-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <strong>SIMULATED DEMO ENVIRONMENT:</strong>
            <span className="hidden sm:inline">Header-based identity selector (<code>x-demo-user-id</code>). Not production authentication.</span>
          </div>
          <button
            onClick={onResetData}
            className="text-amber-300 hover:text-white flex items-center gap-1.5 font-mono text-xs transition px-2 py-0.5 rounded bg-amber-900/40 hover:bg-amber-900/70 border border-amber-700/50"
            title="Reset sample JSON data"
          >
            <RotateCcw size={12} /> Reset Sample Data
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Affiliate Access Lab
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                  RBAC Prototype
                </span>
              </h1>
              <p className="text-xs text-slate-400">Least-Privilege & Boundary Enforcement</p>
            </div>
          </div>

          {/* Interactive Identity Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-sm">
              <UserCheck size={16} className="text-indigo-400" />
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Switch Demo Actor</span>
                <select
                  value={activeUserId}
                  onChange={(e) => onSwitchUser(e.target.value)}
                  className="bg-slate-900 text-sm font-semibold text-white focus:outline-none cursor-pointer py-1 px-2 rounded border border-slate-700/60"
                >
                  {users.length === 0 ? (
                    <option value="" disabled className="bg-slate-900 text-slate-400">
                      Loading demo actors...
                    </option>
                  ) : (
                    users.map((u) => (
                      <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                        {u.name} ({u.role.replace('_', ' ')})
                      </option>
                    ))
                  )}
                </select>
              </div>
              {currentUser && (
                <span className={`badge ${getRoleBadgeClass(currentUser.role)} ml-1`}>
                  {currentUser.role}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Three-Module Navigation Header */}
        <div className="border-t border-slate-800/80 pt-2 pb-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            {/* Module Switcher Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl w-fit flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'governance' || activeTab === 'containment') setActiveTab('dashboard');
                }}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab !== 'governance' && activeTab !== 'containment'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Shield size={14} />
                Module 1: RBAC & Least Privilege
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('governance')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'governance'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Sliders size={14} />
                Module 2: Agent Governance & Audit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('containment')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'containment'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <ShieldAlert size={14} />
                Module 3: Runtime Containment
              </button>
            </div>

            {/* Active Module Indicator Badge */}
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <span>Active Scope:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold uppercase ${
                  activeTab === 'containment'
                    ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                    : activeTab === 'governance'
                    ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50'
                    : 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/50'
                }`}
              >
                {activeTab === 'containment'
                  ? 'Kill Switch & Isolation'
                  : activeTab === 'governance'
                  ? 'Autonomous AI Guardrails'
                  : 'Core Platform RBAC'}
              </span>
            </div>
          </div>

          {/* Sub-Navigation depending on active module */}
          {activeTab !== 'governance' && activeTab !== 'containment' ? (
            <nav className="flex space-x-1 -mb-px overflow-x-auto">
              {rbacNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                      isActive
                        ? 'border-indigo-500 text-indigo-300 bg-indigo-950/20'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          ) : activeTab === 'governance' ? (
            <div className="py-1 text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-2 text-purple-300 font-semibold">
                <Sliders size={14} /> Agent Governance & Audit Module is currently active.
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline font-mono"
              >
                ← Return to Module 1 (RBAC Platform)
              </button>
            </div>
          ) : (
            <div className="py-1 text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-2 text-rose-300 font-semibold">
                <ShieldAlert size={14} /> Agent Kill Switch & Runtime Containment Module is currently active.
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline font-mono"
              >
                ← Return to Module 1 (RBAC Platform)
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

