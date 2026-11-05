import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Shield,
  Users,
  DollarSign,
  Bot,
  AlertOctagon,
  FileText,
  Grid,
  ShieldAlert,
  Sliders,
  UserCheck,
  RotateCcw,
  ExternalLink,
  X,
  ArrowRight
} from 'lucide-react';

export default function GlobalSearchModal({
  isOpen,
  onClose,
  setActiveTab,
  onSwitchUser,
  users = [],
  onResetData
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Search items database
  const navigationItems = [
    { id: 'dashboard', title: 'Dashboard & Overview', category: 'Screen', icon: Shield, desc: 'Executive KPI metrics, role summary & system health' },
    { id: 'activity', title: 'Activity & Decision Log', category: 'Screen', icon: FileText, desc: 'Complete server-side audit trail of allowed & denied actions' },
    { id: 'affiliates', title: 'Affiliate Directory', category: 'Screen', icon: Users, desc: 'Partner database, manager assignments, status & tiers' },
    { id: 'commissions', title: 'Commission Management', category: 'Screen', icon: DollarSign, desc: 'Financial transaction ledger & payout authorization' },
    { id: 'ai-insights', title: 'AI Insights (MarketPulse)', category: 'Screen', icon: Bot, desc: 'Aggregate trend analytics & zero-PII boundary proof' },
    { id: 'governance-policies', title: 'AI Governance Policies', category: 'Screen', icon: Sliders, desc: 'Autonomous allowlist, human-approval & prohibited tiers' },
    { id: 'governance-simulator', title: 'Action Simulator', category: 'Screen', icon: Sliders, desc: 'Interactive AI dispatch payload builder & live executor' },
    { id: 'governance-proposals', title: 'Human Approval Queue', category: 'Screen', icon: Sliders, desc: 'Review, approve, or reject pending AI agent proposals' },
    { id: 'governance-audit', title: 'Agent Audit Trail', category: 'Screen', icon: FileText, desc: 'Live event stream of AI dispatches and policy outcomes' },
    { id: 'matrix', title: 'RBAC Permission Matrix', category: 'Screen', icon: Grid, desc: 'Role-to-permission mapping and boundary verification' },
    { id: 'containment', title: 'Runtime Containment & Kill Switch', category: 'Screen', icon: ShieldAlert, desc: 'Emergency Kill Switch, 3-state containment & circuit breaker' },
    { id: 'sandbox', title: 'Security Sandbox', category: 'Screen', icon: AlertOctagon, desc: 'Interactive attack simulation and raw HTTP request runner' },
  ];

  const actionItems = [
    {
      id: 'action-containment',
      title: 'Open Emergency Kill Switch Controls',
      category: 'Quick Action',
      icon: ShieldAlert,
      desc: 'Jump directly to Module 3 Containment Center',
      action: () => { setActiveTab('containment'); onClose(); }
    },
    {
      id: 'action-reset',
      title: 'Reset Demo Data to Initial Seed State',
      category: 'Quick Action',
      icon: RotateCcw,
      desc: 'Restore original JSON seed data for all entities',
      action: () => { onResetData(); onClose(); }
    }
  ];

  const userItems = users.map(u => ({
    id: `user-${u.id}`,
    title: `Switch Persona: ${u.name} (${u.role.replace('_', ' ')})`,
    category: 'Demo Persona',
    icon: UserCheck,
    desc: `Assume identity with role [${u.role}] via x-demo-user-id`,
    action: () => { onSwitchUser(u.id); onClose(); }
  }));

  const allItems = [
    ...navigationItems.map(item => ({
      ...item,
      action: () => { setActiveTab(item.id); onClose(); }
    })),
    ...actionItems,
    ...userItems
  ];

  const filteredItems = query.trim() === ''
    ? allItems.slice(0, 8)
    : allItems.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.desc.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-150">
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <Search size={20} className="text-slate-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a screen, action, or persona name (e.g. Kill Switch, Admin, Affiliates)..."
            className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={16} />
            </button>
          ) : (
            <span className="text-[11px] font-mono text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-white shadow-xs">
              ESC
            </span>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-slate-100">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <p className="font-semibold text-slate-600">No matching routes or entities found</p>
              <p className="text-xs mt-1 text-slate-400">Try searching for "containment", "affiliate", "matrix", or "admin"</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${
                    isSelected ? 'bg-emerald-50 text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{item.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.category === 'Screen'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : item.category === 'Quick Action'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}>
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className={`transition ${isSelected ? 'text-emerald-600 translate-x-1' : 'text-slate-300'}`} />
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3 font-mono">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-slate-400">Enterprise Sentinel Global Navigator</span>
        </div>
      </div>
    </div>
  );
}

