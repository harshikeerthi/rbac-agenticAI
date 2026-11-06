import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import AffiliatesView from './components/AffiliatesView';
import CommissionsView from './components/CommissionsView';
import AiInsightsView from './components/AiInsightsView';
import AgentGovernanceView from './components/AgentGovernanceView';
import RuntimeContainmentView from './components/RuntimeContainmentView';
import SecuritySandboxView from './components/SecuritySandboxView';
import ActivityLogView from './components/ActivityLogView';
import RbacMatrixView from './components/RbacMatrixView';
import PrivacyAnalyticsView from './components/PrivacyAnalyticsView';
import GlobalSearchModal from './components/GlobalSearchModal';
import NotificationDrawer from './components/NotificationDrawer';
import ProfileModal from './components/ProfileModal';

import {
  getMe,
  getUsers,
  getAffiliates,
  getCommissions,
  getAggregateStats,
  getGovernanceProposals,
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
  const [pendingProposalsCount, setPendingProposalsCount] = useState(0);

  // Modals & Drawers state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Keyboard shortcut Ctrl+K / Cmd+K for Global Search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    const [meRes, affRes, commRes, statsRes, propRes] = await Promise.all([
      getMe(),
      getAffiliates(),
      getCommissions(),
      getAggregateStats(),
      getGovernanceProposals('pending').catch(() => ({ ok: false }))
    ]);

    if (meRes.ok) setCurrentUser(meRes.data.user);
    if (affRes.ok) setAffiliates(affRes.data.data || []);
    else setAffiliates([]);

    if (commRes.ok) setCommissions(commRes.data.data || []);
    else setCommissions([]);

    if (statsRes.ok) setAggregateStats(statsRes.data.data);
    else setAggregateStats(null);

    if (propRes.ok && propRes.data?.data) {
      setPendingProposalsCount(propRes.data.data.length);
    } else {
      setPendingProposalsCount(0);
    }
  };

  // Switch active demo actor
  const handleSwitchUser = async (newUserId) => {
    setActiveUserId(newUserId);
    setActiveUserIdState(newUserId);
    setLoading(true);

    const meRes = await getMe();
    if (meRes.ok) {
      setCurrentUser(meRes.data.user);
      showNotification('success', `Switched active demo persona to ${meRes.data.user.name} (${meRes.data.user.role})`);
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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#111827] overflow-x-hidden max-w-full">
      {/* Toast Notification (Top-Right positioning away from footer) */}
      {notification && (
        <div
          role="alert"
          aria-live="polite"
          className={`fixed top-16 right-6 z-50 px-4 py-2.5 rounded-xl border shadow-xl flex items-center gap-3 text-xs font-semibold transition-all animate-in slide-in-from-top-2 duration-150 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 font-bold ml-1 p-0.5"
            aria-label="Dismiss notification"
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
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        pendingProposalsCount={pendingProposalsCount}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        setActiveTab={setActiveTab}
        onSwitchUser={handleSwitchUser}
        users={usersList}
        onResetData={handleResetData}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        setActiveTab={setActiveTab}
      />

      {/* User Profile & Demo Access Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        users={usersList}
        activeUserId={activeUserId}
        onSwitchUser={handleSwitchUser}
        onResetData={handleResetData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4">
        {connectionError && (
          <div className="panel p-6 border-rose-300 bg-rose-50 mb-6 space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 font-bold text-lg">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950">Backend Connection Offline</h3>
                <p className="text-xs text-rose-800">{connectionError}</p>
              </div>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-200 space-y-1">
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
          <div className="text-center py-4 text-xs text-emerald-700 font-mono animate-pulse">
            Syncing role permissions & server state...
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            currentUser={currentUser}
            stats={aggregateStats}
            affiliatesCount={affiliates.length}
            commissionsCount={commissions.length}
            setActiveTab={setActiveTab}
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

        {/* AI Governance Views */}
        {(activeTab === 'governance' || activeTab === 'governance-policies') && (
          <AgentGovernanceView
            currentUser={currentUser}
            onNotify={showNotification}
            initialSection="policies"
          />
        )}

        {activeTab === 'governance-simulator' && (
          <AgentGovernanceView
            currentUser={currentUser}
            onNotify={showNotification}
            initialSection="simulator"
          />
        )}

        {activeTab === 'governance-proposals' && (
          <AgentGovernanceView
            currentUser={currentUser}
            onNotify={showNotification}
            initialSection="proposals"
          />
        )}

        {activeTab === 'governance-audit' && (
          <AgentGovernanceView
            currentUser={currentUser}
            onNotify={showNotification}
            initialSection="audit"
          />
        )}

        {activeTab === 'containment' && (
          <RuntimeContainmentView
            currentUser={currentUser}
            onNotify={showNotification}
          />
        )}

        {activeTab === 'privacy-analytics' && (
          <PrivacyAnalyticsView
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
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Affiliate Access Lab</span>
            <span>—</span>
            <span>Enterprise Sentinel Design System</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
            <span className="text-emerald-700 font-semibold">● Express Backend: Port 5000</span>
            <span className="text-purple-700 font-semibold">● React Vite: Port 5173</span>
            <span className="text-slate-400">● Zero External DB</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
