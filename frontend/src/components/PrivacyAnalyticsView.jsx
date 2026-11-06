import React, { useState, useEffect } from 'react';
import {
  Lock,
  EyeOff,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Users,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Info,
  Layers,
  ArrowRight,
  Database,
  Sliders,
  History,
  X,
  Zap,
  HelpCircle
} from 'lucide-react';
import { getPrivacyAnalytics, getPrivacyBudget, resetPrivacyBudget } from '../api';

export default function PrivacyAnalyticsView({ currentUser, onNotify }) {
  const [privacyPayload, setPrivacyPayload] = useState(null);
  const [budgetPayload, setBudgetPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [deniedInfo, setDeniedInfo] = useState(null);

  // Admin Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState(null);

  // Active sub-tab for Admin: 'comparison' | 'cohorts' | 'audit' | 'architecture'
  const [adminViewMode, setAdminViewMode] = useState('comparison');

  const role = currentUser?.role;
  const isAdmin = role === 'admin';
  const isAgent = role === 'ai_agent';
  const isManager = role === 'affiliate_manager';
  const isAffiliate = role === 'affiliate_user';

  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    setErrorState(null);
    setDeniedInfo(null);

    try {
      // 1. Fetch Privacy Analytics First (authoritative query)
      const params = isAdmin ? { includeOperationalAudit: 'true' } : {};
      const analyticsRes = await getPrivacyAnalytics(params);

      if (!analyticsRes.ok) {
        if (analyticsRes.status === 429) {
          // Budget Depleted error
          setErrorState({
            status: 429,
            code: analyticsRes.data?.code || 'PRIVACY_BUDGET_EXHAUSTED',
            message: analyticsRes.data?.message || 'Privacy budget depleted. Queries halted to prevent reconstruction attacks.',
            budgetStatus: analyticsRes.data?.budgetStatus
          });
          if (analyticsRes.data?.budgetStatus) {
            setBudgetPayload(prev => ({
              ...prev,
              remainingBudget: analyticsRes.data.budgetStatus.remainingBudget ?? 0.0,
              totalBudget: analyticsRes.data.budgetStatus.totalBudget ?? 10.0,
              status: 'DEPLETED'
            }));
          }
        } else if (analyticsRes.status === 403) {
          setDeniedInfo({
            status: 403,
            message: analyticsRes.data?.message || 'Access Denied: Required permission missing.',
            requiredPermission: 'reports:read:aggregate'
          });
          setLoading(false);
          setRefreshing(false);
          return;
        } else {
          setErrorState({
            status: analyticsRes.status,
            code: analyticsRes.data?.code || 'FETCH_FAILED',
            message: analyticsRes.data?.message || 'Failed to fetch privacy analytics from backend.'
          });
        }
      } else {
        // 2. Successful analytics response: update analytics state
        setPrivacyPayload(analyticsRes.data);

        // Immediate post-query budget reconciliation from analytics response (Fix 1)
        if (isAgent && analyticsRes.data?.budgetTelemetry) {
          const telemetry = analyticsRes.data.budgetTelemetry;
          setBudgetPayload(prev => ({
            ...prev,
            agentId: currentUser.id,
            totalBudget: telemetry.totalBudget,
            remainingBudget: telemetry.remainingBudget,
            status: telemetry.remainingBudget <= 0 ? 'DEPLETED' : 'ACTIVE',
            totalQueriesExecuted: prev?.totalQueriesExecuted != null ? prev.totalQueriesExecuted + 1 : undefined
          }));
        }
      }

      // 3. Post-query authoritative budget telemetry fetch for permitted supervisory or agent roles
      if (isAdmin || isAgent) {
        const budgetRes = await getPrivacyBudget();
        if (budgetRes.ok && budgetRes.data?.data) {
          setBudgetPayload(budgetRes.data.data);
        }
      } else {
        // Manager / non-agent: Do not store or display agent budget telemetry (Fix 2 & Fix 3)
        setBudgetPayload(null);
      }
    } catch (err) {
      setErrorState({
        status: 500,
        code: 'NETWORK_ERROR',
        message: err.message || 'Network error communicating with Port 5000.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser?.id, currentUser?.role]);

  // Handle Admin Budget Reset
  const handleResetBudget = async (e) => {
    e?.preventDefault();
    if (!resetReason.trim()) {
      setResetError('Administrative justification reason is mandatory.');
      return;
    }

    setResetting(true);
    setResetError(null);

    try {
      const res = await resetPrivacyBudget(resetReason.trim(), 'usr_agent_spark');
      if (res.ok) {
        if (onNotify) {
          onNotify('success', `Privacy budget successfully replenished to 10.0 ε by Admin.`);
        }
        setIsResetModalOpen(false);
        setResetReason('');
        await fetchData(true);
      } else {
        setResetError(res.data?.message || res.data?.error || 'Budget reset failed.');
      }
    } catch (err) {
      setResetError(err.message || 'Network error attempting budget reset.');
    } finally {
      setResetting(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm space-y-3">
        <div className="w-9 h-9 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold text-slate-700">Evaluating Privacy Engine & Epsilon Budget...</p>
        <p className="text-xs text-slate-400 font-mono">
          GET /api/reports/privacy-analytics • Enforcing Differential Privacy & k-Anonymity
        </p>
      </div>
    );
  }

  // 2. Denied Access State (e.g., Affiliate User role)
  if (deniedInfo || isAffiliate) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center max-w-2xl mx-auto space-y-4 shadow-sm my-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert size={32} />
        </div>
        <div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wider">
            Module 4 • Privacy Guard
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-2">403 Forbidden: Aggregate & Privacy Insights Restricted</h3>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            Your current role (<strong className="font-mono text-slate-900">{role}</strong>) is an independent publisher persona and does not have permission to inspect platform-wide aggregate telemetry.
          </p>
        </div>

        <div className="bg-slate-900 text-white rounded-xl p-4 text-left font-mono text-xs space-y-1.5 border border-slate-800">
          <div className="text-rose-400 font-bold">HTTP Status: 403 Forbidden</div>
          <div className="text-slate-300">Policy: Sentinel Least Privilege Enforcement</div>
          <div className="text-slate-400">Required Permission: <span className="text-emerald-400 font-bold">[reports:read:aggregate]</span></div>
          <div className="text-slate-400">Enforcement: Server-Side RBAC Middleware (Port 5000)</div>
        </div>

        <p className="text-xs text-slate-500">
          Switch to <strong className="text-slate-800">MarketPulse AI Agent</strong> to inspect privacy-perturbed analytics, or <strong className="text-slate-800">Admin</strong> to manage privacy budgets.
        </p>
      </div>
    );
  }

  // Budget calculations
  const totalBudget = budgetPayload?.totalBudget ?? 10.0;
  const remainingBudget = budgetPayload?.remainingBudget ?? (errorState?.budgetStatus?.remainingBudget ?? 0.0);
  const consumedBudget = Math.max(0, +(totalBudget - remainingBudget).toFixed(2));
  const budgetPercentage = Math.min(100, Math.max(0, (remainingBudget / totalBudget) * 100));
  const isBudgetDepleted = remainingBudget <= 0 || budgetPayload?.status === 'DEPLETED' || errorState?.status === 429;

  // Perturbed data extracted safely
  const perturbedData = privacyPayload?.data || {};
  const cohorts = privacyPayload?.cohorts || [];
  const guarantees = privacyPayload?.privacyGuarantees || {};
  const operationalGroundTruth = privacyPayload?.operationalGroundTruth || null;

  return (
    <div className="space-y-4">
      {/* 1. Module 4 Master Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-xs flex-shrink-0">
            <Lock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {isAgent && 'MarketPulse Privacy-Aware Analytics'}
                {isAdmin && 'Privacy Policy Engine & Budget Administration'}
                {isManager && 'Privacy-Preserving Aggregate Analytics'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                MODULE 4
              </span>
              {isAgent && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  Agent View • DP Enforced
                </span>
              )}
              {isAdmin && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Admin Console • Ground Truth Audit
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              {isAgent && 'Autonomous AI queries are bounded by Differential Privacy (Laplace noise mechanism), k-anonymity cohort suppression (k ≥ 3), and dynamic epsilon budget tracking.'}
              {isAdmin && 'Inspect operational ground truth side-by-side with DP perturbed metrics, audit agent query history, and administratively replenish privacy budgets.'}
              {isManager && 'Platform-level aggregate campaign telemetry guarded by server-side Differential Privacy and small cell suppression.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Refresh analytics and re-query server"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
            <span>{refreshing ? 'Evaluating...' : 'Query Analytics'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setResetReason('');
                setResetError(null);
                setIsResetModalOpen(true);
              }}
              className="btn-primary text-xs flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700"
              title="Administratively replenish MarketPulse epsilon privacy budget"
            >
              <RotateCcw size={13} />
              <span>Replenish Budget</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Budget Depleted Alert Banner (When budget is exhausted) */}
      {(isAgent || isAdmin) && isBudgetDepleted && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center font-bold flex-shrink-0">
              <ShieldAlert size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-rose-950">
                  {isAgent ? 'Your Privacy Budget is Depleted (429 Too Many Requests)' : 'MarketPulse Privacy Budget Depleted (429 Too Many Requests)'}
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded bg-rose-200 text-rose-900 border border-rose-300">
                  FAIL CLOSED
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                {isAgent
                  ? `You have consumed your entire allocated privacy budget (${consumedBudget} / ${totalBudget} ε). Additional aggregate queries have been halted by the backend Privacy Engine to prevent database reconstruction attacks. Contact an Administrator to replenish the allocation.`
                  : `MarketPulse AI Agent has consumed its entire allocated privacy budget (${consumedBudget} / ${totalBudget} ε). Additional aggregate queries have been halted by the backend Privacy Engine to prevent database reconstruction attacks.`}
              </p>
              <div className="mt-2 text-[11px] font-mono text-rose-900 bg-white/70 rounded-lg p-2 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span>Enforcement: <code className="font-bold">consumePrivacyBudget()</code> rejected request.</span>
                <span>Remaining: <strong className="text-rose-700">0.00 ε</strong> • Required: <strong>1.00 ε</strong></span>
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setResetReason('Administrator replenishment following budget depletion test');
                  setIsResetModalOpen(true);
                }}
                className="btn-danger text-xs flex items-center gap-1.5"
              >
                <RotateCcw size={13} /> Replenish Privacy Budget Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Role-Based Privacy Budget Telemetry or Manager Unrestricted Notice */}
      {(isAgent || isAdmin) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                ε
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  {isAdmin ? 'Supervisory Agent Privacy Budget (MarketPulse)' : 'MarketPulse Privacy Budget Telemetry'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isAdmin
                    ? 'Administrative oversight of autonomous agent privacy consumption (stored in backend/data/privacy_state.json)'
                    : 'Authoritative server-side consumption tracking stored in backend/data/privacy_state.json'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                isBudgetDepleted
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : budgetPercentage < 30
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}>
                {isBudgetDepleted ? '● DEPLETED (0 ε)' : `● ACTIVE (${remainingBudget.toFixed(2)} ε REMAINING)`}
              </span>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {budgetPayload?.totalQueriesExecuted ?? 0} Queries Executed
              </span>
            </div>
          </div>

          {/* Progress Bar Gauge */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600 flex items-center gap-1">
                <span>Budget Consumed:</span>
                <strong className="font-mono text-slate-900">{consumedBudget.toFixed(2)} ε</strong>
                <span className="text-slate-400 font-normal">({(100 - budgetPercentage).toFixed(0)}%)</span>
              </span>
              <span className="text-slate-600 flex items-center gap-1">
                <span>Remaining Allocation:</span>
                <strong className={`font-mono ${
                  isBudgetDepleted ? 'text-rose-600' : budgetPercentage < 30 ? 'text-amber-600' : 'text-emerald-700'
                }`}>
                  {remainingBudget.toFixed(2)} ε / {totalBudget.toFixed(1)} ε
                </strong>
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isBudgetDepleted
                    ? 'bg-rose-500'
                    : budgetPercentage < 30
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-emerald-500 to-indigo-500'
                }`}
                style={{ width: `${budgetPercentage}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Query Cost: 1.00 ε per query</span>
              <span>Target: usr_agent_spark</span>
              <span>Composition Model: Basic Sequential</span>
            </div>
          </div>
        </div>
      )}

      {/* Human Manager Unrestricted Session Notice */}
      {isManager && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  Operational Manager Session • Unrestricted Epsilon
                </h3>
                <p className="text-[11px] text-slate-500">
                  Human manager queries operate without differential privacy budget constraints
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 self-start sm:self-auto">
              ● ZERO AGENT BUDGET CONSUMPTION
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed pt-1">
            As a Partner Manager (<strong className="text-slate-800">{currentUser?.name}</strong>), your platform aggregate analytics queries are authorized under standard operational governance and <strong>do not consume or alter MarketPulse's differential privacy budget</strong>. Epsilon deductions and budget depletion constraints apply exclusively to autonomous AI agent requests to protect against reconstruction attacks.
          </p>
        </div>
      )}

      {/* 4. Agent View or Admin Comparative View */}
      {isAdmin ? (
        /* ================= ADMIN CONSOLE ================= */
        <div className="space-y-4">
          {/* Admin Navigation Pills */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setAdminViewMode('comparison')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                adminViewMode === 'comparison'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Dual Telemetry Comparison (Ground Truth vs DP)
            </button>
            <button
              onClick={() => setAdminViewMode('cohorts')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                adminViewMode === 'cohorts'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              k-Anonymity Cohorts ({cohorts.length})
            </button>
            <button
              onClick={() => setAdminViewMode('audit')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                adminViewMode === 'audit'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Privacy Audit Trail ({budgetPayload?.history?.length || 0})
            </button>
            <button
              onClick={() => setAdminViewMode('architecture')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                adminViewMode === 'architecture'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Educational DP Specification
            </button>
          </div>

          {/* Sub-view 1: Dual Telemetry Comparison */}
          {adminViewMode === 'comparison' && (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-indigo-600" />
                  <span>
                    <strong>Authoritative Ledger Comparison:</strong> Comparing operational ground truth against Laplace-perturbed agent figures.
                  </span>
                </div>
                <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                  Differential Privacy: ε = 1.0
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">Metric Dimension</th>
                        <th className="py-3 px-4 text-emerald-800 bg-emerald-50/50">
                          Operational Ground Truth (Database)
                        </th>
                        <th className="py-3 px-4 text-indigo-900 bg-indigo-50/50">
                          MarketPulse View (DP Perturbed)
                        </th>
                        <th className="py-3 px-4">Variance (Laplace Noise η)</th>
                        <th className="py-3 px-4">Global Sensitivity (Δf)</th>
                        <th className="py-3 px-4">Privacy Boundary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {/* Metric 1: Total Affiliates */}
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-sans font-bold text-slate-900">
                          Total Affiliates Count
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700 bg-emerald-50/20">
                          {operationalGroundTruth?.rawAffiliatesCount ?? '3'}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-700 bg-indigo-50/20">
                          {perturbedData.totalAffiliatesCount ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {operationalGroundTruth && perturbedData.totalAffiliatesCount
                            ? `${(perturbedData.totalAffiliatesCount - operationalGroundTruth.rawAffiliatesCount > 0 ? '+' : '')}${perturbedData.totalAffiliatesCount - operationalGroundTruth.rawAffiliatesCount}`
                            : 'Bounded'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">Δf = 1 (b = 5, ε = 0.20)</td>
                        <td className="py-3 px-4 font-sans text-[11px] text-slate-500">
                          Symmetric (clamped at N ≥ 0)
                        </td>
                      </tr>

                      {/* Metric 2: Total Platform Clicks */}
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-sans font-bold text-slate-900">
                          Total Platform Clicks
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700 bg-emerald-50/20">
                          {operationalGroundTruth?.rawClicks?.toLocaleString() ?? '25,400'}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-700 bg-indigo-50/20">
                          {perturbedData.totalPlatformClicks?.toLocaleString() ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {operationalGroundTruth && perturbedData.totalPlatformClicks
                            ? `${(perturbedData.totalPlatformClicks - operationalGroundTruth.rawClicks > 0 ? '+' : '')}${(perturbedData.totalPlatformClicks - operationalGroundTruth.rawClicks).toLocaleString()}`
                            : 'Perturbed'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">Δf = 15,000 (b = 75k, ε = 0.20)</td>
                        <td className="py-3 px-4 font-sans text-[11px] text-slate-500">
                          Per-partner click clamp
                        </td>
                      </tr>

                      {/* Metric 3: Total Platform Conversions */}
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-sans font-bold text-slate-900">
                          Total Platform Conversions
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700 bg-emerald-50/20">
                          {operationalGroundTruth?.rawConversions?.toLocaleString() ?? '1,364'}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-700 bg-indigo-50/20">
                          {perturbedData.totalPlatformConversions?.toLocaleString() ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {operationalGroundTruth && perturbedData.totalPlatformConversions
                            ? `${(perturbedData.totalPlatformConversions - operationalGroundTruth.rawConversions > 0 ? '+' : '')}${(perturbedData.totalPlatformConversions - operationalGroundTruth.rawConversions).toLocaleString()}`
                            : 'Perturbed'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">Δf = 1,000 (b = 5k, ε = 0.20)</td>
                        <td className="py-3 px-4 font-sans text-[11px] text-slate-500">
                          Per-partner conv clamp
                        </td>
                      </tr>

                      {/* Metric 4: Platform Conversion Rate */}
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-sans font-bold text-slate-900">
                          Platform Conversion Rate
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700 bg-emerald-50/20">
                          {operationalGroundTruth && operationalGroundTruth.rawClicks > 0
                            ? `${((operationalGroundTruth.rawConversions / operationalGroundTruth.rawClicks) * 100).toFixed(2)}%`
                            : '5.37%'}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-700 bg-indigo-50/20">
                          {perturbedData.platformConversionRate ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-sans text-[11px]">
                          Derived from noisy metrics
                        </td>
                        <td className="py-3 px-4 text-slate-500">Post-Processing (0 ε)</td>
                        <td className="py-3 px-4 font-sans text-[11px] text-slate-500">
                          Derived Post-Processing (0 unbudgeted ε)
                        </td>
                      </tr>

                      {/* Metric 5: Gross Commission Volume */}
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-sans font-bold text-slate-900">
                          Gross Commission Volume
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700 bg-emerald-50/20">
                          ${operationalGroundTruth?.rawVolume?.toLocaleString() ?? '3,950'}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-700 bg-indigo-50/20">
                          ${perturbedData.totalCommissionVolume?.toLocaleString() ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {operationalGroundTruth && perturbedData.totalCommissionVolume
                            ? `${(perturbedData.totalCommissionVolume - operationalGroundTruth.rawVolume > 0 ? '+' : '')}$${(perturbedData.totalCommissionVolume - operationalGroundTruth.rawVolume).toLocaleString()}`
                            : 'Perturbed'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">Δf = $3,000 (b = $15k, ε = 0.20)</td>
                        <td className="py-3 px-4 font-sans text-[11px] text-slate-500">
                          Per-affiliate clamped
                        </td>
                      </tr>

                      {/* Metric 6: Total Paid Commissions */}
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-sans font-bold text-slate-900">
                          Total Paid Commissions
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700 bg-emerald-50/20">
                          ${operationalGroundTruth?.rawPaid?.toLocaleString() ?? '2,750'}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-700 bg-indigo-50/20">
                          ${perturbedData.totalPaidCommissions?.toLocaleString() ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {operationalGroundTruth && perturbedData.totalPaidCommissions
                            ? `${(perturbedData.totalPaidCommissions - operationalGroundTruth.rawPaid > 0 ? '+' : '')}$${(perturbedData.totalPaidCommissions - operationalGroundTruth.rawPaid).toLocaleString()}`
                            : 'Perturbed'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">Δf = $3,000 (b = $15k, ε = 0.20)</td>
                        <td className="py-3 px-4 font-sans text-[11px] text-slate-500">
                          Per-affiliate clamped
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-view 2: k-Anonymity Cohorts */}
          {adminViewMode === 'cohorts' && (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-indigo-600" />
                  <span>
                    <strong>k-Anonymity Cohort Breakdown (Threshold k = 3):</strong> Cohorts with fewer than 3 partners are suppressed from agent views.
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Total Cohorts: {cohorts.length}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">Cohort / Category</th>
                        <th className="py-3 px-4">Partner Count (N)</th>
                        <th className="py-3 px-4">k-Anonymity Status</th>
                        <th className="py-3 px-4">Perturbed Clicks</th>
                        <th className="py-3 px-4">Perturbed Conversions</th>
                        <th className="py-3 px-4">Policy Enforcement Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {cohorts.map((c, idx) => {
                        const isSuppressed = c.status === 'SUPPRESSED';
                        return (
                          <tr key={idx} className={isSuppressed ? 'bg-amber-50/30' : 'hover:bg-slate-50 transition'}>
                            <td className="py-3 px-4 font-sans font-bold text-slate-900 flex items-center gap-2">
                              {isSuppressed ? <EyeOff size={14} className="text-amber-600" /> : <ShieldCheck size={14} className="text-emerald-600" />}
                              <span>{c.label || c.cohortKey}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-800 font-bold">
                              {c.actualCount}
                            </td>
                            <td className="py-3 px-4">
                              {isSuppressed ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                  SUPPRESSED
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  PUBLISHED
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {isSuppressed ? (
                                <span className="text-slate-400 italic font-sans text-[11px]">&lt;SUPPRESSED&gt;</span>
                              ) : (
                                <span className="text-slate-900 font-bold">{c.perturbedClicks?.toLocaleString()}</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {isSuppressed ? (
                                <span className="text-slate-400 italic font-sans text-[11px]">&lt;SUPPRESSED&gt;</span>
                              ) : (
                                <span className="text-slate-900 font-bold">{c.perturbedConversions?.toLocaleString()}</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-sans text-[11px] text-slate-600">
                              {isSuppressed ? (
                                <span className="text-amber-700 font-medium">{c.reason || 'Size < k=3 threshold'}</span>
                              ) : (
                                <span className="text-emerald-700">Meets cohort threshold (N ≥ 3). Laplace noise applied.</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-view 3: Privacy Audit Trail */}
          {adminViewMode === 'audit' && (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-indigo-600" />
                  <span>
                    <strong>MarketPulse Privacy Query & Reset Stream:</strong> Records of all epsilon deductions, endpoints, and admin resets.
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Target: {budgetPayload?.agentId || 'usr_agent_spark'}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                {(!budgetPayload?.history || budgetPayload.history.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    No privacy queries or replenishment events recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">Query ID</th>
                          <th className="py-3 px-4">Action / Endpoint</th>
                          <th className="py-3 px-4">ε Cost</th>
                          <th className="py-3 px-4">Remaining Balance</th>
                          <th className="py-3 px-4">Justification / Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {budgetPayload.history.map((h, idx) => {
                          const isReset = h.actionName === 'ADMIN_BUDGET_REPLENISHMENT' || h.epsilonCost === 0;
                          return (
                            <tr key={idx} className={isReset ? 'bg-indigo-50/40' : 'hover:bg-slate-50 transition'}>
                              <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                {new Date(h.timestamp).toLocaleTimeString()} ({new Date(h.timestamp).toLocaleDateString()})
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-800">
                                {h.queryId}
                              </td>
                              <td className="py-3 px-4 font-sans">
                                {isReset ? (
                                  <span className="font-bold text-indigo-700 flex items-center gap-1">
                                    <RotateCcw size={11} /> ADMIN REPLENISHMENT
                                  </span>
                                ) : (
                                  <span className="text-slate-800">{h.actionName || h.endpoint}</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {isReset ? (
                                  <span className="text-emerald-700 font-bold">0.00 ε (Reset)</span>
                                ) : (
                                  <span className="text-rose-600 font-bold">-{h.epsilonCost?.toFixed(2)} ε</span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900">
                                {h.newRemaining?.toFixed(2)} ε
                              </td>
                              <td className="py-3 px-4 font-sans text-slate-600">
                                {h.reason ? (
                                  <span className="italic text-slate-800">"{h.reason}"</span>
                                ) : (
                                  <span className="text-slate-400">Autonomous agent aggregate inquiry</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-view 4: Educational DP Architecture Panel */}
          {adminViewMode === 'architecture' && (
            <EducationalArchitecturePanel guarantees={guarantees} />
          )}
        </div>
      ) : (
        /* ================= AGENT / MANAGER VIEW ================= */
        <div className="space-y-4">
          {/* Privacy Protection Notice */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={18} className="text-indigo-600 flex-shrink-0" />
              <div>
                <span className="font-bold">Privacy-Preserving Safeguards Active:</span> All displayed figures are perturbed with calibrated Laplace noise (total ε = 1.0, partitioned across 5 metrics at ε_i = 0.20 each). Raw individual partner records, banking accounts, and identifying commission rows are mathematically unreachable.
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-indigo-100 border border-indigo-300 text-indigo-800 px-2 py-0.5 rounded flex-shrink-0">
              Aggregate Release Only (No Direct Identifiers)
            </span>
          </div>

          {/* KPI Summary Cards (Perturbed DP Metrics) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Card 1: Total Affiliates */}
            <div className="panel p-3.5 sm:p-4 bg-white border border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Partners</span>
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Users size={14} />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {perturbedData.totalAffiliatesCount ?? '—'}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Laplace noise (b = 5, ε = 0.20)</p>
            </div>

            {/* Card 2: Platform Clicks */}
            <div className="panel p-3.5 sm:p-4 bg-white border border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Platform Clicks</span>
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <TrendingUp size={14} />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {perturbedData.totalPlatformClicks?.toLocaleString() ?? '—'}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Laplace noise (b = 75k, ε = 0.20)</p>
            </div>

            {/* Card 3: Platform Conversions */}
            <div className="panel p-3.5 sm:p-4 bg-white border border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Conversions</span>
                <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Zap size={14} />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {perturbedData.totalPlatformConversions?.toLocaleString() ?? '—'}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Laplace noise (b = 5k, ε = 0.20)</p>
            </div>

            {/* Card 4: Conversion Rate */}
            <div className="panel p-3.5 sm:p-4 bg-white border border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Conversion Rate</span>
                <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Shield size={14} />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {perturbedData.platformConversionRate ?? '—'}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Derived ratio (0 unbudgeted ε)</p>
            </div>

            {/* Card 5: Commission Volume */}
            <div className="panel p-3.5 sm:p-4 bg-white border border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Gross Volume</span>
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <DollarSign size={14} />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                ${perturbedData.totalCommissionVolume?.toLocaleString() ?? '—'}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Laplace noise (b = $15k, ε = 0.20)</p>
            </div>

            {/* Card 6: Paid Commissions */}
            <div className="panel p-3.5 sm:p-4 bg-white border border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Paid Volume</span>
                <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                  <DollarSign size={14} />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                ${perturbedData.totalPaidCommissions?.toLocaleString() ?? '—'}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Laplace noise (b = $15k, ε = 0.20)</p>
            </div>
          </div>

          {/* Category Cohorts Section: Withheld for AI Agent to prevent threshold leakage; Rendered for Manager */}
          {isAgent ? (
            <div className="panel p-5 bg-white border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    <Shield size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Category Cohort Telemetry Withheld
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Least-Privilege Isolation &amp; Cohort Disclosure Control
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Threshold Status Withheld
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Category-level cohort breakdowns and raw-data-dependent suppression statuses (<code>SUPPRESSED</code> / <code>PUBLISHED</code>) are withheld from autonomous AI agent queries to prevent unbudgeted threshold leakage. MarketPulse queries are strictly bounded to the 5 feature-partitioned aggregate platform metrics (ε_i = 0.20 each, total ε = 1.00).
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs space-y-0">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={15} className="text-indigo-600" />
                    Category Breakdown (k-Anonymity Protected)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Minimum cohort size threshold: <strong>k = 3</strong>. Small cells are automatically suppressed to prevent link-attack identification.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
                  Threshold: k ≥ 3
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Category Cohort</th>
                      <th className="py-3 px-4">Cohort Size (N)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Perturbed Clicks</th>
                      <th className="py-3 px-4">Perturbed Conversions</th>
                      <th className="py-3 px-4">Protection Policy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {cohorts.map((c, idx) => {
                      const isSuppressed = c.status === 'SUPPRESSED';
                      return (
                        <tr key={idx} className={isSuppressed ? 'bg-amber-50/20' : 'hover:bg-slate-50 transition'}>
                          <td className="py-3 px-4 font-sans font-bold text-slate-900 flex items-center gap-2">
                            {isSuppressed ? (
                              <EyeOff size={14} className="text-amber-600 flex-shrink-0" />
                            ) : (
                              <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" />
                            )}
                            <span>{c.label || c.cohortKey}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {c.actualCount}
                          </td>
                          <td className="py-3 px-4">
                            {isSuppressed ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                SUPPRESSED
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                PUBLISHED
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isSuppressed ? (
                              <span className="text-slate-400 italic font-sans text-[11px]">&lt;SUPPRESSED&gt;</span>
                            ) : (
                              <span className="text-slate-900 font-bold">{c.perturbedClicks?.toLocaleString()}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isSuppressed ? (
                              <span className="text-slate-400 italic font-sans text-[11px]">&lt;SUPPRESSED&gt;</span>
                            ) : (
                              <span className="text-slate-900 font-bold">{c.perturbedConversions?.toLocaleString()}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-sans text-[11px] text-slate-600">
                            {isSuppressed ? (
                              <span className="text-amber-700 font-medium">{c.reason || 'Size < k=3 threshold'}</span>
                            ) : (
                              <span className="text-emerald-700">Satisfies k-anonymity (N ≥ 3). Category breakdown withheld.</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Educational DP Architecture Panel */}
          <EducationalArchitecturePanel guarantees={guarantees} />
        </div>
      )}

      {/* 5. Admin Budget Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Replenish Agent Privacy Budget
                  </h3>
                  <p className="text-xs text-slate-500">
                    Administrator Authorization Gate (Module 4)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Target Identity:</span>
                <span className="font-mono font-bold text-slate-900">usr_agent_spark (MarketPulse)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Current Remaining:</span>
                <span className="font-mono font-bold text-rose-600">{remainingBudget.toFixed(2)} ε</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Replenished Balance:</span>
                <span className="font-mono font-bold text-emerald-700">10.00 ε</span>
              </div>
            </div>

            <form onSubmit={handleResetBudget} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Administrative Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  placeholder="e.g., Scheduled monthly privacy budget replenishment approved by Security Review Board"
                  rows={3}
                  className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  * Mandatory for compliance. This reason is permanently recorded in the immutable activity audit log.
                </p>
              </div>

              {resetError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-rose-600 flex-shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  disabled={resetting}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting || !resetReason.trim()}
                  className="btn-primary text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {resetting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Writing State...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Authorize Replenishment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Educational Architecture Subcomponent explaining Differential Privacy & k-Anonymity
 */
function EducationalArchitecturePanel({ guarantees = {} }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
          <Layers size={18} />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Module 4 Privacy Architecture & Mathematical Principles
          </h3>
          <p className="text-[11px] text-slate-500">
            {guarantees.educationalNotice || 'Educational prototype: differential privacy, sensitivity bounds & cohort suppression.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
        {/* Pillar 1: Laplace DP */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900">1. Feature-Partitioned DP</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
              Total ε = {guarantees.epsilonApplied || '1.0'}
            </span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            The query budget (ε = 1.0) is partitioned equally across the 5 primary metrics (ε_i = 0.20 each) to satisfy Basic Sequential Composition:
          </p>
          <div className="bg-white p-2 rounded border border-slate-200 font-mono text-[10px] text-indigo-950">
            ε_total = ∑ ε_i = 5 × 0.20 = 1.00 ε
          </div>
          <p className="text-slate-500 text-[10px]">
            Where scale parameter <code className="font-mono">b_i = Δf_i / 0.20 = 5·Δf_i</code> provides mathematically rigorous accounting matching the server budget deduction.
          </p>
        </div>

        {/* Pillar 2: Bounded Sensitivity */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900">2. Calibrated Noise Scales</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Neighboring (Δf / 0.2)
            </span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Laplace noise scales are calibrated to each metric's bounded contribution:
          </p>
          <ul className="text-[10px] font-mono text-slate-700 space-y-1 list-disc list-inside">
            <li>Partner Count: Δf = 1 → b = 5</li>
            <li>Clicks: Δf = 15k → b = 75,000</li>
            <li>Conversions: Δf = 1k → b = 5,000</li>
            <li>Volume: Δf = $3k → b = $15,000</li>
            <li>Paid: Δf = $3k → b = $15,000</li>
          </ul>
        </div>

        {/* Pillar 3: k-Anonymity & Budget */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900">3. k-Anonymity & Accounting</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
              k ≥ {guarantees.kAnonymityThreshold || '3'}
            </span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Disclosure control and accounting safeguards:
          </p>
          <ul className="text-[10px] text-slate-600 space-y-1">
            <li>
              <strong>Cell Suppression:</strong> Syntactic control withholding small cohorts (&lt; 3 partners). <em>Limitation: status itself reveals threshold bound.</em>
            </li>
            <li>
              <strong>Post-Processing:</strong> Conversion rate derived from noisy outputs (0 extra ε). Active count omitted to prevent unbudgeted leakage.
            </li>
            <li>
              <strong>Budget Cap:</strong> Total budget is capped at 10.0 ε (1.0 ε/query) to limit noise averaging.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

