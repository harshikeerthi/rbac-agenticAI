import React from 'react';
import {
  User,
  Shield,
  Key,
  Database,
  CheckCircle2,
  RotateCcw,
  X,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  AlertTriangle
} from 'lucide-react';

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  users = [],
  activeUserId,
  onSwitchUser,
  onResetData
}) {
  if (!isOpen) return null;

  const role = currentUser?.role;
  const permissions = currentUser?.permissions || [];

  const getRoleBadgeClass = (r) => {
    switch (r) {
      case 'admin': return 'badge-admin';
      case 'affiliate_manager': return 'badge-manager';
      case 'affiliate_user': return 'badge-affiliate';
      case 'ai_agent': return 'badge-agent';
      default: return 'badge-admin';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">User Profile & Demo Access</h2>
              <p className="text-xs text-slate-500">Identity Context & Least-Privilege Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Active Persona Card */}
          {currentUser ? (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-xl font-bold shadow-sm">
                  {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{currentUser.name}</h3>
                    <span className={`badge ${getRoleBadgeClass(role)}`}>
                      {role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{currentUser.email} • ID: {currentUser.id}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {role === 'admin' && 'System Administrator with global privileges across all partner tiers and financial payouts.'}
                    {role === 'affiliate_manager' && 'Portfolio Manager responsible for assigned partner accounts only.'}
                    {role === 'affiliate_user' && 'Independent Publisher restricted strictly to personal performance data.'}
                    {role === 'ai_agent' && 'Autonomous reporting agent restricted strictly to aggregate analytics (Zero PII).'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-sm">No identity profile loaded.</div>
          )}

          {/* Granted Permissions Cloud */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Key size={14} className="text-emerald-600" />
                Server-Granted Permissions ({permissions.length})
              </h4>
              <span className="text-[11px] font-mono text-slate-400">Enforced by backend RBAC middleware</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-white flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {permissions.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No permissions assigned to this role</span>
              ) : (
                permissions.map((perm) => (
                  <span
                    key={perm}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {perm}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Persona Switcher Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <UserCheck size={14} className="text-emerald-600" />
              Switch Active Demo Persona
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {users.map((u) => {
                const isSelected = u.id === activeUserId;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSwitchUser(u.id);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold ring-2 ring-emerald-600/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{u.role.replace('_', ' ')}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Educational Notice on Simulated Auth */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <AlertTriangle size={16} />
              Educational Note: Simulated Authentication Header
            </div>
            <p className="text-amber-700 leading-relaxed">
              This prototype sends an <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-900">x-demo-user-id</code> header with each HTTP request. The backend independently looks up this user ID in <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-900">backend/data/users.json</code> and verifies their role and permissions. In a production system, this header would be replaced with a signed cryptographically-verified session token (e.g. JWT or OAuth2 bearer token).
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => {
              onResetData();
              onClose();
            }}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 transition"
          >
            <RotateCcw size={14} /> Reset Demo Data
          </button>
          <button
            onClick={onClose}
            className="btn-secondary text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

