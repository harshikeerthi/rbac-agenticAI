import React, { useState, useRef, useEffect } from 'react';
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
  ShieldAlert,
  ChevronDown,
  Search,
  Bell,
  Menu,
  X,
  Lock,
  ExternalLink,
  Cpu,
  User,
  Zap,
  Activity
} from 'lucide-react';

export default function Navbar({
  users = [],
  activeUserId,
  currentUser,
  activeTab,
  setActiveTab,
  onSwitchUser,
  onResetData,
  onOpenSearch,
  onOpenNotifications,
  onOpenProfile,
  pendingProposalsCount = 0
}) {
  const [openDropdown, setOpenDropdown] = useState(null); // 'overview', 'governance', 'security'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'affiliate_manager';
  const isAffiliate = currentUser?.role === 'affiliate_user';
  const isAgent = currentUser?.role === 'ai_agent';

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'badge-admin';
      case 'affiliate_manager': return 'badge-manager';
      case 'affiliate_user': return 'badge-affiliate';
      case 'ai_agent': return 'badge-agent';
      default: return 'badge-admin';
    }
  };

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Top Simulation Warning Banner */}
      <div className="bg-slate-900 border-b border-slate-800 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
            {/* Desktop Full Disclosure */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] whitespace-nowrap">
              <span className="font-bold text-emerald-400 uppercase tracking-wider">Sentinel Simulation</span>
              <span className="text-slate-400">• Header identity injection (<code className="text-emerald-300 font-mono text-[11px]">x-demo-user-id</code>). Zero production external DB.</span>
            </div>
            {/* Compact Mobile Disclosure */}
            <div className="sm:hidden text-[11px] font-bold text-emerald-400 tracking-wider whitespace-nowrap">
              SENTINEL • Demo Mode
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onResetData}
              className="text-slate-300 hover:text-white flex items-center gap-1 font-mono text-[10px] sm:text-[11px] transition px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 whitespace-nowrap"
              title="Reset sample JSON data"
            >
              <RotateCcw size={11} /> Reset Seed Data
            </button>
          </div>
        </div>
      </div>

      {/* Main Top Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6" ref={dropdownRef}>
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div
              onClick={() => handleNavClick('dashboard')}
              className="cursor-pointer flex items-center gap-2 group"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition flex-shrink-0">
                <Shield size={18} className="text-emerald-400 sm:w-5 sm:h-5" />
              </div>
              <div className="whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
                    Affiliate Access Lab
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Sentinel
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium hidden xl:block whitespace-nowrap">
                  Enterprise RBAC & AI Containment Platform
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Items with Explicit Module Groupings */}
          <nav className="hidden lg:flex items-center space-x-1 flex-shrink-0">
            {/* 1. Overview Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'overview' ? null : 'overview')}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  activeTab === 'dashboard' || activeTab === 'activity'
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Activity size={14} className="text-slate-500" />
                <span>Overview</span>
                <ChevronDown size={12} className={`transition-transform ${openDropdown === 'overview' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'overview' && (
                <div className="absolute left-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => handleNavClick('dashboard')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-50 ${
                      activeTab === 'dashboard' ? 'text-emerald-700 bg-emerald-50/60 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <Shield size={15} className="text-emerald-600" />
                    <div>
                      <div>Executive Dashboard</div>
                      <div className="text-[10px] text-slate-400 font-normal">Modules hub & system health</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleNavClick('activity')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-50 ${
                      activeTab === 'activity' ? 'text-emerald-700 bg-emerald-50/60 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <FileText size={15} className="text-slate-500" />
                    <div>
                      <div>Activity & Analytics</div>
                      <div className="text-[10px] text-slate-400 font-normal">Full audit decision stream</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Module 1: RBAC & Affiliates */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'module1' ? null : 'module1')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  activeTab === 'affiliates' || activeTab === 'commissions' || activeTab === 'matrix'
                    ? 'bg-emerald-50 text-emerald-900 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="px-1 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                  M1
                </span>
                <span>RBAC & Affiliates</span>
                <ChevronDown size={12} className={`transition-transform ${openDropdown === 'module1' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'module1' && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl bg-white border border-slate-200 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50/70 uppercase tracking-wider border-b border-emerald-100 mb-1">
                    Module 1 — Core Access Control
                  </div>
                  <button
                    onClick={() => handleNavClick('affiliates')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-50 ${
                      activeTab === 'affiliates' ? 'text-emerald-700 bg-emerald-50 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <Users size={15} className="text-emerald-600" />
                    <div>
                      <div>Affiliate Directory</div>
                      <div className="text-[10px] text-slate-400 font-normal">Scoped partner records & tiers</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleNavClick('commissions')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-50 ${
                      activeTab === 'commissions' ? 'text-emerald-700 bg-emerald-50 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <DollarSign size={15} className="text-emerald-600" />
                    <div>
                      <div>Commission Management</div>
                      <div className="text-[10px] text-slate-400 font-normal">Financial ledger & payout approval</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleNavClick('matrix')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-50 ${
                      activeTab === 'matrix' ? 'text-emerald-700 bg-emerald-50 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <Grid size={15} className="text-emerald-600" />
                    <div>
                      <div>RBAC Permission Matrix</div>
                      <div className="text-[10px] text-slate-400 font-normal">Authoritative 4-role access map</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Module 2: AI Governance */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'module2' ? null : 'module2')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  activeTab.startsWith('governance') || activeTab === 'ai-insights'
                    ? 'bg-purple-50 text-purple-900 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="px-1 py-0.2 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800">
                  M2
                </span>
                <span>AI Governance</span>
                {pendingProposalsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                )}
                <ChevronDown size={12} className={`transition-transform ${openDropdown === 'module2' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'module2' && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl bg-white border border-slate-200 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1 text-[10px] font-bold text-purple-800 bg-purple-50/70 uppercase tracking-wider border-b border-purple-100 mb-1">
                    Module 2 — Agent Guardrails & HITL
                  </div>
                  <button
                    onClick={() => handleNavClick('ai-insights')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-50 ${
                      activeTab === 'ai-insights' ? 'text-purple-700 bg-purple-50 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <Bot size={15} className="text-purple-600" />
                    <div>
                      <div>MarketPulse AI Insights</div>
                      <div className="text-[10px] text-slate-400 font-normal">Zero-PII aggregate trends</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleNavClick('governance-policies')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-50 ${
                      activeTab === 'governance-policies' ? 'text-purple-700 bg-purple-50 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <Sliders size={15} className="text-purple-600" />
                    <div>
                      <div>3-Tier Policy Guardrails</div>
                      <div className="text-[10px] text-slate-400 font-normal">Autonomous / HITL / Prohibited</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleNavClick('governance-simulator')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-50 ${
                      activeTab === 'governance-simulator' ? 'text-purple-700 bg-purple-50 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <Zap size={15} className="text-purple-600" />
                    <div>
                      <div>Action Simulator</div>
                      <div className="text-[10px] text-slate-400 font-normal">Live AI dispatch tester</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleNavClick('governance-proposals')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-slate-50 ${
                      activeTab === 'governance-proposals' ? 'text-purple-700 bg-purple-50 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText size={15} className="text-purple-600" />
                      <div>
                        <div>Human Approval Queue</div>
                        <div className="text-[10px] text-slate-400 font-normal">Pending agent proposals</div>
                      </div>
                    </div>
                    {pendingProposalsCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        {pendingProposalsCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleNavClick('governance-audit')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-50 ${
                      activeTab === 'governance-audit' ? 'text-purple-700 bg-purple-50 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <FileText size={15} className="text-purple-600" />
                    <div>
                      <div>Agent Audit Trail</div>
                      <div className="text-[10px] text-slate-400 font-normal">Execution & policy audit log</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Module 3: Containment & Kill Switch */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'module3' ? null : 'module3')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  activeTab === 'containment' || activeTab === 'sandbox'
                    ? 'bg-rose-50 text-rose-900 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="px-1 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800">
                  M3
                </span>
                <span>Kill Switch</span>
                <ChevronDown size={12} className={`transition-transform ${openDropdown === 'module3' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'module3' && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl bg-white border border-slate-200 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1 text-[10px] font-bold text-rose-800 bg-rose-50/70 uppercase tracking-wider border-b border-rose-100 mb-1">
                    Module 3 — Runtime Containment
                  </div>
                  <button
                    onClick={() => handleNavClick('containment')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-slate-50 ${
                      activeTab === 'containment' ? 'text-rose-700 bg-rose-50 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert size={15} className="text-rose-600" />
                      <div>
                        <div>Runtime Containment Console</div>
                        <div className="text-[10px] text-slate-400 font-normal">Emergency Kill Switch & Modes</div>
                      </div>
                    </div>
                    {!isAdmin && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        Admin Only
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleNavClick('sandbox')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-50 ${
                      activeTab === 'sandbox' ? 'text-rose-700 bg-rose-50 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <AlertOctagon size={15} className="text-amber-600" />
                    <div>
                      <div>Security Attack Sandbox</div>
                      <div className="text-[10px] text-slate-400 font-normal">Direct API bypass testing</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Right Utility Bar: Search, Notifications, Persona Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Global Search Button */}
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-lg transition"
              title="Global Search (Ctrl+K)"
            >
              <Search size={14} />
              <span className="hidden xl:inline">Search...</span>
              <kbd className="hidden sm:inline-block font-mono text-[9px] bg-white border border-slate-200 px-1 rounded text-slate-400">
                Ctrl K
              </kbd>
            </button>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title="Security Notifications"
            >
              <Bell size={17} />
              {pendingProposalsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
              )}
            </button>

            {/* Active Persona Pill / Profile Button */}
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 p-1 pr-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition"
                title="Inspect Persona Profile & Permissions"
              >
                <div className="w-6 h-6 rounded-md bg-emerald-700 text-white flex items-center justify-center font-bold text-[11px]">
                  {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {currentUser?.name?.split(' ')[0] || 'User'}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono leading-tight">
                    {currentUser?.role?.replace('_', ' ') || 'loading'}
                  </div>
                </div>
              </button>

              {/* Quick Persona Switch Dropdown */}
              <select
                value={activeUserId}
                onChange={(e) => onSwitchUser(e.target.value)}
                className="bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg py-1 px-1.5 max-w-[160px] truncate focus:outline-none cursor-pointer hover:bg-slate-100 transition hidden md:block"
                title="Quick Switch Demo Actor"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-200 space-y-1 animate-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Overview
            </div>
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Shield size={15} /> Executive Dashboard
            </button>
            <button
              onClick={() => handleNavClick('activity')}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                activeTab === 'activity' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileText size={15} /> Activity & Analytics Log
            </button>

            <div className="px-2 pt-2.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-900 font-mono text-[9px]">M1</span>
              <span>Module 1: RBAC & Affiliates</span>
            </div>
            <button
              onClick={() => handleNavClick('affiliates')}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                activeTab === 'affiliates' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Users size={15} /> Affiliate Directory
            </button>
            <button
              onClick={() => handleNavClick('commissions')}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                activeTab === 'commissions' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <DollarSign size={15} /> Commission Management
            </button>
            <button
              onClick={() => handleNavClick('matrix')}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                activeTab === 'matrix' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Grid size={15} /> RBAC Permission Matrix
            </button>

            <div className="px-2 pt-2.5 text-[10px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="px-1 py-0.2 rounded bg-purple-100 text-purple-900 font-mono text-[9px]">M2</span>
              <span>Module 2: AI Governance</span>
            </div>
            <button
              onClick={() => handleNavClick('ai-insights')}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                activeTab === 'ai-insights' ? 'bg-purple-50 text-purple-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Bot size={15} /> MarketPulse AI Insights
            </button>
            <button
              onClick={() => handleNavClick('governance-policies')}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                activeTab === 'governance-policies' ? 'bg-purple-50 text-purple-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sliders size={15} /> 3-Tier Policy Guardrails
            </button>
            <button
              onClick={() => handleNavClick('governance-simulator')}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                activeTab === 'governance-simulator' ? 'bg-purple-50 text-purple-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Zap size={15} /> Action Simulator
            </button>
            <button
              onClick={() => handleNavClick('governance-proposals')}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-between ${
                activeTab === 'governance-proposals' ? 'bg-purple-50 text-purple-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={15} /> Human Approval Queue
              </div>
              {pendingProposalsCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {pendingProposalsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => handleNavClick('governance-audit')}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                activeTab === 'governance-audit' ? 'bg-purple-50 text-purple-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileText size={15} /> Agent Audit Trail
            </button>

            <div className="px-2 pt-2.5 text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="px-1 py-0.2 rounded bg-rose-100 text-rose-900 font-mono text-[9px]">M3</span>
              <span>Module 3: Containment & Kill Switch</span>
            </div>
            <button
              onClick={() => handleNavClick('containment')}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                activeTab === 'containment' ? 'bg-rose-50 text-rose-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert size={15} /> Runtime Containment Console
            </button>
            <button
              onClick={() => handleNavClick('sandbox')}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                activeTab === 'sandbox' ? 'bg-rose-50 text-rose-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <AlertOctagon size={15} /> Security Attack Sandbox
            </button>
            <button
              onClick={() => handleNavClick('activity')}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                activeTab === 'activity' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileText size={15} /> Full Decision Audit Stream
            </button>

            {/* Switch Demo Actor in Mobile */}
            <div className="pt-3 border-t border-slate-200 px-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Switch Demo Persona
              </label>
              <select
                value={activeUserId}
                onChange={(e) => {
                  onSwitchUser(e.target.value);
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-slate-50 text-xs font-semibold text-slate-800 border border-slate-200 rounded-lg p-2"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
