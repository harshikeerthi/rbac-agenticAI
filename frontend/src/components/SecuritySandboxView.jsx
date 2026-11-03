import React, { useState } from 'react';
import {
  AlertOctagon,
  Play,
  CheckCircle,
  XCircle,
  Terminal,
  Shield,
  Zap,
  RotateCcw
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
      explanation: 'Alice has role [affiliate_user] which only has [affiliates:read:own, affiliates:update:own, commissions:read:own]. The backend strictly blocks the creation request because it requires [affiliates:create].'
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
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="panel p-6 border-indigo-900/40 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <AlertOctagon size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Interactive Security Sandbox ("Tamper & Test" Playground)</h2>
            <p className="text-xs text-slate-300">
              Demonstrating server-enforced security: Execute simulated unauthorized attacks and inspect the live HTTP responses returned by the backend.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Attack Vector Triggers */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Zap size={14} className="text-amber-400" />
            Simulate Attack Scenarios (One-Click)
          </h3>

          <div className="space-y-2.5">
            {attackScenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => runScenario(scenario)}
                disabled={loading}
                className="w-full btn-attack"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-200">{scenario.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/40">
                    {scenario.method}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-normal">{scenario.subtitle}</div>
                <div className="text-[10px] text-amber-300/80 font-mono mt-0.5">
                  Target: {scenario.path}
                </div>
              </button>
            ))}
          </div>

          {/* Custom Terminal Request Box */}
          <div className="panel p-4 space-y-3 border-slate-700 mt-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <Terminal size={14} className="text-indigo-400" /> Custom API Call Tester
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={customMethod}
                onChange={(e) => setCustomMethod(e.target.value)}
                className="bg-slate-900 text-xs text-white border border-slate-700 rounded p-1.5"
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
                className="col-span-2 bg-slate-900 text-xs text-white border border-slate-700 rounded p-1.5 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Identity Header (x-demo-user-id)</label>
              <input
                type="text"
                value={customHeader}
                onChange={(e) => setCustomHeader(e.target.value)}
                placeholder="usr_aff_alice"
                className="w-full bg-slate-900 text-xs text-white border border-slate-700 rounded p-1.5 font-mono"
              />
            </div>
            {(customMethod === 'POST' || customMethod === 'PUT') && (
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Request JSON Body</label>
                <textarea
                  rows={2}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  className="w-full bg-slate-900 text-xs text-white border border-slate-700 rounded p-1.5 font-mono"
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
          <div className="panel p-5 space-y-4 sticky top-24 border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Live Server Response Inspector</h3>
              </div>
              {responseResult && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">{responseResult.latencyMs}ms</span>
                  <span className={`badge ${
                    responseResult.status >= 200 && responseResult.status < 300
                      ? 'badge-success'
                      : responseResult.status === 401
                      ? 'badge-agent'
                      : 'badge-denied'
                  }`}>
                    {responseResult.status} {responseResult.statusText || (responseResult.status === 403 ? 'Forbidden' : 'OK')}
                  </span>
                </div>
              )}
            </div>

            {!responseResult ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <AlertOctagon size={36} className="mx-auto text-slate-600" />
                <p className="text-sm">Click any attack scenario on the left to fire a real HTTP request to the Express server.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Educational Explanation Box */}
                {activeTestExplanation && (
                  <div className="p-3.5 rounded-lg bg-slate-950/80 border border-indigo-900/50 space-y-1">
                    <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Shield size={14} /> Security Analysis: {activeTestTitle}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {activeTestExplanation}
                    </p>
                  </div>
                )}

                {/* Raw JSON Payload */}
                <div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono mb-1.5">
                    <span>Raw Backend JSON Body</span>
                    <span>Status Code: {responseResult.status}</span>
                  </div>
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-80 leading-snug">
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

