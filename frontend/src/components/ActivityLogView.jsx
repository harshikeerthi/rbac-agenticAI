import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  ShieldAlert,
  Search
} from 'lucide-react';
import { getActivityLogs } from '../api';

export default function ActivityLogView({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'ALLOWED', 'DENIED'
  const [searchQuery, setSearchQuery] = useState('');
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
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center max-w-2xl mx-auto space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">403 Forbidden: Activity Log Inaccessible</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Your active identity role (<strong>{currentUser?.role}</strong>) does not have the <code>activity:read</code> permission.
        </p>
        <div className="bg-slate-900 text-white rounded-xl p-4 text-left font-mono text-xs space-y-1">
          <div className="text-rose-400 font-bold">HTTP Status: 403 Forbidden</div>
          <div className="text-slate-300">Error Code: {deniedInfo.code || 'INSUFFICIENT_PERMISSIONS'}</div>
          <div className="text-slate-400">Required Permission: [activity:read]</div>
        </div>
        <p className="text-xs text-slate-500">
          Switch to <strong>Admin</strong> or <strong>Affiliate Manager</strong> using the top bar to inspect backend decision audit trails.
        </p>
      </div>
    );
  }

  const filteredLogs = logs.filter((item) => {
    const matchesFilter = filter === 'ALL' || item.outcome === filter;
    const matchesSearch = searchQuery.trim() === '' ||
      item.endpoint?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.userId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.method?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.details?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Activity & Decision Log</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Server-side access decisions stream: Real-time audit trail capturing both permitted actions and blocked intrusion attempts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-md font-bold transition ${
                filter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilter('ALLOWED')}
              className={`px-3 py-1 rounded-md font-bold transition ${
                filter === 'ALLOWED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Allowed ({logs.filter(l => l.outcome === 'ALLOWED').length})
            </button>
            <button
              onClick={() => setFilter('DENIED')}
              className={`px-3 py-1 rounded-md font-bold transition ${
                filter === 'DENIED' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
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

      {/* Search Input Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by endpoint, actor ID, method..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 text-slate-800"
          />
        </div>
        <span className="text-xs font-mono text-slate-400 hidden sm:inline">
          Showing {filteredLogs.length} events
        </span>
      </div>

      {/* Decision Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200 tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Outcome</th>
                <th className="p-3.5">Actor / Role</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Endpoint</th>
                <th className="p-3.5">Permission Checked</th>
                <th className="p-3.5">Details</th>
                <th className="p-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-sans">
                    No log events found for filter: {filter}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5">
                      <span className={`badge ${log.outcome === 'ALLOWED' ? 'badge-success' : 'badge-danger'}`}>
                        {log.outcome === 'ALLOWED' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {log.statusCode} {log.outcome}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{log.userId}</div>
                      <div className="text-[10px] text-slate-500 font-sans">{log.userRole}</div>
                    </td>
                    <td className="p-3.5 font-bold text-slate-700">
                      {log.method}
                    </td>
                    <td className="p-3.5 text-emerald-700 font-semibold">
                      {log.endpoint}
                    </td>
                    <td className="p-3.5 text-[11px] text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {log.requiredPermission}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700 max-w-xs truncate font-sans text-xs">
                      {log.details}
                    </td>
                    <td className="p-3.5 text-right text-[11px] text-slate-400 whitespace-nowrap font-sans">
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
