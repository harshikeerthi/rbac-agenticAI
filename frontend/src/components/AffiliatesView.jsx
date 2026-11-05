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
  ShieldAlert,
  Search,
  Filter,
  Check,
  X,
  Building,
  Mail,
  Globe,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { createAffiliate, updateAffiliate, deleteAffiliate } from '../api';

export default function AffiliatesView({
  affiliates = [],
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

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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
      <div className="panel p-8 text-center max-w-2xl mx-auto space-y-4 bg-white border border-rose-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">403 Forbidden: Individual Partner Records Inaccessible</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          The <strong>MarketPulse AI Agent</strong> is constrained by the principle of least privilege and does not possess any <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-700">affiliates:read:*</code> permissions.
        </p>
        <div className="bg-slate-900 text-white rounded-xl p-4 text-left font-mono text-xs space-y-1">
          <div className="text-rose-400 font-bold">HTTP Status: 403 Forbidden</div>
          <div className="text-slate-300">Error Code: INSUFFICIENT_PERMISSIONS</div>
          <div className="text-slate-400">Missing: [affiliates:read:all OR affiliates:read:assigned OR affiliates:read:own]</div>
        </div>
        <p className="text-xs text-slate-500">
          To view anonymized aggregate platform analytics, visit the <strong>MarketPulse AI Insights</strong> module.
        </p>
      </div>
    );
  }

  // Filter affiliates
  const filteredAffiliates = affiliates.filter(aff => {
    const matchesSearch = searchQuery.trim() === '' ||
      aff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      aff.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (aff.email && aff.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || aff.status?.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Context */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
              <Users size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Affiliate Directory</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  MODULE 1
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdmin && 'Global Administrator Scope: Viewing all affiliate partner profiles across all managers.'}
                {isManager && 'Manager Assignment Scope: Viewing only partner profiles assigned to your team.'}
                {isAffiliate && 'Publisher Ownership Scope: Viewing your personal partner profile and settings.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn-primary text-xs"
            >
              <Plus size={15} /> Onboard New Partner
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-xs font-medium cursor-not-allowed" title="Admin role required for affiliates:create">
              <Lock size={13} /> Onboard Partner (Admin Only)
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
          >
            <option value="ALL">All Statuses ({affiliates.length})</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Affiliates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAffiliates.length === 0 ? (
          <div className="col-span-full panel p-12 text-center text-slate-400 bg-white">
            <Users size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No affiliate partners found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or switch user scope.</p>
          </div>
        ) : (
          filteredAffiliates.map((aff) => (
            <div
              key={aff.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-card-hover transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm border border-slate-200">
                      {aff.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{aff.name}</h3>
                      <p className="text-[11px] text-slate-500 font-mono">{aff.id}</p>
                    </div>
                  </div>
                  <span className={`badge ${aff.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                    {aff.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Commission Rate</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {aff.commissionRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Assigned Manager</span>
                    <span className="font-mono text-sky-700 font-medium">{aff.assignedManagerId}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Category</span>
                    <span className="font-medium text-slate-700">{aff.category || 'General'}</span>
                  </div>
                  {aff.metrics && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-500">Conversions / Clicks</span>
                      <span className="font-semibold text-slate-800">
                        {aff.metrics.totalConversions} / {aff.metrics.totalClicks?.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 gap-2">
                <button
                  onClick={() => handleOpenDetails(aff)}
                  className="btn-secondary text-xs flex-1 justify-center"
                >
                  <Eye size={14} /> Inspect & Edit
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(aff.id)}
                    className="btn-danger text-xs p-2"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Affiliate Partner Profile</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedAffiliate.id}</p>
              </div>
              <button
                onClick={() => setSelectedAffiliate(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-500 font-semibold block mb-1">Partner Full Name</label>
                <input
                  type="text"
                  disabled
                  value={selectedAffiliate.name}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-slate-600 font-medium cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-slate-500 font-semibold block mb-1">Website URL (Editable by Admin & Affiliate)</label>
                <input
                  type="text"
                  disabled={isManager}
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  className={`w-full border rounded-lg p-2.5 text-slate-800 ${
                    isManager ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-500 font-semibold">Commission Rate (%)</label>
                  {!isAdmin && (
                    <span className="text-[11px] text-amber-700 flex items-center gap-1 font-semibold">
                      <Lock size={12} /> Restricted (Admin Only)
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  className={`w-full border rounded-lg p-2.5 ${
                    isAdmin ? 'bg-white border-slate-300 text-emerald-700 font-bold' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                />
              </div>

              {/* Internal Manager Notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-500 font-semibold">Internal Manager Notes</label>
                  {isAffiliate && (
                    <span className="text-[11px] text-amber-700 flex items-center gap-1 font-semibold">
                      <Lock size={12} /> Hidden from Publisher
                    </span>
                  )}
                </div>
                {isAffiliate ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 italic">
                    Restricted internal management notes are sanitized on the server for affiliate partners.
                  </div>
                ) : (
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <form onSubmit={handleCreateSubmit} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Onboard New Affiliate Partner</h3>
                <p className="text-xs text-slate-500">Requires affiliates:create permission</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Partner Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Partner Media"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. david@partnermedia.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Website URL</label>
                <input
                  type="url"
                  placeholder="https://partnermedia.com"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
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
                {loading ? 'Creating...' : 'Create Affiliate Account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
