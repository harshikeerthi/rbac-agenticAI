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
  Info
} from 'lucide-react';
import {
  getGovernancePolicies,
  getGovernanceProposals,
  approveGovernanceProposal,
  rejectGovernanceProposal,
  dispatchGovernanceAction,
  getGovernanceAuditLogs
} from '../api';

export default function AgentGovernanceView({ currentUser, onNotify }) {
  const isAdmin = currentUser?.role === 'admin';
  const isAgent = currentUser?.role === 'ai_agent';

  // Section sub-tabs for organized navigation
  const [activeSection, setActiveSection] = useState('policies'); // 'policies', 'simulator', 'proposals', 'audit'

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
  const [auditFilter, setAuditFilter] = useState('ALL'); // 'ALL', 'EXECUTED', 'QUEUED_FOR_APPROVAL', 'PROHIBITED', 'APPROVED_BY_ADMIN', 'REJECTED_BY_ADMIN'
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
      // Non-admins cannot read admin-only governance lists
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
    <div className="space-y-6">
      {/* View Header */}
      <div className="panel p-6 border-indigo-900/40 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
              <Sliders size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Agent Governance & Audit</h2>
                <span className="badge badge-admin">Enterprise AI Guardrails</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Dual-layer oversight: Combining strict <strong>Role-Based Access Control</strong> with <strong>Policy Guardrails</strong>, <strong>Human-in-the-Loop (HITL)</strong> approvals, and append-only auditing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Reviewer Mode:</span>
            {isAdmin ? (
              <span className="badge badge-admin flex items-center gap-1 font-mono text-[11px]">
                <ShieldCheck size={12} /> Admin (Full Authority)
              </span>
            ) : isAgent ? (
              <span className="badge badge-agent flex items-center gap-1 font-mono text-[11px]">
                <Bot size={12} /> MarketPulse AI (Agent Dispatch)
              </span>
            ) : (
              <span className="badge badge-manager flex items-center gap-1 font-mono text-[11px]">
                <ShieldAlert size={12} /> Restricted ({currentUser?.role})
              </span>
            )}
          </div>
        </div>

        {/* Section Navigation Pills */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveSection('policies')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeSection === 'policies'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck size={14} /> 1. Governance Policies
          </button>
          <button
            onClick={() => setActiveSection('simulator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeSection === 'simulator'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Play size={14} /> 2. Action Simulator
          </button>
          <button
            onClick={() => setActiveSection('proposals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeSection === 'proposals'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock size={14} /> 3. Human Approval Queue
            {proposals.filter(p => p.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-black font-bold">
                {proposals.filter(p => p.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSection('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeSection === 'audit'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
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
          <div className="panel p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Bot size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    MarketPulse AI Agent
                    <span className="badge badge-agent text-[10px]">usr_agent_spark</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Simulated analytical agent governed under least-privilege, boundary enforcement, and Human-in-the-Loop oversight.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-400">Rate Limit Boundary:</span>
                  <span className="text-emerald-400 font-bold ml-1.5">1.0% — 50.0%</span>
                </div>
                <div className="border-l border-slate-800 pl-3">
                  <span className="text-slate-400">Model Type:</span>
                  <span className="text-indigo-400 font-bold ml-1.5">Deterministic Local</span>
                </div>
              </div>
            </div>
          </div>

          {/* Policy Rule Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Allowed Action */}
            <div className="panel p-5 border-emerald-900/40 bg-emerald-950/10">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  <CheckCircle size={18} />
                </div>
                <span className="badge bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 text-[10px]">
                  Autonomous
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-3 font-mono">query_aggregate_metrics</h4>
              <p className="text-xs text-slate-300 mt-1.5">
                <strong>Policy: Allowed.</strong> Low-risk mathematical analytics (total clicks, conversions, gross payout volume). Executes autonomously with zero delay.
              </p>
              <div className="mt-4 pt-3 border-t border-emerald-900/40 text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                <ShieldCheck size={14} /> Zero PII Guaranteed
              </div>
            </div>

            {/* Card 2: Approval Required */}
            <div className="panel p-5 border-amber-900/40 bg-amber-950/10">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                  <Clock size={18} />
                </div>
                <span className="badge bg-amber-900/60 text-amber-300 border border-amber-700/50 text-[10px]">
                  HITL Review
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-3 font-mono">propose_commission_adjustment</h4>
              <p className="text-xs text-slate-300 mt-1.5">
                <strong>Policy: Requires Human Approval.</strong> High-impact financial modification. The agent cannot apply changes directly; proposals are queued for Admin sign-off.
              </p>
              <div className="mt-4 pt-3 border-t border-amber-900/40 text-[11px] text-amber-400 flex items-center gap-1 font-mono">
                <AlertTriangle size={14} /> Admin Revalidation Required
              </div>
            </div>

            {/* Card 3: Prohibited Action */}
            <div className="panel p-5 border-rose-900/40 bg-rose-950/10">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs">
                  <XCircle size={18} />
                </div>
                <span className="badge bg-rose-900/60 text-rose-300 border border-rose-700/50 text-[10px]">
                  Prohibited
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-3 font-mono">read_affiliate_pii</h4>
              <p className="text-xs text-slate-300 mt-1.5">
                <strong>Policy: Forbidden (HTTP 403).</strong> Attempting to query personal affiliate data (names, emails, websites, tax forms) is terminated immediately by policy guardrails.
              </p>
              <div className="mt-4 pt-3 border-t border-rose-900/40 text-[11px] text-rose-400 flex items-center gap-1 font-mono">
                <ShieldAlert size={14} /> Zero-Trust Terminated
              </div>
            </div>
          </div>

          {/* Backend Policy Payload (Admin Only) */}
          {isAdmin ? (
            <div className="panel p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText size={14} className="text-indigo-400" />
                  Live Policy Payload from backend (agent_policies.json)
                </h4>
                <button
                  onClick={loadPolicies}
                  className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Refresh Policies
                </button>
              </div>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto max-h-56">
                {JSON.stringify(policies, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="panel p-4 bg-slate-900/60 border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <Info size={16} className="text-indigo-400 flex-shrink-0" />
              <span>
                You are currently viewing as <strong>{currentUser?.name}</strong> ({currentUser?.role}). Direct policy inspection is restricted to the Administrator on the backend.
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
          <div className="panel p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Play size={18} className="text-indigo-400" />
                Interactive Agent Action Simulator
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Trigger real API calls to <code>POST /api/governance/dispatch</code> using the active demo identity to observe how the governance engine classifies, allows, queues, or blocks each action.
              </p>
            </div>

            {/* Quick Action Selector Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSimAction('query_aggregate_metrics');
                  handleDispatchSimulator('query_aggregate_metrics');
                }}
                disabled={simLoading}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  simAction === 'query_aggregate_metrics'
                    ? 'border-emerald-500 bg-emerald-950/30'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">1. Allowed Action</span>
                  <span className="badge bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 text-[10px]">200 OK</span>
                </div>
                <div className="font-mono text-xs text-emerald-400 mt-2 font-semibold">query_aggregate_metrics</div>
                <div className="text-[11px] text-slate-400 mt-1">Execute safe mathematical platform aggregates.</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimAction('propose_commission_adjustment');
                }}
                disabled={simLoading}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  simAction === 'propose_commission_adjustment'
                    ? 'border-amber-500 bg-amber-950/30'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">2. Approval Required</span>
                  <span className="badge bg-amber-900/60 text-amber-300 border border-amber-700/50 text-[10px]">202 Queued</span>
                </div>
                <div className="font-mono text-xs text-amber-400 mt-2 font-semibold">propose_commission_adjustment</div>
                <div className="text-[11px] text-slate-400 mt-1">Submit rate recommendation for Admin review.</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimAction('read_affiliate_pii');
                  handleDispatchSimulator('read_affiliate_pii');
                }}
                disabled={simLoading}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  simAction === 'read_affiliate_pii'
                    ? 'border-rose-500 bg-rose-950/30'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">3. Prohibited Action</span>
                  <span className="badge bg-rose-900/60 text-rose-300 border border-rose-700/50 text-[10px]">403 Blocked</span>
                </div>
                <div className="font-mono text-xs text-rose-400 mt-2 font-semibold">read_affiliate_pii</div>
                <div className="text-[11px] text-slate-400 mt-1">Attempt to exfiltrate personal partner data.</div>
              </button>
            </div>

            {/* Custom Parameters Form for propose_commission_adjustment */}
            {simAction === 'propose_commission_adjustment' && (
              <div className="bg-slate-950 border border-amber-900/40 p-4 rounded-xl space-y-4">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sliders size={14} /> Proposal Parameters for propose_commission_adjustment
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Target Partner</label>
                    <select
                      value={simTargetAffiliate}
                      onChange={(e) => setSimTargetAffiliate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    >
                      <option value="aff_alice">Alice Rivera (aff_alice - Current: 15.0%)</option>
                      <option value="aff_bob">Bob Chen (aff_bob - Current: 12.5%)</option>
                      <option value="aff_charlie">Charlie Gomez (aff_charlie - Current: 10.0%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Proposed Rate (%) <span className="text-slate-500">(Boundary: 1.0% to 50.0%)</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1.0"
                      max="50.0"
                      value={simProposedRate}
                      onChange={(e) => setSimProposedRate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Justification Reason</label>
                  <input
                    type="text"
                    value={simReason}
                    onChange={(e) => setSimReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    placeholder="Provide justification for the proposed adjustment..."
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleDispatchSimulator('propose_commission_adjustment')}
                  disabled={simLoading}
                  className="btn btn-primary text-xs flex items-center gap-2 py-2 px-4"
                >
                  <Send size={14} /> Dispatch Proposal to Backend
                </button>
              </div>
            )}

            {/* Live Response Panel */}
            {simResponse && (
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Backend Response:</span>
                    <span
                      className={`badge font-mono text-xs ${
                        simResponse.status === 200
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : simResponse.status === 202
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-rose-950 text-rose-300 border-rose-800'
                      }`}
                    >
                      HTTP {simResponse.status} {simResponse.data.outcome || simResponse.data.code}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Latency: {simResponse.latencyMs}ms
                  </span>
                </div>

                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 overflow-x-auto max-h-72">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock size={18} className="text-amber-400" />
                Human-in-the-Loop (HITL) Proposal Queue
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Review, approve, or reject high-impact agent commission adjustments before they alter platform records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
                {['all', 'pending', 'approved', 'rejected'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setProposalsFilter(f)}
                    className={`px-2.5 py-1 rounded font-medium capitalize transition ${
                      proposalsFilter === f
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {isAdmin && (
                <button
                  onClick={loadProposals}
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  title="Refresh proposal queue"
                >
                  <RotateCcw size={13} /> Refresh
                </button>
              )}
            </div>
          </div>

          {!isAdmin ? (
            <div className="panel p-8 text-center max-w-xl mx-auto space-y-3">
              <ShieldAlert size={36} className="text-amber-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">403 Forbidden: Review Restricted to Admin</h4>
              <p className="text-xs text-slate-400">
                Your active actor (<strong>{currentUser?.name}</strong> / {currentUser?.role}) does not have <code>governance:admin</code> permissions.
                Switch to <strong>Admin Alex</strong> in the top bar to inspect and approve agent proposals.
              </p>
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="panel p-8 text-center text-slate-400 text-xs">
              No proposals found matching filter "{proposalsFilter}".
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProposals.map((prop) => (
                <div
                  key={prop.id}
                  className={`panel p-5 border transition ${
                    prop.status === 'pending'
                      ? 'border-amber-900/60 bg-amber-950/10'
                      : prop.status === 'approved'
                      ? 'border-emerald-900/40 bg-emerald-950/10'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`badge font-mono text-xs ${
                          prop.status === 'pending'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : prop.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}
                      >
                        {prop.status.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs text-slate-400">{prop.id}</span>
                      <span className="text-xs text-slate-400 font-mono">
                        Submitted: {new Date(prop.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs font-mono">
                      Target: <strong className="text-white">{prop.targetAffiliateName}</strong> ({prop.targetAffiliateId})
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-3 border-t border-slate-800/80">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Rate Adjustment</span>
                      <div className="text-sm font-mono mt-0.5">
                        <span className="text-slate-400 line-through mr-2">{prop.currentRate}%</span>
                        <span className="text-emerald-400 font-bold text-base">➔ {prop.proposedRate}%</span>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Agent Justification</span>
                      <p className="text-xs text-slate-300 mt-0.5">{prop.reason}</p>
                    </div>
                  </div>

                  {/* Resolution Details */}
                  {prop.status !== 'pending' && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex flex-wrap items-center gap-4">
                      <div>
                        Resolved By: <strong className="text-white font-mono">{prop.resolvedBy}</strong>
                      </div>
                      <div>
                        Resolved At: <span className="font-mono">{new Date(prop.resolvedAt).toLocaleString()}</span>
                      </div>
                      {prop.resolutionNotes && (
                        <div>
                          Notes: <span className="italic text-slate-300 font-mono">"{prop.resolutionNotes}"</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin Action Controls (Only available if pending) */}
                  {prop.status === 'pending' && isAdmin && (
                    <div className="mt-4 pt-4 border-t border-amber-900/30 flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="text"
                        placeholder="Optional review notes or rejection reason..."
                        value={actionNotes[prop.id] || ''}
                        onChange={(e) =>
                          setActionNotes({ ...actionNotes, [prop.id]: e.target.value })
                        }
                        className="w-full sm:flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleApprove(prop.id)}
                          className="btn btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 border-emerald-500 w-full sm:w-auto justify-center"
                        >
                          <Check size={14} /> Approve & Update Rate
                        </button>
                        <button
                          onClick={() => handleReject(prop.id)}
                          className="btn btn-danger text-xs py-1.5 px-3.5 flex items-center gap-1.5 w-full sm:w-auto justify-center"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText size={18} className="text-indigo-400" />
                Dedicated Agent Governance Audit Stream
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Append-only log stored in <code>agent_audit.json</code>. Protected from modification and deletion through application APIs.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={loadAudit}
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  title="Refresh audit stream"
                >
                  <RotateCcw size={13} /> Refresh Stream
                </button>
              )}
            </div>
          </div>

          {!isAdmin ? (
            <div className="panel p-8 text-center max-w-xl mx-auto space-y-3">
              <ShieldAlert size={36} className="text-rose-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">403 Forbidden: Audit Stream Inaccessible</h4>
              <p className="text-xs text-slate-400">
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
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      auditFilter === f.key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Table */}
              <div className="panel overflow-hidden border border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Action Name</th>
                        <th className="px-4 py-3">Agent ID</th>
                        <th className="px-4 py-3">Outcome</th>
                        <th className="px-4 py-3">Details / Reviewer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredAudit.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-8 text-center text-slate-500 font-sans">
                            No governance audit entries match this filter.
                          </td>
                        </tr>
                      ) : (
                        filteredAudit.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-800/30 transition">
                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="px-4 py-3 font-semibold text-white">
                              {log.actionName}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {log.agentId}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`badge text-[10px] ${
                                  log.outcome === 'EXECUTED'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : log.outcome === 'APPROVED_BY_ADMIN'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : log.outcome === 'QUEUED_FOR_APPROVAL'
                                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                                    : 'bg-rose-950 text-rose-300 border-rose-800'
                                }`}
                              >
                                {log.outcome}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-300 max-w-md truncate font-sans text-xs">
                              {log.details}
                              {log.reviewerId && (
                                <span className="ml-2 text-indigo-400 font-mono text-[11px]">
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

