import React, { useState } from 'react';
import {
  AlertOctagon,
  Play,
  CheckCircle,
  XCircle,
  Terminal,
  Shield,
  Zap,
  RotateCcw,
  Send,
  Lock,
  ArrowRight
} from 'lucide-react';
import { executeDirectApiCall } from '../api';

export default function SecuritySandboxView({ onRefreshAudit }) {
  const [responseResult, setResponseResult] = useState(null);
  const [activeTestTitle, setActiveTestTitle] = useState('');
  const [activeTestExplanation, setActiveTestExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  // Custom request builder states
  const [customMethod, setCustomMethod] = useState('GET');
  const [customPath, setCustomPath] = useState('/affiliates/aff_bob');
  const [customHeader, setCustomHeader] = useState('usr_aff_alice');
  const [customBody, setCustomBody] = useState('{}');

  const attackScenarios = [
    {
      id: 'priv_esc',
      title: '1. Privilege Escalation',
      subtitle: 'Affiliate User Alice tries to create a new affiliate',
      method: 'POST',
      path: '/affiliates',
      headers: { 'x-demo-user-id': 'usr_aff_alice' },
      body: { name: 'Escalated Partner', email: 'hacked@affiliate.com' },
      expected: '403 Forbidden (INSUFFICIENT_PERMISSIONS)',
      explanation: 'Alice has role [affiliate_user] which only holds [affiliates:read:own, affiliates:update:own, commissions:read:own]. The backend strictly blocks the creation request because it requires [affiliates:create].'
    },
    {
      id: 'idor',
      title: '2. Cross-Tenant Tampering (IDOR / BOLA)',
      subtitle: 'Affiliate User Alice tries to inspect Bob Chen\'s profile',
      method: 'GET',
      path: '/affiliates/aff_bob',
      headers: { 'x-demo-user-id': 'usr_aff_alice' },
      body: null,
      expected: '403 Forbidden (RESOURCE_ACCESS_DENIED)',
      explanation: 'Alice has the general role permission [affiliates:read:own]. However, the backend data ownership middleware checks whether [aff_bob.userId === usr_aff_alice]. Since it does not match, the request is rejected with RESOURCE_ACCESS_DENIED (OWNERSHIP_VIOLATION).'
    },
    {
      id: 'manager_breach',
      title: '3. Manager Portfolio Boundary Violation',
      subtitle: 'Manager Sarah Jenkins tries to inspect Manager David\'s affiliate Charlie',
      method: 'GET',
      path: '/affiliates/aff_charlie',
      headers: { 'x-demo-user-id': 'usr_mgr_sarah' },
      body: null,
      expected: '403 Forbidden (RESOURCE_ACCESS_DENIED)',
      explanation: 'Sarah is an Affiliate Manager, but Charlie is assigned to David Kim (assignedManagerId: usr_mgr_david). The backend enforces manager assignment boundaries, preventing cross-portfolio snooping.'
    },
    {
      id: 'field_tamper',
      title: '4. Restricted Field Modification',
      subtitle: 'Affiliate User Alice tries to boost her own commissionRate to 99%',
      method: 'PUT',
      path: '/affiliates/aff_alice',
      headers: { 'x-demo-user-id': 'usr_aff_alice' },
      body: { commissionRate: 99.0 },
      expected: '403 Forbidden (RESTRICTED_FIELD_UPDATE_DENIED)',
      explanation: 'Alice owns her record and has [affiliates:update:own], but the backend field-level protection middleware blocks any non-admin attempt to modify [commissionRate, assignedManagerId, status].'
    },
    {
      id: 'agent_exfil',
      title: '5. AI Agent Data Exfiltration',
      subtitle: 'MarketPulse AI Agent attempts to query raw affiliate PII directory',
      method: 'GET',
      path: '/affiliates',
      headers: { 'x-demo-user-id': 'usr_agent_spark' },
      body: null,
      expected: '403 Forbidden (INSUFFICIENT_PERMISSIONS)',
      explanation: 'The AI Agent is governed under strict Least Privilege. Its role only holds [reports:read:aggregate]. When it attempts to query individual affiliate records, the backend immediately terminates the call.'
    },
    {
      id: 'no_auth',
      title: '6. Direct API Request (Unauthenticated / No Header)',
      subtitle: 'Attacker queries the API with no identity header',
      method: 'GET',
      path: '/affiliates',
      headers: {},
      body: null,
      expected: '401 Unauthorized (MISSING_IDENTITY)',
      explanation: 'Any raw script or curl command omitting the identity header is immediately rejected at the Express authentication middleware before hitting any business logic.'
    },
    {
      id: 'role_spoof',
      title: '7. Role Spoofing in Body',
      subtitle: 'Alice sends { "role": "admin" } in request body',
      method: 'POST',
      path: '/affiliates',
      headers: { 'x-demo-user-id': 'usr_aff_alice' },
      body: { role: 'admin', name: 'Spoofed Admin' },
      expected: '403 Forbidden (INSUFFICIENT_PERMISSIONS)',
      explanation: 'The server resolves roles and permissions solely from its server-side users.json database based on the verified identity. It completely ignores any role parameter sent in the request body.'
    }
  ];

  const runScenario = async (scenario) => {
    setLoading(true);
    setActiveTestTitle(scenario.title);
    setActiveTestExplanation(scenario.explanation);

    const result = await executeDirectApiCall({
      method: scenario.method,
      path: scenario.path,
      customHeaders: scenario.headers,
      body: scenario.body
    });

    setResponseResult(result);
    setLoading(false);
    if (onRefreshAudit) onRefreshAudit();
  };

  const runCustomRequest = async () => {
    setLoading(true);
    setActiveTestTitle('Custom Terminal Request');
    setActiveTestExplanation('User-defined HTTP query executed against the local Express server.');

    let parsedBody = null;
    if (customBody && customBody.trim() !== '') {
      try {
        parsedBody = JSON.parse(customBody);
      } catch {
        parsedBody = customBody;
      }
    }

    const headers = {};
    if (customHeader) {
      headers['x-demo-user-id'] = customHeader;
    }

    const result = await executeDirectApiCall({
      method: customMethod,
      path: customPath,
      customHeaders: headers,
      body: parsedBody
    });

    setResponseResult(result);
    setLoading(false);
    if (onRefreshAudit) onRefreshAudit();
  };

  return (
    <div className="space-y-4">
      {/* Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold flex-shrink-0">
            <AlertOctagon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Security Sandbox & Attack Simulator</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                MODULE 3
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Demonstrating server-enforced boundaries: Fire unauthorized attacks and inspect live HTTP responses returned by the backend.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Attack Vector Triggers */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Zap size={14} className="text-amber-600" />
            Simulate Attack Scenarios (One-Click)
          </h3>

          <div className="space-y-2.5">
            {attackScenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => runScenario(scenario)}
                disabled={loading}
                className="w-full p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:shadow-card-hover text-left transition flex flex-col gap-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                    {scenario.title}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                    {scenario.method}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-normal leading-relaxed">{scenario.subtitle}</div>
                <div className="text-[10px] text-emerald-700 font-mono mt-0.5 font-semibold">
                  Target: {scenario.path}
                </div>
              </button>
            ))}
          </div>

          {/* Custom Terminal Request Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm mt-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
              <Terminal size={14} className="text-purple-600" /> Custom API Call Tester
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={customMethod}
                onChange={(e) => setCustomMethod(e.target.value)}
                className="bg-slate-50 text-xs text-slate-800 border border-slate-300 rounded-lg p-2 font-bold"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="/affiliates"
                className="col-span-2 bg-slate-50 text-xs text-slate-800 border border-slate-300 rounded-lg p-2 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Identity Header (x-demo-user-id)</label>
              <input
                type="text"
                value={customHeader}
                onChange={(e) => setCustomHeader(e.target.value)}
                placeholder="usr_aff_alice"
                className="w-full bg-slate-50 text-xs text-slate-800 border border-slate-300 rounded-lg p-2 font-mono"
              />
            </div>
            {(customMethod === 'POST' || customMethod === 'PUT') && (
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Request JSON Body</label>
                <textarea
                  rows={2}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  className="w-full bg-slate-50 text-xs text-slate-800 border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>
            )}
            <button
              onClick={runCustomRequest}
              disabled={loading}
              className="btn-primary w-full text-xs justify-center"
            >
              <Play size={12} /> Send Live Request to Backend
            </button>
          </div>
        </div>

        {/* Right Column: Live HTTP Response Inspector */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 sticky top-24 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Live Server Response Inspector</h3>
              </div>
              {responseResult && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500">{responseResult.latencyMs}ms</span>
                  <span className={`badge ${
                    responseResult.status >= 200 && responseResult.status < 300
                      ? 'badge-success'
                      : responseResult.status === 401
                      ? 'badge-warning'
                      : 'badge-danger'
                  }`}>
                    {responseResult.status} {responseResult.statusText || (responseResult.status === 403 ? 'Forbidden' : 'OK')}
                  </span>
                </div>
              )}
            </div>

            {!responseResult ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <AlertOctagon size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No attack executed yet</p>
                <p className="text-xs text-slate-400">Click any simulated attack scenario on the left to fire a live HTTP request to the Express server.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Educational Explanation Box */}
                {activeTestExplanation && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Shield size={14} className="text-emerald-700" /> Security Analysis: {activeTestTitle}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {activeTestExplanation}
                    </p>
                  </div>
                )}

                {/* Raw JSON Payload */}
                <div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono mb-1.5">
                    <span>Raw Backend JSON Body</span>
                    <span>Status Code: {responseResult.status}</span>
                  </div>
                  <pre className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-80 leading-snug">
                    {JSON.stringify(responseResult.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
