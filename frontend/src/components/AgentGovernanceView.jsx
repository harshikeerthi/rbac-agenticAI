import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Bot,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  FileText,
  UserCheck,
  Check,
  X,
  Send,
  Eye,
  Info,
  Zap,
  TrendingUp,
  Lock,
  ArrowRight
} from 'lucide-react';
import {
  getGovernancePolicies,
  getGovernanceProposals,
  approveGovernanceProposal,
  rejectGovernanceProposal,
  dispatchGovernanceAction,
  getGovernanceAuditLogs
} from '../api';

export default function AgentGovernanceView({
  currentUser,
  onNotify,
  initialSection = 'policies'
}) {
  const isAdmin = currentUser?.role === 'admin';
  const isAgent = currentUser?.role === 'ai_agent';

  // Section sub-tabs for organized navigation: 'policies', 'simulator', 'proposals', 'audit'
  const [activeSection, setActiveSection] = useState(initialSection);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // 1. Policies State
  const [policies, setPolicies] = useState(null);
  const [policiesError, setPoliciesError] = useState(null);
  const [loadingPolicies, setLoadingPolicies] = useState(false);

  // 2. Simulator State
  const [simAction, setSimAction] = useState('query_aggregate_metrics');
  const [simTargetAffiliate, setSimTargetAffiliate] = useState('aff_alice');
  const [simProposedRate, setSimProposedRate] = useState(18.0);
  const [simReason, setSimReason] = useState('Autonomous rate optimization based on high Q3 conversions.');
  const [simResponse, setSimResponse] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // 3. Proposals State
  const [proposals, setProposals] = useState([]);
  const [proposalsFilter, setProposalsFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [proposalsError, setProposalsError] = useState(null);
  const [actionNotes, setActionNotes] = useState({});

  // 4. Audit Stream State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState(null);

  // Fetch policies
  const loadPolicies = async () => {
    setLoadingPolicies(true);
    setPoliciesError(null);
    const res = await getGovernancePolicies();
    if (res.ok) {
      setPolicies(res.data.policies);
    } else {
      setPoliciesError(res.data);
    }
    setLoadingPolicies(false);
  };

  // Fetch proposals
  const loadProposals = async () => {
    setLoadingProposals(true);
    setProposalsError(null);
    const res = await getGovernanceProposals();
    if (res.ok) {
      setProposals(res.data.data || []);
    } else {
      setProposalsError(res.data);
    }
    setLoadingProposals(false);
  };

  // Fetch audit stream
  const loadAudit = async () => {
    setLoadingAudit(true);
    setAuditError(null);
    const res = await getGovernanceAuditLogs();
    if (res.ok) {
      setAuditLogs(res.data.data || []);
    } else {
      setAuditError(res.data);
    }
    setLoadingAudit(false);
  };

  useEffect(() => {
    if (isAdmin) {
      loadPolicies();
      loadProposals();
      loadAudit();
    } else {
      setPolicies(null);
      setProposals([]);
      setAuditLogs([]);
    }
  }, [currentUser]);

  // Execute an action via the Simulator
  const handleDispatchSimulator = async (actionToRun) => {
    const targetAction = actionToRun || simAction;
    setSimLoading(true);
    setSimResponse(null);

    const parameters = {};
    if (targetAction === 'propose_commission_adjustment') {
      parameters.targetAffiliateId = simTargetAffiliate;
      parameters.proposedRate = Number(simProposedRate);
      parameters.reason = simReason;
    }

    const startTime = performance.now();
    const res = await dispatchGovernanceAction(targetAction, parameters);
    const latency = Math.round(performance.now() - startTime);

    setSimResponse({
      status: res.status,
      ok: res.ok,
      latencyMs: latency,
      data: res.data
    });

    setSimLoading(false);

    // Refresh proposals and audit if Admin
    if (isAdmin) {
      loadProposals();
      loadAudit();
    }

    if (onNotify) {
      if (res.ok) {
        onNotify('success', `Action [${targetAction}] dispatched: ${res.data.outcome || 'OK'}`);
      } else {
        onNotify('error', `Action blocked by policy: ${res.data.code || 'BLOCKED'}`);
      }
    }
  };

  // Handle Proposal Approval
  const handleApprove = async (proposalId) => {
    const notes = actionNotes[proposalId] || 'Approved via Human-in-the-Loop review';
    const res = await approveGovernanceProposal(proposalId, notes);
    if (res.ok) {
      if (onNotify) onNotify('success', `Proposal [${proposalId}] approved! Commission rate updated.`);
      loadProposals();
      loadAudit();
    } else {
      if (onNotify) onNotify('error', res.data.message || 'Approval failed');
    }
  };

  // Handle Proposal Rejection
  const handleReject = async (proposalId) => {
    const reason = actionNotes[proposalId] || 'Rejected by administrator: Rate adjustment not justified.';
    const res = await rejectGovernanceProposal(proposalId, reason);
    if (res.ok) {
      if (onNotify) onNotify('info', `Proposal [${proposalId}] rejected.`);
      loadProposals();
      loadAudit();
    } else {
      if (onNotify) onNotify('error', res.data.message || 'Rejection failed');
    }
  };

  const filteredProposals = proposals.filter((p) => {
    if (proposalsFilter === 'all') return true;
    return p.status === proposalsFilter;
  });

  const filteredAudit = auditLogs.filter((l) => {
    if (auditFilter === 'ALL') return true;
    return l.outcome === auditFilter;
  });

  return (
    <div className="space-y-4">
      {/* View Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shadow-xs flex-shrink-0">
              <Sliders size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Agent Governance & Guardrails</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  MODULE 2
                </span>
                <span className="badge badge-admin text-[10px]">AI Policy Engine</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                Multi-layer oversight: Combining <strong>Role-Based Access Control</strong> with <strong>Policy Guardrails</strong>, <strong>Human-in-the-Loop (HITL)</strong> approval queues, and immutable append-only auditing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Reviewer Context:</span>
            {isAdmin ? (
              <span className="badge badge-admin flex items-center gap-1 font-mono text-[10px]">
                <ShieldCheck size={12} /> Admin (Full Authority)
              </span>
            ) : isAgent ? (
              <span className="badge badge-agent flex items-center gap-1 font-mono text-[10px]">
                <Bot size={12} /> MarketPulse AI (Agent Dispatch)
              </span>
            ) : (
              <span className="badge badge-manager flex items-center gap-1 font-mono text-[10px]">
                <ShieldAlert size={12} /> Restricted ({currentUser?.role})
              </span>
            )}
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => setActiveSection('policies')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeSection === 'policies'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <ShieldCheck size={14} /> 1. Governance Policies
          </button>
          <button
            onClick={() => setActiveSection('simulator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeSection === 'simulator'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Play size={14} /> 2. Action Simulator
          </button>
          <button
            onClick={() => setActiveSection('proposals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeSection === 'proposals'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Clock size={14} /> 3. Human Approval Queue
            {proposals.filter(p => p.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-amber-950 font-bold">
                {proposals.filter(p => p.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSection('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeSection === 'audit'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <FileText size={14} /> 4. Agent Audit Trail
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: AGENT GOVERNANCE POLICIES                                     */}
      {/* ========================================================================= */}
      {activeSection === 'policies' && (
        <div className="space-y-6">
          {/* Agent Identity Profile */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 font-bold flex items-center justify-center">
                  <Bot size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    MarketPulse AI Agent
                    <span className="badge badge-agent text-[10px]">usr_agent_spark</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Autonomous reporting agent governed under least-privilege, boundary enforcement, and Human-in-the-Loop oversight.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500">Boundary Range:</span>
                  <span className="text-emerald-700 font-bold ml-1.5">1.0% — 50.0%</span>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <span className="text-slate-500">Policy Engine:</span>
                  <span className="text-purple-700 font-bold ml-1.5">Server Guardrails</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Tier Policy Rule Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tier 1: Whitelisted */}
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <CheckCircle size={20} />
                </div>
                <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                  Tier 1: Autonomous
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 font-mono">query_aggregate_metrics</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Policy: Whitelisted.</strong> Low-risk aggregate analytics (total clicks, conversions, gross payout volume). Executes autonomously with zero delay.
              </p>
              <div className="pt-3 border-t border-emerald-100 text-[11px] text-emerald-700 flex items-center gap-1 font-mono font-semibold">
                <ShieldCheck size={14} /> Zero PII Guaranteed
              </div>
            </div>

            {/* Tier 2: Approval Required */}
            <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Clock size={20} />
                </div>
                <span className="badge bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
                  Tier 2: Approval Required
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 font-mono">propose_commission_adjustment</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Policy: Human-in-the-Loop Review.</strong> High-impact financial modification. Proposals are queued for Admin sign-off before changes apply.
              </p>
              <div className="pt-3 border-t border-amber-100 text-[11px] text-amber-700 flex items-center gap-1 font-mono font-semibold">
                <AlertTriangle size={14} /> Admin Revalidation Required
              </div>
            </div>

            {/* Tier 3: Prohibited */}
            <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                  <XCircle size={20} />
                </div>
                <span className="badge bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold">
                  Tier 3: Prohibited
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 font-mono">read_affiliate_pii</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Policy: Forbidden (HTTP 403).</strong> Attempting to query personal affiliate data (names, emails, websites, tax forms) is terminated immediately by policy guardrails.
              </p>
              <div className="pt-3 border-t border-rose-100 text-[11px] text-rose-700 flex items-center gap-1 font-mono font-semibold">
                <ShieldAlert size={14} /> Zero-Trust Terminated
              </div>
            </div>
          </div>

          {/* Backend Policy Payload (Admin Only) */}
          {isAdmin ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={15} className="text-purple-700" />
                  Live Policy Definitions from Backend (agent_policies.json)
                </h4>
                <button
                  onClick={loadPolicies}
                  className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Refresh Policies
                </button>
              </div>
              <pre className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-56">
                {JSON.stringify(policies, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
              <Info size={16} className="text-purple-600 flex-shrink-0" />
              <span>
                You are currently viewing as <strong>{currentUser?.name}</strong> ({currentUser?.role}). Raw policy payload viewing is restricted to Administrator.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION B: AGENT ACTION SIMULATOR                                        */}
      {/* ========================================================================= */}
      {activeSection === 'simulator' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Play size={18} className="text-purple-700" />
                Interactive Agent Action Simulator
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Trigger real API dispatches to <code>POST /api/governance/dispatch</code> using the active demo identity to test how the server guardrails classify, allow, queue, or block actions.
              </p>
            </div>

            {/* Action Trigger Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSimAction('query_aggregate_metrics');
                  handleDispatchSimulator('query_aggregate_metrics');
                }}
                disabled={simLoading}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                  simAction === 'query_aggregate_metrics'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">1. Allowed Action</span>
                  <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px]">200 OK</span>
                </div>
                <div className="font-mono text-xs text-emerald-700 mt-2 font-bold">query_aggregate_metrics</div>
                <div className="text-[11px] text-slate-500 mt-1">Execute safe mathematical platform telemetry.</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimAction('propose_commission_adjustment');
                }}
                disabled={simLoading}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                  simAction === 'propose_commission_adjustment'
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">2. Approval Required</span>
                  <span className="badge bg-amber-100 text-amber-800 border border-amber-200 text-[10px]">202 Queued</span>
                </div>
                <div className="font-mono text-xs text-amber-700 mt-2 font-bold">propose_commission_adjustment</div>
                <div className="text-[11px] text-slate-500 mt-1">Submit rate recommendation for Admin review.</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimAction('read_affiliate_pii');
                  handleDispatchSimulator('read_affiliate_pii');
                }}
                disabled={simLoading}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                  simAction === 'read_affiliate_pii'
                    ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">3. Prohibited Action</span>
                  <span className="badge bg-rose-100 text-rose-800 border border-rose-200 text-[10px]">403 Blocked</span>
                </div>
                <div className="font-mono text-xs text-rose-700 mt-2 font-bold">read_affiliate_pii</div>
                <div className="text-[11px] text-slate-500 mt-1">Attempt unauthorized partner PII exfiltration.</div>
              </button>
            </div>

            {/* Custom Parameters Form for propose_commission_adjustment */}
            {simAction === 'propose_commission_adjustment' && (
              <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-xl space-y-4">
                <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Sliders size={14} className="text-amber-700" /> Proposal Parameters for propose_commission_adjustment
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Partner</label>
                    <select
                      value={simTargetAffiliate}
                      onChange={(e) => setSimTargetAffiliate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-medium"
                    >
                      <option value="aff_alice">Alice Rivera (aff_alice - Current: 15.0%)</option>
                      <option value="aff_bob">Bob Chen (aff_bob - Current: 12.5%)</option>
                      <option value="aff_charlie">Charlie Gomez (aff_charlie - Current: 10.0%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Proposed Rate (%) <span className="text-slate-400 font-normal">(1.0% to 50.0%)</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1.0"
                      max="50.0"
                      value={simProposedRate}
                      onChange={(e) => setSimProposedRate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Agent Justification</label>
                  <input
                    type="text"
                    value={simReason}
                    onChange={(e) => setSimReason(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800"
                    placeholder="Provide justification reason..."
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleDispatchSimulator('propose_commission_adjustment')}
                  disabled={simLoading}
                  className="btn-primary text-xs py-2 px-4"
                >
                  <Send size={14} /> Dispatch Proposal to Backend
                </button>
              </div>
            )}

            {/* Live Server Response Inspector */}
            {simResponse && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Backend Response:</span>
                    <span
                      className={`badge font-mono text-xs ${
                        simResponse.status === 200
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : simResponse.status === 202
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-rose-100 text-rose-800 border-rose-200'
                      }`}
                    >
                      HTTP {simResponse.status} {simResponse.data.outcome || simResponse.data.code}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    Latency: {simResponse.latencyMs}ms
                  </span>
                </div>

                <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 overflow-x-auto max-h-72">
                  {JSON.stringify(simResponse.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION C: HUMAN APPROVAL QUEUE                                          */}
      {/* ========================================================================= */}
      {activeSection === 'proposals' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock size={18} className="text-amber-600" />
                Human-in-the-Loop (HITL) Proposal Queue
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review, approve, or reject high-impact agent commission adjustments before they alter platform records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs">
                {['all', 'pending', 'approved', 'rejected'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setProposalsFilter(f)}
                    className={`px-2.5 py-1 rounded-md font-bold capitalize transition ${
                      proposalsFilter === f
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {isAdmin && (
                <button
                  onClick={loadProposals}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  title="Refresh proposal queue"
                >
                  <RotateCcw size={13} /> Refresh
                </button>
              )}
            </div>
          </div>

          {!isAdmin ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-3 shadow-sm">
              <ShieldAlert size={36} className="text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">403 Forbidden: Review Restricted to Admin</h4>
              <p className="text-xs text-slate-500">
                Your active actor (<strong>{currentUser?.name}</strong> / {currentUser?.role}) does not have <code>governance:admin</code> permissions.
                Switch to <strong>Admin Alex</strong> in the top bar to inspect and approve agent proposals.
              </p>
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs shadow-sm">
              No proposals found matching filter "{proposalsFilter}".
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProposals.map((prop) => (
                <div
                  key={prop.id}
                  className={`bg-white border rounded-2xl p-5 shadow-sm transition space-y-4 ${
                    prop.status === 'pending'
                      ? 'border-amber-300 ring-2 ring-amber-500/10'
                      : prop.status === 'approved'
                      ? 'border-emerald-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`badge font-mono text-xs ${
                          prop.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : prop.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}
                      >
                        {prop.status.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs text-slate-500 font-semibold">{prop.id}</span>
                      <span className="text-xs text-slate-400 font-mono">
                        Submitted: {new Date(prop.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-slate-700">
                      Target: <strong className="text-slate-900 font-bold">{prop.targetAffiliateName}</strong> ({prop.targetAffiliateId})
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Rate Adjustment</span>
                      <div className="text-sm font-mono mt-0.5">
                        <span className="text-slate-400 line-through mr-2">{prop.currentRate}%</span>
                        <span className="text-emerald-700 font-extrabold text-base">➔ {prop.proposedRate}%</span>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Agent Justification</span>
                      <p className="text-xs text-slate-700 mt-0.5">{prop.reason}</p>
                    </div>
                  </div>

                  {/* Resolution Details */}
                  {prop.status !== 'pending' && (
                    <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center gap-4 font-mono">
                      <div>
                        Resolved By: <strong className="text-slate-800">{prop.resolvedBy}</strong>
                      </div>
                      <div>
                        Resolved At: <span>{new Date(prop.resolvedAt).toLocaleString()}</span>
                      </div>
                      {prop.resolutionNotes && (
                        <div>
                          Notes: <span className="italic text-slate-700">"{prop.resolutionNotes}"</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin Action Controls */}
                  {prop.status === 'pending' && isAdmin && (
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="text"
                        placeholder="Optional review notes or reason..."
                        value={actionNotes[prop.id] || ''}
                        onChange={(e) =>
                          setActionNotes({ ...actionNotes, [prop.id]: e.target.value })
                        }
                        className="w-full sm:flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-purple-600"
                      />
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleApprove(prop.id)}
                          className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 w-full sm:w-auto justify-center"
                        >
                          <Check size={14} /> Approve & Update Rate
                        </button>
                        <button
                          onClick={() => handleReject(prop.id)}
                          className="btn-danger text-xs py-2 px-3.5 flex items-center gap-1.5 w-full sm:w-auto justify-center"
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION D: AGENT AUDIT LOG                                               */}
      {/* ========================================================================= */}
      {activeSection === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-purple-700" />
                Agent Governance Audit Stream
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Append-only log stored in <code>backend/data/agent_audit.json</code>. Protected from tampering and deletion through application APIs.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={loadAudit}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  title="Refresh audit stream"
                >
                  <RotateCcw size={13} /> Refresh Stream
                </button>
              )}
            </div>
          </div>

          {!isAdmin ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-3 shadow-sm">
              <ShieldAlert size={36} className="text-rose-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">403 Forbidden: Audit Stream Inaccessible</h4>
              <p className="text-xs text-slate-500">
                Governance audit records are strictly restricted to role <strong>admin</strong> (<code>governance:admin</code>).
                Switch to <strong>Admin Alex</strong> in the top bar to inspect this telemetry.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { key: 'ALL', label: `All (${auditLogs.length})` },
                  { key: 'EXECUTED', label: `Executed (${auditLogs.filter(l => l.outcome === 'EXECUTED').length})` },
                  { key: 'QUEUED_FOR_APPROVAL', label: `Queued (${auditLogs.filter(l => l.outcome === 'QUEUED_FOR_APPROVAL').length})` },
                  { key: 'APPROVED_BY_ADMIN', label: `Approved (${auditLogs.filter(l => l.outcome === 'APPROVED_BY_ADMIN').length})` },
                  { key: 'REJECTED_BY_ADMIN', label: `Rejected (${auditLogs.filter(l => l.outcome === 'REJECTED_BY_ADMIN').length})` },
                  { key: 'PROHIBITED', label: `Prohibited (${auditLogs.filter(l => l.outcome === 'PROHIBITED').length})` },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setAuditFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                      auditFilter === f.key
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3.5">Timestamp</th>
                        <th className="px-4 py-3.5">Action Name</th>
                        <th className="px-4 py-3.5">Agent ID</th>
                        <th className="px-4 py-3.5">Outcome</th>
                        <th className="px-4 py-3.5">Details / Reviewer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {filteredAudit.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-12 text-center text-slate-400 font-sans">
                            No governance audit entries match this filter.
                          </td>
                        </tr>
                      ) : (
                        filteredAudit.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="px-4 py-3.5 font-bold text-slate-900">
                              {log.actionName}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600">
                              {log.agentId}
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`badge text-[10px] ${
                                  log.outcome === 'EXECUTED'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : log.outcome === 'APPROVED_BY_ADMIN'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : log.outcome === 'QUEUED_FOR_APPROVAL'
                                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                                    : 'bg-rose-100 text-rose-800 border-rose-200'
                                }`}
                              >
                                {log.outcome}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-slate-700 max-w-md truncate font-sans text-xs">
                              {log.details}
                              {log.reviewerId && (
                                <span className="ml-2 text-purple-700 font-mono text-[11px] font-semibold">
                                  [Reviewer: {log.reviewerId}]
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
          )}
        </div>
      )}
    </div>
  );
}
