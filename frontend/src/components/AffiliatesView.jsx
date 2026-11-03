import React, { useState } from 'react';
import {
  Users,
  Plus,
  Eye,
  Trash2,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { createAffiliate, updateAffiliate, deleteAffiliate } from '../api';

export default function AffiliatesView({
  affiliates,
  currentUser,
  onRefresh,
  onNotify
}) {
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editRate, setEditRate] = useState(10);
  const [loading, setLoading] = useState(false);

  // New affiliate form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [newRate, setNewRate] = useState(12);

  const role = currentUser?.role || 'unauthenticated';
  const isAdmin = role === 'admin';
  const isManager = role === 'affiliate_manager';
  const isAffiliate = role === 'affiliate_user';
  const isAiAgent = role === 'ai_agent';

  // Handle opening details modal
  const handleOpenDetails = (aff) => {
    setSelectedAffiliate(aff);
    setEditNotes(aff.internalNotes || '');
    setEditWebsite(aff.website || '');
    setEditRate(aff.commissionRate || 10);
  };

  // Handle update submission
  const handleSaveUpdate = async () => {
    if (!selectedAffiliate) return;
    setLoading(true);

    const payload = {};
    if (isAdmin) {
      payload.website = editWebsite;
      payload.internalNotes = editNotes;
      payload.commissionRate = parseFloat(editRate);
    } else if (isManager) {
      payload.internalNotes = editNotes;
    } else if (isAffiliate) {
      payload.website = editWebsite;
    }

    const res = await updateAffiliate(selectedAffiliate.id, payload);
    setLoading(false);

    if (res.ok) {
      onNotify('success', `Affiliate [${selectedAffiliate.id}] updated successfully.`);
      setSelectedAffiliate(null);
      onRefresh();
    } else {
      onNotify('error', `${res.data.code || 'UPDATE_FAILED'}: ${res.data.message}`);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete affiliate [${id}]?`)) return;
    setLoading(true);
    const res = await deleteAffiliate(id);
    setLoading(false);

    if (res.ok) {
      onNotify('success', `Affiliate [${id}] deleted successfully.`);
      onRefresh();
    } else {
      onNotify('error', `${res.data.code || 'DELETE_FAILED'}: ${res.data.message}`);
    }
  };

  // Handle create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const res = await createAffiliate({
      name: newName,
      email: newEmail,
      website: newWebsite,
      commissionRate: parseFloat(newRate),
      assignedManagerId: 'usr_mgr_sarah'
    });

    setLoading(false);
    if (res.ok) {
      onNotify('success', `Affiliate [${newName}] created successfully.`);
      setIsCreateOpen(false);
      setNewName('');
      setNewEmail('');
      setNewWebsite('');
      onRefresh();
    } else {
      onNotify('error', `${res.data.code || 'CREATE_FAILED'}: ${res.data.message}`);
    }
  };

  // If role is AI Agent, show access denied state
  if (isAiAgent) {
    return (
      <div className="panel p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-950/60 border border-rose-800/80 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-lg font-bold text-white">403 Forbidden: Individual Records Inaccessible</h3>
        <p className="text-sm text-slate-300">
          The <strong>MarketPulse AI Agent</strong> does not possess the <code>affiliates:read:*</code> permission.
        </p>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-left font-mono text-xs text-rose-300">
          <div>HTTP Status: 403 Forbidden</div>
          <div>Error Code: INSUFFICIENT_PERMISSIONS</div>
          <div>Missing Permission: [affiliates:read:all OR affiliates:read:assigned OR affiliates:read:own]</div>
        </div>
        <p className="text-xs text-slate-400">
          To view statistical aggregates, navigate to the <strong>AI Agent Summary</strong> tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scoping Explanation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users size={20} className="text-indigo-400" />
            Affiliate Partners Directory
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdmin && 'Displaying all platform affiliate accounts (Global Admin Scope).'}
            {isManager && 'Displaying only affiliates assigned to your portfolio (Manager Assignment Scope).'}
            {isAffiliate && 'Displaying your own verified affiliate profile (Data Ownership Scope).'}
          </p>
        </div>

        {/* Add Affiliate Button */}
        <div>
          {isAdmin ? (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn-primary text-xs"
            >
              <Plus size={16} /> Onboard New Affiliate
            </button>
          ) : (
            <button
              disabled
              title="Admin role required: affiliates:create"
              className="btn-primary opacity-40 cursor-not-allowed text-xs flex items-center gap-1.5"
            >
              <Lock size={14} /> Onboard Affiliate (Admin Only)
            </button>
          )}
        </div>
      </div>

      {/* Affiliates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {affiliates.length === 0 ? (
          <div className="col-span-full panel p-8 text-center text-slate-400">
            No affiliate records found matching your assigned scope.
          </div>
        ) : (
          affiliates.map((aff) => (
            <div key={aff.id} className="panel p-5 space-y-4 hover:border-slate-600 transition flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">{aff.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">{aff.id}</p>
                  </div>
                  <span className={`badge ${aff.status === 'active' ? 'badge-success' : 'badge-agent'}`}>
                    {aff.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="font-medium text-slate-200">{aff.category || 'General'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Commission Rate:</span>
                    <span className="font-semibold text-emerald-400">{aff.commissionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Manager:</span>
                    <span className="font-mono text-indigo-300">{aff.assignedManagerId}</span>
                  </div>
                  {aff.metrics && (
                    <div className="flex justify-between pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Conversions / Clicks:</span>
                      <span className="font-medium">{aff.metrics.totalConversions} / {aff.metrics.totalClicks?.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
                <button
                  onClick={() => handleOpenDetails(aff)}
                  className="btn-secondary text-xs flex-1 justify-center"
                >
                  <Eye size={14} /> Inspect & Edit
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(aff.id)}
                    className="btn-danger text-xs"
                    title="Delete Affiliate (Admin Only)"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inspect & Edit Modal */}
      {selectedAffiliate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Affiliate Partner Profile</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedAffiliate.id}</p>
              </div>
              <button
                onClick={() => setSelectedAffiliate(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Partner Full Name</label>
                <input
                  type="text"
                  disabled
                  value={selectedAffiliate.name}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Website URL (Editable by Admin & Affiliate)</label>
                <input
                  type="text"
                  disabled={isManager}
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-lg p-2 ${
                    isManager ? 'border-slate-800 text-slate-400' : 'border-slate-700 text-white'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Commission Rate (%)</label>
                  {!isAdmin && (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1">
                      <Lock size={12} /> Restricted Field (Admin Only)
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-lg p-2 ${
                    isAdmin ? 'border-slate-700 text-emerald-400 font-bold' : 'border-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                />
              </div>

              {/* Internal Manager Notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Internal Manager Notes</label>
                  {isAffiliate && (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1">
                      <Lock size={12} /> Hidden from Publisher
                    </span>
                  )}
                </div>
                {isAffiliate ? (
                  <div className="p-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-500 italic">
                    Restricted internal notes are sanitized on the server for affiliate users.
                  </div>
                ) : (
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedAffiliate(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUpdate}
                disabled={loading}
                className="btn-primary text-xs"
              >
                {loading ? 'Saving...' : 'Save Authorized Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboard New Affiliate Modal (Admin Only) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateSubmit} className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Onboard New Affiliate Partner</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Partner Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Acme Tech Reviews"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Partner Email *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="partner@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Website URL</label>
                <input
                  type="url"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-xs"
              >
                {loading ? 'Creating...' : 'Create Affiliate (Admin)'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

