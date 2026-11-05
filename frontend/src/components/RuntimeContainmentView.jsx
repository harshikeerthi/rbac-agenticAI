import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Power,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Lock,
  RefreshCw,
  Clock,
  UserCheck,
  FileText,
  Sliders,
  Send,
  Eye,
  Info,
  Zap,
  ZapOff,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import {
  getContainmentStatus,
  setKillSwitch,
  setContainmentMode,
  resetCircuitBreaker,
  getContainmentAudit,
  probeAgentEndpoint
} from '../api';

export default function RuntimeContainmentView({ currentUser, onNotify }) {
  const isAdmin = currentUser?.role === 'admin';

  // Section Navigation Tabs
  const [activeSection, setActiveSection] = useState('overview'); // 'overview', 'kill-switch', 'modes', 'circuit-breaker', 'audit', 'probes'

  // Containment & Circuit Breaker State
  const [containmentState, setContainmentState] = useState(null);
  const [circuitBreaker, setCircuitBreaker] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [auditFilter, setAuditFilter] = useState('ALL');

  // Confirmation Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    warning: '',
    actionType: '',
    targetValue: null,
    confirmButtonText: '',
    confirmButtonClass: ''
  });
  const [justificationReason, setJustificationReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Live Runtime Probe State
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState(null);

  // 1. Load authoritative containment status
  const loadStatus = async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const res = await getContainmentStatus();
      if (res.ok) {
        setContainmentState(res.data.data);
        setCircuitBreaker(res.data.circuitBreaker || res.data.data?.circuitBreaker);
      } else {
        setStatusError(res.data?.message || 'Failed to fetch agent containment status');
      }
    } catch (err) {
      setStatusError(`Network connection error: ${err.message}`);
    } finally {
      setLoadingStatus(false);
    }
  };

  // 2. Load audit stream
  const loadAudit = async () => {
    setLoadingAudit(true);
    setAuditError(null);
    try {
      const res = await getContainmentAudit();
      if (res.ok) {
        setAuditLogs(res.data.data || []);
      } else {
        setAuditError(res.data?.message || 'Failed to fetch containment audit logs');
      }
    } catch (err) {
      setAuditError(`Network connection error: ${err.message}`);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadAudit();
  }, [currentUser]);

  const handleRefreshAll = async () => {
    await Promise.all([loadStatus(), loadAudit()]);
    if (onNotify) onNotify('success', 'Containment state & audit telemetry refreshed from server.');
  };

  // Open Modal Handler
  const openConfirmModal = (type, targetValue = null) => {
    setJustificationReason('');

    if (type === 'kill-switch') {
      const isCurrentlyTerminated = containmentState?.containmentMode === 'TERMINATED' || containmentState?.killSwitchEngaged;
      const willEngage = !isCurrentlyTerminated;

      setModalConfig({
        title: willEngage ? '⚠️ Engage Emergency Kill Switch?' : 'Disengage Kill Switch & Restore Agent?',
        warning: willEngage
          ? 'CRITICAL SAFETY ACTION: Engaging the kill switch halts all MarketPulse autonomous operations immediately. All protected agent endpoints will return HTTP 503 AGENT_CONTAINMENT_ACTIVE. Human administrators and users will remain unaffected.'
          : 'Restoring the kill switch will return MarketPulse to NORMAL operational mode and allow autonomous operations to resume under existing governance guardrails.',
        actionType: 'kill-switch',
        targetValue: willEngage,
        confirmButtonText: willEngage ? 'Confirm & Engage Kill Switch' : 'Confirm & Restore to NORMAL',
        confirmButtonClass: willEngage ? 'btn-danger-solid' : 'btn-primary'
      });
    } else if (type === 'mode') {
      const modeDescriptions = {
        NORMAL: 'Restores standard autonomous analytics and Human-in-the-Loop proposal submissions.',
        QUARANTINE: 'Suspends proposal generation and autonomous mutations (HTTP 403 AGENT_QUARANTINED). Only read-only aggregate metrics remain permitted.',
        TERMINATED: 'Halts all agent actions immediately with HTTP 503 AGENT_CONTAINMENT_ACTIVE.'
      };

      setModalConfig({
        title: `Transition Containment Mode to ${targetValue}?`,
        warning: modeDescriptions[targetValue] || 'State change will be recorded in the security audit trail.',
        actionType: 'mode',
        targetValue,
        confirmButtonText: `Confirm Mode Transition to ${targetValue}`,
        confirmButtonClass: targetValue === 'TERMINATED'
          ? 'btn-danger-solid'
          : targetValue === 'QUARANTINE'
          ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-xl'
          : 'btn-primary'
      });
    } else if (type === 'reset') {
      setModalConfig({
        title: 'Reset Safety Circuit Breaker & Restore NORMAL?',
        warning: 'This action will clear all accumulated prohibited violation counters (currently ' + (circuitBreaker?.currentViolations || 0) + '/3), disarm the circuit breaker, and restore MarketPulse to NORMAL operational status.',
        actionType: 'reset',
        targetValue: null,
        confirmButtonText: 'Confirm Circuit Breaker Reset',
        confirmButtonClass: 'btn-primary'
      });
    }

    setModalOpen(true);
  };

  // Submit Modal Action
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!justificationReason.trim()) {
      if (onNotify) onNotify('error', 'A mandatory administrative justification reason is required.');
      return;
    }

    setSubmittingAction(true);
    let res = null;

    if (modalConfig.actionType === 'kill-switch') {
      res = await setKillSwitch(modalConfig.targetValue, justificationReason.trim());
    } else if (modalConfig.actionType === 'mode') {
      res = await setContainmentMode(modalConfig.targetValue, justificationReason.trim());
    } else if (modalConfig.actionType === 'reset') {
      res = await resetCircuitBreaker(justificationReason.trim());
    }

    setSubmittingAction(false);
    setModalOpen(false);

    if (res && res.ok) {
      if (onNotify) onNotify('success', res.data.message || 'Operation executed successfully.');
      await Promise.all([loadStatus(), loadAudit()]);
    } else {
      if (onNotify) onNotify('error', res?.data?.message || 'Operation failed: Insufficient permissions or server error.');
    }
  };

  // Run Live Runtime Probe
  const handleRunProbe = async (probeType) => {
    setProbing(true);
    setProbeResult(null);
    try {
      const res = await probeAgentEndpoint(probeType);
      setProbeResult({
        probeType,
        status: res.status,
        ok: res.ok,
        data: res.data,
        timestamp: new Date().toLocaleTimeString()
      });
      await loadStatus();
    } catch (err) {
      setProbeResult({
        probeType,
        status: 'Error',
        ok: false,
        data: { message: err.message },
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setProbing(false);
    }
  };

  const currentMode = containmentState?.containmentMode || 'NORMAL';
  const isKillSwitchActive = containmentState?.killSwitchEngaged || currentMode === 'TERMINATED';
  const violations = circuitBreaker?.currentViolations || 0;
  const threshold = circuitBreaker?.tripThreshold || 3;
  const isCircuitTripped = circuitBreaker?.isTripped || false;

  const getModeBadgeClass = (mode) => {
    switch (mode) {
      case 'NORMAL': return 'badge-success';
      case 'QUARANTINE': return 'badge-warning';
      case 'TERMINATED': return 'badge-danger';
      default: return 'badge-neutral';
    }
  };

  const getAuditBadgeClass = (type) => {
    switch (type) {
      case 'KILL_SWITCH_ENGAGED': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'KILL_SWITCH_DISENGAGED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CIRCUIT_BREAKER_TRIPPED': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'CIRCUIT_BREAKER_RESET': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MODE_TRANSITION': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'INTERCEPTED_REQUEST': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditFilter === 'ALL') return true;
    return log.eventType === auditFilter;
  });

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs flex-shrink-0 ${
              isKillSwitchActive
                ? 'bg-rose-100 border-rose-200 text-rose-700 animate-pulse'
                : currentMode === 'QUARANTINE'
                ? 'bg-amber-100 border-amber-200 text-amber-800'
                : 'bg-emerald-100 border-emerald-200 text-emerald-800'
            }`}>
              {isKillSwitchActive ? <Power size={24} /> : currentMode === 'QUARANTINE' ? <ShieldAlert size={24} /> : <Zap size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  Agent Kill Switch & Runtime Containment
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  Module 3
                </span>
                <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${getModeBadgeClass(currentMode)}`}>
                  ● {currentMode} MODE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Server-side emergency execution control, deterministic isolation & safety circuit breaker.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshAll}
              disabled={loadingStatus || loadingAudit}
              className="btn-secondary text-xs flex items-center gap-1.5"
              title="Refresh telemetry"
            >
              <RefreshCw size={13} className={loadingStatus ? 'animate-spin' : ''} />
              Refresh Telemetry
            </button>
          </div>
        </div>

        {/* Non-Admin Access Notice */}
        {!isAdmin && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5">
            <AlertTriangle size={16} className="shrink-0 text-amber-600" />
            <div>
              <strong>Read-Only Monitoring Mode:</strong> Signed in as <strong>{currentUser?.name || 'User'}</strong> ({currentUser?.role}). Only Administrators holding <code>containment:manage</code> can engage the Kill Switch, change modes, or reset the circuit breaker.
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex space-x-1 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & Controls', icon: Activity },
          { id: 'kill-switch', label: 'Emergency Kill Switch', icon: Power },
          { id: 'modes', label: 'Containment Modes', icon: Sliders },
          { id: 'circuit-breaker', label: 'Safety Circuit Breaker', icon: ZapOff },
          { id: 'audit', label: 'Containment Audit Stream', icon: FileText },
          { id: 'probes', label: 'Live Runtime Probes', icon: Send }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                isActive
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: OVERVIEW TELEMETRY CARDS */}
      {/* ========================================================================= */}
      {(activeSection === 'overview' || activeSection === 'kill-switch') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* MarketPulse Identity Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Agent Runtime Profile</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                ai_agent
              </span>
            </div>
            <div className="text-base font-bold text-slate-900 mb-0.5">MarketPulse AI Agent</div>
            <div className="font-mono text-xs text-purple-700 mb-4 font-semibold">ID: usr_agent_spark</div>
            <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Autonomous Scope:</span>
                <span className="text-slate-800 font-semibold">Read-Only Analytics</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">High-Impact Actions:</span>
                <span className="text-amber-700 font-semibold">HITL Approval Required</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PII / Ledger Access:</span>
                <span className="text-rose-700 font-semibold">Explicitly Prohibited</span>
              </div>
            </div>
          </div>

          {/* Current Containment State Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational Mode</span>
              <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border ${getModeBadgeClass(currentMode)}`}>
                {currentMode}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-2xl font-extrabold text-slate-900">{currentMode}</span>
              <span className="text-xs text-slate-400 font-medium">status</span>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {currentMode === 'NORMAL' && 'Agent operates under standard governance policies. Non-destructive queries pass.'}
              {currentMode === 'QUARANTINE' && 'Autonomous modifications and proposals suspended. Read-only diagnostics allowed.'}
              {currentMode === 'TERMINATED' && 'All protected API requests are blocked at middleware layer (HTTP 503).'}
            </p>
            <div className="border-t border-slate-100 pt-3 text-[11px] font-mono text-slate-500 flex items-center justify-between">
              <span>Kill Switch:</span>
              <span className={isKillSwitchActive ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'}>
                {isKillSwitchActive ? '● ENGAGED (ACTIVE)' : '○ DISENGAGED (NORMAL)'}
              </span>
            </div>
          </div>

          {/* Circuit Breaker Status Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Circuit Breaker Telemetry</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                isCircuitTripped
                  ? 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}>
                {isCircuitTripped ? 'TRIPPED' : 'ARMED'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-extrabold text-slate-900">{Math.min(violations, threshold)}</span>
              <span className="text-xs text-slate-500 font-medium">/ {threshold} prohibited violations</span>
              {violations > threshold && (
                <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-bold">
                  ({violations} total recorded)
                </span>
              )}
            </div>
            {/* Visual Meter Bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-300 ${
                  violations >= 3 ? 'bg-rose-600' : violations === 2 ? 'bg-amber-500' : violations === 1 ? 'bg-sky-500' : 'bg-slate-300'
                }`}
                style={{ width: `${Math.min(100, (violations / threshold) * 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-500">
              {isCircuitTripped
                ? 'Threshold reached. Automatically shifted agent to QUARANTINE mode.'
                : `Safe buffer: ${Math.max(0, threshold - violations)} violation(s) before automatic degradation.`}
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: EMERGENCY KILL SWITCH CONTROL */}
      {/* ========================================================================= */}
      {(activeSection === 'overview' || activeSection === 'kill-switch') && (
        <div className={`rounded-2xl p-6 border-2 transition-all shadow-sm ${
          isKillSwitchActive
            ? 'border-rose-400 bg-rose-50/60 ring-4 ring-rose-500/10'
            : 'border-slate-200 bg-white'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-3 h-3 rounded-full ${isKillSwitchActive ? 'bg-rose-600 animate-ping' : 'bg-emerald-500'}`}></span>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Emergency Agent Kill Switch
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
                    isKillSwitchActive ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {isKillSwitchActive ? 'ENGAGED' : 'READY'}
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                The Kill Switch is a server-side circuit breaker that immediately halts all MarketPulse execution. When engaged, all protected requests from identity <code>usr_agent_spark</code> return <strong>HTTP 503 AGENT_CONTAINMENT_ACTIVE</strong> before any business logic executes. Human user sessions are unaffected.
              </p>
              {containmentState?.lastTransition && (
                <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-rose-700 font-bold">Last Transition:</span> {containmentState.lastTransition.previousMode} → {containmentState.lastTransition.newMode} | <span className="text-slate-800 font-semibold">Actor:</span> {containmentState.lastTransition.triggeredBy} | <span className="text-slate-800 font-semibold">Reason:</span> "{containmentState.lastTransition.reason}" ({new Date(containmentState.lastTransition.timestamp).toLocaleString()})
                </div>
              )}
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row gap-3">
              {isAdmin ? (
                isKillSwitchActive ? (
                  <button
                    onClick={() => openConfirmModal('kill-switch')}
                    className="btn-primary text-xs py-3 px-6 shadow-md"
                  >
                    <RotateCcw size={16} />
                    Disengage Switch & Restore to NORMAL
                  </button>
                ) : (
                  <button
                    onClick={() => openConfirmModal('kill-switch')}
                    className="btn-danger-solid text-xs py-3 px-6 shadow-md"
                  >
                    <Power size={16} />
                    ACTIVATE EMERGENCY KILL SWITCH
                  </button>
                )
              ) : (
                <button
                  disabled
                  className="px-6 py-3 rounded-xl font-bold text-xs bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center gap-2"
                >
                  <Lock size={14} /> Admin Privileges Required
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: CONTAINMENT MODE MANAGEMENT */}
      {/* ========================================================================= */}
      {(activeSection === 'overview' || activeSection === 'modes') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders size={18} className="text-rose-600" />
                Containment Mode State Machine
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Switch MarketPulse runtime state between permitted execution boundaries.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Current: <strong className="text-slate-900">{currentMode}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mode 1: NORMAL */}
            <div className={`p-4 rounded-xl border transition ${
              currentMode === 'NORMAL'
                ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle size={16} /> NORMAL Mode
                </span>
                {currentMode === 'NORMAL' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Standard operation. Agent executes low-risk queries autonomously and queues commission changes for Human-in-the-Loop review.
              </p>
              <button
                onClick={() => openConfirmModal('mode', 'NORMAL')}
                disabled={!isAdmin || currentMode === 'NORMAL'}
                className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  currentMode === 'NORMAL'
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'btn-primary'
                }`}
              >
                {currentMode === 'NORMAL' ? 'Currently Active' : 'Switch to NORMAL'}
              </button>
            </div>

            {/* Mode 2: QUARANTINE */}
            <div className={`p-4 rounded-xl border transition ${
              currentMode === 'QUARANTINE'
                ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-amber-800 flex items-center gap-1.5">
                  <ShieldAlert size={16} /> QUARANTINE Mode
                </span>
                {currentMode === 'QUARANTINE' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 font-bold">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Restricts proposal submission (HTTP 403 AGENT_QUARANTINED). Permits read-only telemetry queries for diagnostics and monitoring.
              </p>
              <button
                onClick={() => openConfirmModal('mode', 'QUARANTINE')}
                disabled={!isAdmin || currentMode === 'QUARANTINE'}
                className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  currentMode === 'QUARANTINE'
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-700 text-white font-bold'
                }`}
              >
                {currentMode === 'QUARANTINE' ? 'Currently Active' : 'Shift to QUARANTINE'}
              </button>
            </div>

            {/* Mode 3: TERMINATED */}
            <div className={`p-4 rounded-xl border transition ${
              currentMode === 'TERMINATED'
                ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-rose-800 flex items-center gap-1.5">
                  <Power size={16} /> TERMINATED Mode
                </span>
                {currentMode === 'TERMINATED' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-bold">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Complete shutdown. Blocks all incoming MarketPulse requests at server middleware with HTTP 503 AGENT_CONTAINMENT_ACTIVE.
              </p>
              <button
                onClick={() => openConfirmModal('mode', 'TERMINATED')}
                disabled={!isAdmin || currentMode === 'TERMINATED'}
                className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  currentMode === 'TERMINATED'
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'btn-danger-solid'
                }`}
              >
                {currentMode === 'TERMINATED' ? 'Currently Active' : 'Terminate Runtime'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: SAFETY CIRCUIT BREAKER & RESET CONTROLS */}
      {/* ========================================================================= */}
      {(activeSection === 'overview' || activeSection === 'circuit-breaker') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ZapOff size={18} className="text-amber-600" />
                Automated Safety Circuit Breaker
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Server-side violation tracking. Trips automatically into QUARANTINE after 3 prohibited action attempts.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => openConfirmModal('reset')}
                className="btn-secondary text-xs flex items-center gap-2"
              >
                <RotateCcw size={13} />
                Reset Circuit Breaker & Restore NORMAL
              </button>
            )}
          </div>

          {/* Visual Step-by-Step Violation Meter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-4 rounded-xl border text-center transition ${
              violations >= 1 ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="text-xs font-bold uppercase mb-1">Violation 1</div>
              <div className="text-sm font-extrabold">{violations >= 1 ? 'Recorded' : 'Clear'}</div>
              <div className="text-[10px] mt-1 text-slate-500">Warning Logged</div>
            </div>

            <div className={`p-4 rounded-xl border text-center transition ${
              violations >= 2 ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="text-xs font-bold uppercase mb-1">Violation 2</div>
              <div className="text-sm font-extrabold">{violations >= 2 ? 'Recorded' : 'Clear'}</div>
              <div className="text-[10px] mt-1 text-slate-500">Elevated Alert</div>
            </div>

            <div className={`p-4 rounded-xl border text-center transition ${
              violations >= 3 ? 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-400/20' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="text-xs font-bold uppercase mb-1">Violation 3 (Trip)</div>
              <div className="text-sm font-extrabold">{violations >= 3 ? 'TRIPPED' : 'Armed'}</div>
              <div className="text-[10px] mt-1 text-slate-500">Degrades to QUARANTINE</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: LIVE RUNTIME PROBES */}
      {/* ========================================================================= */}
      {(activeSection === 'overview' || activeSection === 'probes') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send size={18} className="text-rose-600" />
                Live Runtime Containment Probes
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Send real test requests as <code>usr_agent_spark</code> to verify backend containment enforcement in real time.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Simulates Agent API Calls</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => handleRunProbe('aggregate_stats')}
              disabled={probing}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">Probe 1: Aggregate Stats</div>
                <div className="text-[11px] text-emerald-700 font-mono mt-0.5 font-semibold">GET /api/reports/aggregate-stats</div>
              </div>
              <div className="text-[10px] text-slate-500 mt-2">Permitted in NORMAL & QUARANTINE. Blocked (503) in TERMINATED.</div>
            </button>

            <button
              onClick={() => handleRunProbe('propose_commission')}
              disabled={probing}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">Probe 2: Proposal Submission</div>
                <div className="text-[11px] text-amber-700 font-mono mt-0.5 font-semibold">POST /api/governance/dispatch</div>
              </div>
              <div className="text-[10px] text-slate-500 mt-2">Queued in NORMAL. Blocked (403) in QUARANTINE. Blocked (503) in TERMINATED.</div>
            </button>

            <button
              onClick={() => handleRunProbe('prohibited_violation')}
              disabled={probing}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">Probe 3: Prohibited Action</div>
                <div className="text-[11px] text-rose-700 font-mono mt-0.5 font-semibold">action: read_affiliate_pii</div>
              </div>
              <div className="text-[10px] text-slate-500 mt-2">Rejected (403). Increments circuit breaker violation counter server-side.</div>
            </button>
          </div>

          {/* Probe Live Result Console */}
          {probeResult && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 font-mono text-xs text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Probe: <strong className="text-white">{probeResult.probeType}</strong></span>
                <span className="text-slate-500">{probeResult.timestamp}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Response Code:</span>
                <span className={`px-2 py-0.5 rounded font-bold ${
                  probeResult.status === 200 || probeResult.status === 202
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : probeResult.status === 403
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  HTTP {probeResult.status}
                </span>
                <span className="text-slate-400">Outcome:</span>
                <span className="text-white font-bold">{probeResult.data?.code || probeResult.data?.outcome || 'RESPONSE'}</span>
              </div>
              <pre className="p-2.5 rounded bg-slate-950 text-[11px] text-slate-300 overflow-x-auto">
                {JSON.stringify(probeResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: SECURITY AUDIT TRAIL STREAM */}
      {/* ========================================================================= */}
      {(activeSection === 'overview' || activeSection === 'audit') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-rose-600" />
                Containment Audit Stream (Read-Only)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Append-only log of all emergency activations, mode transitions, and circuit breaker events stored in <code>backend/data/containment_audit.json</code>.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {['ALL', 'KILL_SWITCH_ENGAGED', 'CIRCUIT_BREAKER_TRIPPED', 'MODE_TRANSITION', 'CIRCUIT_BREAKER_RESET'].map((f) => (
                <button
                  key={f}
                  onClick={() => setAuditFilter(f)}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-md transition ${
                    auditFilter === f
                      ? 'bg-rose-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {loadingAudit ? (
            <div className="py-8 text-center text-xs text-rose-600 font-mono animate-pulse">
              Loading containment audit stream...
            </div>
          ) : filteredAuditLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No audit records matching filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Event Type</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Transition</th>
                    <th className="px-4 py-3">Justification Reason</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filteredAuditLogs.slice(0, 20).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded border font-semibold ${getAuditBadgeClass(log.eventType)}`}>
                          {log.eventType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-bold">{log.triggeredBy}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {log.previousMode && log.newMode
                          ? `${log.previousMode} → ${log.newMode}`
                          : 'State Recorded'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate" title={log.reason}>
                        {log.reason || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL DIALOG (Admin Mandatory Reason Requirement) */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600" />
                {modalConfig.title}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1"
              >
                ×
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              {modalConfig.warning}
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Administrative Justification Reason <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={justificationReason}
                  onChange={(e) => setJustificationReason(e.target.value)}
                  placeholder="Provide a mandatory justification reason for the audit trail..."
                  className="w-full rounded-xl bg-white border border-slate-300 p-3 text-xs text-slate-800 focus:outline-none focus:border-rose-600 font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || !justificationReason.trim()}
                  className={`text-xs ${modalConfig.confirmButtonClass}`}
                >
                  {submittingAction ? 'Processing on Server...' : modalConfig.confirmButtonText}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
