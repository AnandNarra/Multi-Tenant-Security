import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCampaignById, updateCampaign, assignUser, removeUser } from '../../api/campaignApi';
import { userAPI } from '../../api/api';
import CampaignStatusBadge from '../../components/manager/CampaignStatusBadge';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
  return [norm];
};

const ManagerCampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orgUsers, setOrgUsers] = useState([]);

  // Modals & Popups
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState(null);

  // Forms & Selections
  const [editForm, setEditForm] = useState({ name: '', description: '', status: 'DRAFT' });
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Action Loading & Errors
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Fetch Campaign Details
  const fetchDetails = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await getCampaignById(id);
        if (res.success && res.data?.campaign) {
          setCampaign(res.data.campaign);
          setEditForm({
            name: res.data.campaign.name || '',
            description: res.data.campaign.description || '',
            status: res.data.campaign.status || 'DRAFT',
          });
        }
      } catch (err) {
        console.error('Fetch campaign details error:', err);
        if (err.response?.status === 404) {
          showToast('Campaign not found', 'error');
          navigate('/manager/campaigns');
        } else {
          showToast(err.response?.data?.message || 'Failed to load campaign details', 'error');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, navigate]
  );

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Load Organization Users for Assignment Modal
  const loadOrgUsers = async () => {
    try {
      const res = await userAPI.getAll();
      if (res.data?.success) {
        setOrgUsers(res.data?.data?.users || []);
      }
    } catch (err) {
      console.warn('Could not load org users:', err);
    }
  };

  const handleOpenAssignModal = () => {
    loadOrgUsers();
    setSelectedUserIds([]);
    setUserSearch('');
    setIsAssignModalOpen(true);
  };

  // Toggle user selection for assignment
  const handleToggleUserSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Submit User Assignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) {
      showToast('Please select at least one user to assign.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Assign selected users sequentially
      for (const uid of selectedUserIds) {
        await assignUser(id, uid);
      }
      showToast('User assigned successfully.');
      setIsAssignModalOpen(false);
      fetchDetails(true);
    } catch (err) {
      console.error('Assign users error:', err);
      showToast(err.response?.data?.message || 'Failed to assign user(s) to campaign.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Remove User Action
  const handleRemoveUserSubmit = async () => {
    if (!userToRemove) return;
    setSubmitting(true);
    try {
      const res = await removeUser(id, userToRemove.id);
      if (res.success) {
        showToast('User removed from campaign.');
        setUserToRemove(null);
        fetchDetails(true);
      }
    } catch (err) {
      console.error('Remove user error:', err);
      showToast(err.response?.data?.message || 'Unable to remove user.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Campaign Action
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    if (!editForm.name || editForm.name.trim().length < 2) {
      setFormErrors({ name: 'Campaign name must be at least 2 characters' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateCampaign(id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        status: editForm.status,
      });

      if (res.success) {
        showToast('Campaign updated successfully.');
        setIsEditModalOpen(false);
        fetchDetails(true);
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

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        Loading campaign details...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        Campaign not found.
      </div>
    );
  }

  const assignedUsers = campaign.assignedUsers || [];
  const assignedUserIds = assignedUsers.map((u) => u.id);
  const unassignedOrgUsers = orgUsers.filter(
    (u) =>
      !assignedUserIds.includes(u.id) &&
      (u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()))
  );

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

      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/manager/campaigns"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          &larr; Back to Campaigns
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDetails(true)}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => {
              setEditForm({
                name: campaign.name || '',
                description: campaign.description || '',
                status: campaign.status || 'DRAFT',
              });
              setFormErrors({});
              setIsEditModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Edit Campaign
          </button>
        </div>
      </div>

      {/* Campaign Details Hero Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Campaign Information
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              {campaign.name}
            </h1>
          </div>
          <CampaignStatusBadge status={campaign.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-semibold block mb-1">Description</span>
            <p className="text-slate-700 leading-relaxed">
              {campaign.description || <span className="italic text-slate-400">No description provided</span>}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <div>
              <span className="text-slate-400 font-semibold block">Created Date</span>
              <span className="text-slate-700 font-medium">{formatDate(campaign.createdAt)}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Last Updated</span>
              <span className="text-slate-700 font-medium">{formatDate(campaign.updatedAt)}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <div>
              <span className="text-slate-400 font-semibold block">Assigned Team Members</span>
              <span className="text-xl font-bold text-slate-900">{assignedUsers.length}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Campaign ID</span>
              <span className="font-mono text-slate-600 text-[10px] break-all">{campaign.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Users Section */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Assigned Users</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Team members allocated to this security campaign.
            </p>
          </div>

          <button
            onClick={handleOpenAssignModal}
            className="px-3.5 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs transition-colors cursor-pointer"
          >
            + Assign Users
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignedUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400">
                    No users assigned to this campaign yet.
                  </td>
                </tr>
              ) : (
                assignedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setUserToRemove(u)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ASSIGN USERS MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Assign Users to Campaign</h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search organization users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {unassignedOrgUsers.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No matching unassigned users found in your organization.
                  </div>
                ) : (
                  unassignedOrgUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleToggleUserSelection(u.id)}
                        className={`p-3 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                          isSelected ? 'bg-teal-50/80 font-semibold text-teal-950' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="block font-medium">{u.name}</span>
                          <span className="text-[11px] text-slate-400 truncate block">{u.email}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-teal-600 focus:ring-teal-500 pointer-events-none"
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                {selectedUserIds.length} selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignSubmit}
                  disabled={submitting || selectedUserIds.length === 0}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : 'Assign Selected'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE USER CONFIRMATION MODAL */}
      {userToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-slate-900">Remove User</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-900">{userToRemove.name}</strong> from this campaign?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToRemove(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveUserSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Removing...' : 'Remove User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CAMPAIGN MODAL */}
      {isEditModalOpen && (
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
                  {getAvailableNextStatuses(campaign.status).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
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

export default ManagerCampaignDetails;
