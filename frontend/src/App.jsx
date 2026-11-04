import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import AffiliatesView from './components/AffiliatesView';
import CommissionsView from './components/CommissionsView';
import AiInsightsView from './components/AiInsightsView';
import AgentGovernanceView from './components/AgentGovernanceView';
import SecuritySandboxView from './components/SecuritySandboxView';
import ActivityLogView from './components/ActivityLogView';
import RbacMatrixView from './components/RbacMatrixView';

import {
  getMe,
  getUsers,
  getAffiliates,
  getCommissions,
  getAggregateStats,
  getActiveUserId,
  setActiveUserId,
  resetDemoData
} from './api';

export default function App() {
  const [activeUserId, setActiveUserIdState] = useState(getActiveUserId());
  const [currentUser, setCurrentUser] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [affiliates, setAffiliates] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [aggregateStats, setAggregateStats] = useState(null);

  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Initial load
  const loadInitialData = async () => {
    setLoading(true);
    setConnectionError(null);
    try {
      const usersRes = await getUsers();
      let meRes = await getMe();

      if (!meRes.ok && meRes.status === 401) {
        // Fallback to default admin if stale demo id
        setActiveUserId('usr_admin_alex');
        setActiveUserIdState('usr_admin_alex');
        meRes = await getMe();
      }

      if (!usersRes.ok || !meRes.ok) {
        setConnectionError('Backend server on port 5000 is not responding. Please make sure the backend is running (npm start in backend).');
        setLoading(false);
        return;
      }

      setUsersList(usersRes.data.data || []);
      setCurrentUser(meRes.data.user);
      setConnectionError(null);

      await refreshCurrentTabData();
    } catch (err) {
      setConnectionError(`Network connection error: ${err.message}. Ensure backend is running on port 5000.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Refresh data based on active user and tab
  const refreshCurrentTabData = async () => {
    const [meRes, affRes, commRes, statsRes] = await Promise.all([
      getMe(),
      getAffiliates(),
      getCommissions(),
      getAggregateStats()
    ]);

    if (meRes.ok) setCurrentUser(meRes.data.user);
    if (affRes.ok) setAffiliates(affRes.data.data || []);
    else setAffiliates([]);

    if (commRes.ok) setCommissions(commRes.data.data || []);
    else setCommissions([]);

    if (statsRes.ok) setAggregateStats(statsRes.data.data);
    else setAggregateStats(null);
  };

  // Switch active demo actor
  const handleSwitchUser = async (newUserId) => {
    setActiveUserId(newUserId);
    setActiveUserIdState(newUserId);
    setLoading(true);

    const meRes = await getMe();
    if (meRes.ok) {
      setCurrentUser(meRes.data.user);
      showNotification('success', `Switched active demo actor to ${meRes.data.user.name} (${meRes.data.user.role})`);
    } else {
      showNotification('error', 'Failed to authenticate selected demo identity');
    }

    await refreshCurrentTabData();
    setLoading(false);
  };

  // Reset demo data to seed values
  const handleResetData = async () => {
    if (!window.confirm('Reset all demo data (affiliates, commissions, audit logs) to initial seed state?')) return;
    setLoading(true);
    const res = await resetDemoData();
    if (res.ok) {
      showNotification('success', 'Local JSON demo data reset to seed state.');
      await refreshCurrentTabData();
    } else {
      showNotification('error', `Reset failed: ${res.data.message || 'Permission denied'}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-3 text-sm font-medium transition-all ${
          notification.type === 'success'
            ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
            : 'bg-rose-950 border-rose-700 text-rose-200'
        }`}>
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        users={usersList}
        activeUserId={activeUserId}
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSwitchUser={handleSwitchUser}
        onResetData={handleResetData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {connectionError && (
          <div className="panel p-6 border-rose-800/80 bg-rose-950/30 mb-6 space-y-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-900/40 border border-rose-700/60 flex items-center justify-center text-rose-300 font-bold text-lg">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Backend Connection Offline</h3>
                <p className="text-xs text-rose-300">{connectionError}</p>
              </div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
              <div>To start the backend, open a terminal in <code>backend/</code> and run:</div>
              <div className="text-emerald-400 font-bold">npm start</div>
            </div>
            <button
              onClick={loadInitialData}
              className="btn-primary text-xs"
            >
              🔄 Retry Connection
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-4 text-xs text-indigo-400 font-mono animate-pulse">
            Syncing role permissions & server state...
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            currentUser={currentUser}
            stats={aggregateStats}
            affiliatesCount={affiliates.length}
            commissionsCount={commissions.length}
          />
        )}

        {activeTab === 'affiliates' && (
          <AffiliatesView
            affiliates={affiliates}
            currentUser={currentUser}
            onRefresh={refreshCurrentTabData}
            onNotify={showNotification}
          />
        )}

        {activeTab === 'commissions' && (
          <CommissionsView
            commissions={commissions}
            currentUser={currentUser}
            onRefresh={refreshCurrentTabData}
            onNotify={showNotification}
          />
        )}

        {activeTab === 'ai-insights' && (
          <AiInsightsView currentUser={currentUser} />
        )}

        {activeTab === 'governance' && (
          <AgentGovernanceView
            currentUser={currentUser}
            onNotify={showNotification}
          />
        )}

        {activeTab === 'sandbox' && (
          <SecuritySandboxView onRefreshAudit={refreshCurrentTabData} />
        )}

        {activeTab === 'activity' && (
          <ActivityLogView currentUser={currentUser} />
        )}

        {activeTab === 'matrix' && (
          <RbacMatrixView currentUser={currentUser} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0c111d] py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Affiliate Access Lab — Educational RBAC & Least-Privilege Prototype
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-emerald-400">● Backend: Port 5000</span>
            <span className="text-indigo-400">● Frontend: Port 5173</span>
            <span className="text-slate-400">● Zero External DB</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

