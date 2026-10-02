import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCampaigns, createCampaign, updateCampaign } from '../../api/campaignApi';
import CampaignStatusBadge from '../../components/manager/CampaignStatusBadge';

const STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
const ITEMS_PER_PAGE = 10;

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getAvailableNextStatuses = (currentStatus) => {
  const norm = (currentStatus || 'DRAFT').toUpperCase();
  if (norm === 'DRAFT') {
    return ['DRAFT', 'ACTIVE', 'CANCELLED'];
  }
  if (norm === 'ACTIVE') {
    return ['ACTIVE', 'COMPLETED', 'CANCELLED'];
  }
  return [norm]; // Locked
};

const ManagerCampaigns = () => {
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    totalPages: 1,
  });

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // Form States
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    status: 'DRAFT',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: 'DRAFT',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const fetchCampaignList = useCallback(
    async (isManual = false, pageOverride) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const targetPage = pageOverride !== undefined ? pageOverride : currentPage;

      try {
        const params = {
          page: targetPage,
          limit: ITEMS_PER_PAGE,
        };
        if (statusFilter !== 'ALL') params.status = statusFilter;
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const res = await getCampaigns(params);
        let list = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && typeof res === 'object') {
          if (Array.isArray(res.data?.campaigns)) {
            list = res.data.campaigns;
            if (res.data.pagination) setPagination(res.data.pagination);
          } else if (Array.isArray(res.campaigns)) {
            list = res.campaigns;
            if (res.pagination) setPagination(res.pagination);
          } else if (Array.isArray(res.data)) {
            list = res.data;
            if (res.pagination) setPagination(res.pagination);
          }
        }
        setCampaigns(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Fetch campaigns error:', err);
        setCampaigns([]);
        showToast(err.response?.data?.message || 'Failed to load campaigns', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, statusFilter, searchQuery]
  );

  useEffect(() => {
    fetchCampaignList(false, 1);
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchCampaignList(false, currentPage);
  }, [currentPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCampaignList(false, 1);
    setCurrentPage(1);
  };

  // Create Campaign Action
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    if (!createForm.name || createForm.name.trim().length < 2) {
      setFormErrors({ name: 'Campaign name must be at least 2 characters' });
      return;
    }
    if (createForm.name.trim().length > 200) {
      setFormErrors({ name: 'Campaign name must not exceed 200 characters' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCampaign({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        status: createForm.status,
      });

      if (res.success) {
        showToast('Campaign created successfully.');
        setIsCreateModalOpen(false);
        setCreateForm({ name: '', description: '', status: 'DRAFT' });
        fetchCampaignList(false, 1);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Create campaign error:', err);
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      } else {
        showToast(err.response?.data?.message || 'Unable to create campaign.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (camp) => {
    setSelectedCampaign(camp);
    setEditForm({
      name: camp.name || '',
      description: camp.description || '',
      status: camp.status || 'DRAFT',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Edit Campaign Action
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    setFormErrors({});

    if (!editForm.name || editForm.name.trim().length < 2) {
      setFormErrors({ name: 'Campaign name must be at least 2 characters' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateCampaign(selectedCampaign.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        status: editForm.status,
      });

      if (res.success) {
        showToast('Campaign updated successfully.');
        setIsEditModalOpen(false);
        fetchCampaignList(false, currentPage);
      }
    } catch (err) {
      console.error('Update campaign error:', err);
      if (err.response?.status === 422) {
        showToast(err.response?.data?.message || 'Invalid campaign status transition.', 'error');
      } else {
        showToast(err.response?.data?.message || 'Unable to update campaign.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{toast.type === 'error' ? '[!]' : '[✓]'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Campaigns</h2>
          <p className="text-xs text-slate-500 mt-1">
            Create and manage campaigns for your organization.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchCampaignList(true)}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            onClick={() => {
              setCreateForm({ name: '', description: '', status: 'DRAFT' });
              setFormErrors({});
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
          >
            + Create Campaign
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-80 flex gap-2">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Campaign Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    Loading campaigns...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-700">No campaigns found</p>
                    <p className="text-xs text-slate-400 mt-1">Get started by creating your first campaign.</p>
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <button
                        onClick={() => navigate(`/manager/campaigns/${camp.id}`)}
                        className="hover:text-teal-600 font-semibold text-left cursor-pointer"
                      >
                        {camp.name}
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <CampaignStatusBadge status={camp.status} />
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={camp.description}>
                      {camp.description || <span className="text-slate-400 italic">No description</span>}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(camp.updatedAt || camp.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/manager/campaigns/${camp.id}`)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleOpenEdit(camp)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{campaigns.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{pagination.total}</span> campaigns
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Prev
            </button>

            <span className="font-medium text-slate-700 px-1">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages || 1, p + 1))}
              disabled={currentPage >= (pagination.totalPages || 1) || loading}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* CREATE CAMPAIGN MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Create Campaign</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campaign Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual Security Awareness Training"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    formErrors.name ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Describe the campaign objectives..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Status
                </label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Creating Campaign...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CAMPAIGN MODAL */}
      {isEditModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Edit Campaign</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campaign Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    formErrors.name ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {getAvailableNextStatuses(selectedCampaign.status).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Only valid workflow transitions are permitted.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerCampaigns;
