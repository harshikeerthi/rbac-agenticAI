import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  ShieldAlert
} from 'lucide-react';
import { getActivityLogs } from '../api';

export default function ActivityLogView({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'ALLOWED', 'DENIED'
  const [deniedInfo, setDeniedInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const res = await getActivityLogs();
    if (res.ok) {
      setLogs(res.data.data || []);
      setDeniedInfo(null);
    } else {
      setLogs([]);
      setDeniedInfo(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [currentUser]);

  if (deniedInfo) {
    return (
      <div className="panel p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-950/60 border border-rose-800/80 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-lg font-bold text-white">403 Forbidden: Activity Log Inaccessible</h3>
        <p className="text-sm text-slate-300">
          Your active identity role (<strong>{currentUser?.role}</strong>) does not have the <code>activity:read</code> permission.
        </p>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-left font-mono text-xs text-rose-300">
          <div>HTTP Status: 403 Forbidden</div>
          <div>Error Code: {deniedInfo.code || 'INSUFFICIENT_PERMISSIONS'}</div>
          <div>Required Permission: [activity:read]</div>
        </div>
        <p className="text-xs text-slate-400">
          Switch to <strong>Admin</strong> or <strong>Affiliate Manager</strong> in the top bar to inspect backend decision audit trails.
        </p>
      </div>
    );
  }

  const filteredLogs = logs.filter((item) => {
    if (filter === 'ALL') return true;
    return item.outcome === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={20} className="text-indigo-400" />
            Backend Access Decision Stream (In-App Activity Log)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time audit trail capturing both permitted operations and blocked intrusion attempts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                filter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilter('ALLOWED')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                filter === 'ALLOWED' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Allowed ({logs.filter(l => l.outcome === 'ALLOWED').length})
            </button>
            <button
              onClick={() => setFilter('DENIED')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                filter === 'DENIED' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Denied ({logs.filter(l => l.outcome === 'DENIED').length})
            </button>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="btn-secondary text-xs p-2"
            title="Refresh Log Stream"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="panel overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Outcome</th>
                <th className="p-3">Actor / Role</th>
                <th className="p-3">Action</th>
                <th className="p-3">Endpoint</th>
                <th className="p-3">Permission Checked</th>
                <th className="p-3">Details</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 font-sans">
                    No log events found for filter: {filter}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/50 transition">
                    <td className="p-3">
                      <span className={`badge ${log.outcome === 'ALLOWED' ? 'badge-success' : 'badge-denied'}`}>
                        {log.outcome === 'ALLOWED' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {log.statusCode} {log.outcome}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-white">{log.userId}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{log.userRole}</div>
                    </td>
                    <td className="p-3 font-bold text-slate-200">
                      {log.method}
                    </td>
                    <td className="p-3 text-indigo-300">
                      {log.endpoint}
                    </td>
                    <td className="p-3 text-[11px] text-slate-400">
                      {log.requiredPermission}
                    </td>
                    <td className="p-3 text-slate-300 max-w-xs truncate font-sans text-xs">
                      {log.details}
                    </td>
                    <td className="p-3 text-right text-[11px] text-slate-500 whitespace-nowrap font-sans">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

