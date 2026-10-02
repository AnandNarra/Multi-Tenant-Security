import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { campaignAPI, userAPI } from '../api/api';

const STATUS_CONFIG = {
  DRAFT: {
    label: 'DRAFT',
    badge: 'border border-amber-300 bg-amber-50/90 text-amber-700',
  },
  ACTIVE: {
    label: 'ACTIVE',
    badge: 'border border-emerald-300 bg-emerald-50/90 text-emerald-700',
  },
  COMPLETED: {
    label: 'COMPLETED',
    badge: 'border border-teal-300 bg-teal-50/90 text-teal-700',
  },
  CANCELLED: {
    label: 'CANCELLED',
    badge: 'border border-rose-300 bg-rose-50/90 text-rose-600',
  },
};

const ITEMS_PER_PAGE = 7;

const CampaignsManager = () => {
  const { user, organization } = useAuth();
  const userRole = user?.role?.toUpperCase() || 'USER';
  const canManage = userRole === 'ADMIN' || userRole === 'MANAGER';
  const isAdmin = userRole === 'ADMIN';

  // Table & Pagination state
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    totalPages: 1,
  });

  const [orgUsers, setOrgUsers] = useState([]);
  const [toast, setToast] = useState(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Active campaign in modal
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignDetails, setCampaignDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({ name: '', description: '', status: 'DRAFT' });
  const [editForm, setEditForm] = useState({ name: '', description: '', status: 'DRAFT' });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Fetch campaigns from backend
  const fetchCampaigns = useCallback(
    async (isManualRefresh = false, pageOverride) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const targetPage = pageOverride !== undefined ? pageOverride : currentPage;

      try {
        const res = await campaignAPI.getAll({
          page: targetPage,
          limit: ITEMS_PER_PAGE,
          search: searchQuery,
          status: statusFilter,
          sortBy,
          sortOrder,
        });

        if (res.data?.success && res.data?.data) {
          setCampaigns(res.data.data.campaigns || []);
          if (res.data.data.pagination) {
            setPagination(res.data.data.pagination);
          } else {
            setPagination({
              page: targetPage,
              limit: ITEMS_PER_PAGE,
              total: res.data.data.campaigns?.length || 0,
              totalPages: Math.ceil((res.data.data.campaigns?.length || 0) / ITEMS_PER_PAGE) || 1,
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch campaigns:', err);
        showToast(err.response?.data?.message || 'Failed to load campaigns', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, searchQuery, statusFilter, sortBy, sortOrder]
  );

  // Fetch organization users for assignment dropdown
  const fetchOrgUsers = async () => {
    if (!canManage) return;
    try {
      const res = await userAPI.getAll();
      if (res.data?.success && res.data?.data?.users) {
        setOrgUsers(res.data.data.users);
      }
    } catch (err) {
      console.error('Failed to fetch org users:', err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    fetchOrgUsers();
  }, []);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleSortByChange = (e) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  const handleSortOrderChange = (e) => {
    setSortOrder(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Open assign / view modal
  const openAssignModal = async (campaign) => {
    setSelectedCampaign(campaign);
    setIsAssignModalOpen(true);
    setSelectedUserId('');
    setLoadingDetails(true);

    try {
      const res = await campaignAPI.getById(campaign.id);
      if (res.data?.success && res.data?.data?.campaign) {
        setCampaignDetails(res.data.data.campaign);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch campaign details', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open edit modal
  const openEditModal = (campaign) => {
    setSelectedCampaign(campaign);
    setEditForm({
      name: campaign.name,
      description: campaign.description || '',
      status: campaign.status,
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (campaign) => {
    setSelectedCampaign(campaign);
    setIsDeleteModalOpen(true);
  };

  // Create Campaign Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    if (!createForm.name.trim() || createForm.name.trim().length < 2) {
      setFormErrors({ name: 'Campaign name must be at least 2 characters' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        status: createForm.status || 'DRAFT',
      };

      const res = await campaignAPI.create(payload);
      if (res.data?.success) {
        showToast('Campaign created successfully', 'success');
        setIsCreateModalOpen(false);
        setCreateForm({ name: '', description: '', status: 'DRAFT' });
        setCurrentPage(1);
        fetchCampaigns(false, 1);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors && Object.values(err.response.data.errors).join(', ')) ||
        'Failed to create campaign';
      showToast(msg, 'error');
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Campaign Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    setFormErrors({});

    if (!editForm.name.trim() || editForm.name.trim().length < 2) {
      setFormErrors({ name: 'Campaign name must be at least 2 characters' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
      };

      if (editForm.status && editForm.status !== selectedCampaign.status) {
        payload.status = editForm.status;
      }

      const res = await campaignAPI.update(selectedCampaign.id, payload);
      if (res.data?.success) {
        showToast('Campaign updated successfully', 'success');
        setIsEditModalOpen(false);
        fetchCampaigns();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update campaign';
      showToast(msg, 'error');
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Campaign
  const handleDeleteSubmit = async () => {
    if (!selectedCampaign) return;
    setSubmitting(true);
    try {
      const res = await campaignAPI.delete(selectedCampaign.id);
      if (res.data?.success) {
        showToast('Campaign deleted successfully', 'success');
        setIsDeleteModalOpen(false);
        fetchCampaigns();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete campaign';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Assign User to Campaign
  const handleAssignUser = async (e) => {
    e.preventDefault();
    if (!selectedCampaign || !selectedUserId) return;

    setSubmitting(true);
    try {
      const res = await campaignAPI.assignUser(selectedCampaign.id, selectedUserId);
      if (res.data?.success) {
        showToast('User assigned to campaign successfully', 'success');
        setSelectedUserId('');
        const refreshed = await campaignAPI.getById(selectedCampaign.id);
        if (refreshed.data?.success) {
          setCampaignDetails(refreshed.data.data.campaign);
        }
        fetchCampaigns();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to assign user';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Remove User from Campaign
  const handleRemoveUser = async (userId) => {
    if (!selectedCampaign) return;
    try {
      const res = await campaignAPI.removeUser(selectedCampaign.id, userId);
      if (res.data?.success) {
        showToast('User removed from campaign', 'success');
        const refreshed = await campaignAPI.getById(selectedCampaign.id);
        if (refreshed.data?.success) {
          setCampaignDetails(refreshed.data.data.campaign);
        }
        fetchCampaigns();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove user';
      showToast(msg, 'error');
    }
  };

  // Format schedule date range
  const formatSchedule = (createdAt) => {
    if (!createdAt) return 'Oct 1, 2026 → Oct 2, 2026';
    const start = new Date(createdAt);
    if (isNaN(start.getTime())) return 'Oct 1, 2026 → Oct 2, 2026';
    const end = new Date(start);
    end.setDate(end.getDate() + 30);
    const startStr = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const endStr = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${startStr} → ${endStr}`;
  };

  // Unassigned users in current organization for the assignment select
  const unassignedUsers = campaignDetails?.assignedUsers
    ? orgUsers.filter((u) => !campaignDetails.assignedUsers.some((au) => au.id === u.id))
    : orgUsers;

  const totalResults = pagination.total || 0;
  const startResult = totalResults === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endResult = Math.min(pagination.page * pagination.limit, totalResults);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 border-emerald-700 text-emerald-100 shadow-emerald-950/20'
              : 'bg-rose-900/90 border-rose-700 text-rose-100 shadow-rose-950/20'
          }`}
        >
          <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-white/60 hover:text-white cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Campaign Management
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              Tenant Isolated
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchCampaigns(true)}
            disabled={refreshing || loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
            title="Refresh campaigns"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          {canManage && (
            <button
              onClick={() => {
                setCreateForm({ name: '', description: '', status: 'DRAFT' });
                setFormErrors({});
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0284c7] hover:bg-sky-600 text-white shadow-md shadow-sky-500/20 transition-all cursor-pointer"
            >
              Create Campaign
            </button>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search campaigns..."
            className="w-full px-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="w-full md:w-44 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Sort By Dropdown */}
        <div className="w-full md:w-auto">
          <select
            value={sortBy}
            onChange={handleSortByChange}
            className="w-full md:w-48 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer"
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="name">Sort: Campaign Name</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>

        {/* Order Dropdown */}
        <div className="w-full md:w-auto">
          <select
            value={sortOrder}
            onChange={handleSortOrderChange}
            className="w-full md:w-56 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer"
          >
            <option value="desc">Order: Newest First (Desc)</option>
            <option value="asc">Order: Oldest First (Asc)</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table View */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <p className="text-sm font-medium text-slate-600">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <h4 className="text-base font-bold text-slate-800">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No matching campaigns found'
                : 'No campaigns created yet'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or filter options.'
                : 'Create simulated security awareness and phishing drills to test your organization.'}
            </p>
            {canManage && (
              <button
                onClick={() => {
                  setCreateForm({ name: '', description: '', status: 'DRAFT' });
                  setFormErrors({});
                  setIsCreateModalOpen(true);
                }}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0284c7] hover:bg-sky-600 text-white shadow-sm transition-all cursor-pointer"
              >
                Create Campaign
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-[#fbfcfd]">
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    CAMPAIGN NAME & DETAILS
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                    STATUS
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    SCHEDULE
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    ASSIGNED TEAM
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {campaigns.map((campaign) => {
                  const conf = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.DRAFT;

                  return (
                    <tr
                      key={campaign.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Campaign Name & Description */}
                      <td className="py-4 px-5 align-middle max-w-sm">
                        <div className="font-bold text-slate-900 text-sm leading-tight group-hover:text-sky-700 transition-colors">
                          {campaign.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {campaign.description || 'No description provided'}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-5 align-middle text-center">
                        <span
                          className={`inline-block text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider ${conf.badge}`}
                        >
                          {conf.label}
                        </span>
                      </td>

                      {/* Schedule */}
                      <td className="py-4 px-5 align-middle whitespace-nowrap">
                        <div className="text-xs text-slate-500 font-medium">
                          {formatSchedule(campaign.createdAt)}
                        </div>
                      </td>

                      {/* Assigned Team */}
                      <td className="py-4 px-5 align-middle whitespace-nowrap">
                        <button
                          onClick={() => openAssignModal(campaign)}
                          className="px-3 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200/80 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition-all cursor-pointer"
                          title="View / Manage assigned team members"
                        >
                          {campaign.memberCount || 0} members
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-3">
                          {/* View Action */}
                          <button
                            onClick={() => openAssignModal(campaign)}
                            className="text-xs font-medium text-sky-600 hover:text-sky-800 hover:underline transition-colors cursor-pointer"
                            title="View Campaign Details & Team"
                          >
                            View
                          </button>

                          {/* Edit Action */}
                          {canManage && (
                            <button
                              onClick={() => openEditModal(campaign)}
                              className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline transition-colors cursor-pointer"
                              title="Edit Campaign"
                            >
                              Edit
                            </button>
                          )}

                          {/* Delete Action (Admin Only) */}
                          {isAdmin && (
                            <button
                              onClick={() => openDeleteModal(campaign)}
                              className="text-xs font-medium text-rose-600 hover:text-rose-800 hover:underline transition-colors cursor-pointer"
                              title="Delete Campaign"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bottom Bar */}
        {!loading && campaigns.length > 0 && (
          <div className="py-3.5 px-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{startResult}</span> to{' '}
              <span className="font-semibold text-slate-800">{endResult}</span> of{' '}
              <span className="font-semibold text-slate-800">{totalResults}</span> results
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="font-medium text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                &lt; Previous
              </button>

              <span className="font-semibold text-slate-800">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= pagination.totalPages}
                className="font-medium text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Next &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 1. CREATE CAMPAIGN MODAL                                    */}
      {/* ============================================================ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer text-sm"
            >
              ✕
            </button>

            <div className="mb-5">
              <h3 className="font-bold text-lg text-slate-900">Create Security Campaign</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tenant: <strong className="text-slate-700">{organization?.name}</strong>
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Campaign Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Q4 Phishing Awareness Simulation"
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all ${
                    formErrors.name ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-rose-600 text-xs mt-1 font-medium">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Details regarding testing criteria, objectives, or instructions..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Initial Status
                </label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all"
                >
                  <option value="DRAFT">DRAFT (Recommended for Staging)</option>
                  <option value="ACTIVE">ACTIVE (Start Immediately)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-800">
                Organization isolation automatically applied. Only members in your tenant will have access.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#0284c7] hover:bg-sky-600 text-white shadow-md shadow-sky-500/20 transition-all cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. EDIT CAMPAIGN MODAL                                      */}
      {/* ============================================================ */}
      {isEditModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer text-sm"
            >
              ✕
            </button>

            <div className="mb-5">
              <h3 className="font-bold text-lg text-slate-900">Edit Campaign Details</h3>
              <p className="text-xs text-slate-500 mt-0.5">Update campaign parameters and status</p>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Campaign Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all ${
                    formErrors.name ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-rose-600 text-xs mt-1 font-medium">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all resize-none"
                />
              </div>

              {canManage && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Status Transition
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. ASSIGN USERS & CAMPAIGN DETAILS MODAL                     */}
      {/* ============================================================ */}
      {isAssignModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer text-sm"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="mb-6 pr-8">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900 leading-snug">
                  {selectedCampaign.name}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    STATUS_CONFIG[selectedCampaign.status]?.badge || ''
                  }`}
                >
                  {selectedCampaign.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Assigned Personnel & Participant Roster
              </p>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {/* Campaign Description */}
              {selectedCampaign.description && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700 block mb-0.5">Objective:</span>
                  {selectedCampaign.description}
                </div>
              )}

              {/* Assign New User Form */}
              {canManage && (
                <div className="bg-sky-50/60 border border-sky-100 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-sky-950">
                      Assign Organization Member
                    </h4>
                    <span className="text-[11px] text-sky-700 font-medium">
                      Tenant-scoped validation
                    </span>
                  </div>

                  <form onSubmit={handleAssignUser} className="flex flex-col sm:flex-row gap-2.5">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-sky-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    >
                      <option value="">-- Select Member to Assign --</option>
                      {unassignedUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email}) &bull; {u.role}
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      disabled={!selectedUserId || submitting}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0284c7] hover:bg-sky-600 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      {submitting ? 'Assigning...' : 'Assign'}
                    </button>
                  </form>
                </div>
              )}

              {/* Assigned Users List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Assigned Participants (
                    {campaignDetails?.assignedUsers ? campaignDetails.assignedUsers.length : 0})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Many-to-many relationship
                  </span>
                </div>

                {loadingDetails ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Loading assigned members...
                  </div>
                ) : !campaignDetails?.assignedUsers ||
                  campaignDetails.assignedUsers.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center">
                    <p className="text-xs font-medium text-slate-600">No users assigned yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Select a team member above to assign them to this campaign simulation.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {campaignDetails.assignedUsers.map((u) => (
                      <div
                        key={u.id}
                        className="p-3.5 bg-white flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{u.name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                                u.role === 'ADMIN'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : u.role === 'MANAGER'
                                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {u.role}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block">{u.email}</span>
                        </div>

                        {canManage && (
                          <button
                            onClick={() => handleRemoveUser(u.id)}
                            className="text-xs font-medium text-rose-600 hover:text-rose-800 hover:underline transition-colors cursor-pointer"
                            title="Remove user from this campaign"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. DELETE CONFIRMATION MODAL (ADMIN ONLY)                   */}
      {/* ============================================================ */}
      {isDeleteModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-lg text-slate-900 text-center">Delete Campaign?</h3>
            <p className="text-xs text-slate-500 text-center mt-2 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-800">"{selectedCampaign.name}"</strong>? All user
              assignments in <code className="text-slate-700 font-mono">campaign_users</code> will
              automatically cascade and be deleted.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center"
              >
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignsManager;
