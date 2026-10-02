import React, { useState, useMemo, useEffect } from 'react';
import {
  UserPlus,
  Search,
  X,
  Lock,
  Mail,
  User,
  Trash2,
  Pencil,
  Users as UsersIcon,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../api/api';

const formatCurrentDate = (dateVal) => {
  const dateObj = dateVal ? new Date(dateVal) : new Date();
  const options = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  return dateObj.toLocaleDateString('en-US', options);
};

const UsersManager = () => {
  const { organization } = useAuth();
  const orgName = organization?.name || 'Acme Security';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userAPI.getAll();
      const rawUsers = res.data?.data?.users || [];
      const formatted = rawUsers.map((u) => ({
        ...u,
        createdAt: formatCurrentDate(u.createdAt),
        rawDate: u.createdAt ? new Date(u.createdAt) : new Date(),
      }));
      setUsers(formatted);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filters & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('desc');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    status: 'ACTIVE',
  });
  const [formError, setFormError] = useState('');

  const handleOpenAddModal = () => {
    setEditingUserId(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'USER',
      status: 'ACTIVE',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUserId(null);
    setFormError('');
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (!editingUserId && (!formData.password || formData.password.length < 8)) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    if (editingUserId) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUserId
            ? {
                ...u,
                name: formData.name.trim(),
                email: formData.email.trim(),
                role: formData.role,
                status: formData.status,
              }
            : u
        )
      );
      handleCloseModal();
    } else {
      setSubmitting(true);
      try {
        const response = await userAPI.create({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          status: formData.status,
        });

        await fetchUsers();
        handleCloseModal();
      } catch (err) {
        const message =
          err.response?.data?.message ||
          (err.response?.data?.errors && Object.values(err.response.data.errors).join(', ')) ||
          'Failed to create user.';
        setFormError(message);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleDeleteUser = (id) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // Filtered and Sorted Users
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const matchesSearch =
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
        const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        if (sortOrder === 'desc') {
          return (b.rawDate || 0) - (a.rawDate || 0);
        } else if (sortOrder === 'asc') {
          return (a.rawDate || 0) - (b.rawDate || 0);
        } else if (sortOrder === 'name') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [users, searchTerm, roleFilter, statusFilter, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 text-[#0284c7] shrink-0 mt-0.5">
            <UsersIcon className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Organization Users & Access
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage user accounts, credentials, and RBAC roles scoped to {orgName}.
            </p>
          </div>
        </div>

        {/* Top-Right "Add User" Button */}
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0284c7] hover:bg-sky-600 text-white shadow-sm shadow-sky-500/20 transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
          />
        </div>

        {/* Roles Filter Dropdown */}
        <div className="relative min-w-[140px]">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 pr-8 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500 focus:bg-white transition-all cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="USER">USER</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Statuses Filter Dropdown */}
        <div className="relative min-w-[140px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 pr-8 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500 focus:bg-white transition-all cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Order / Sort Dropdown */}
        <div className="relative min-w-[200px]">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 pr-8 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500 focus:bg-white transition-all cursor-pointer"
          >
            <option value="desc">Order: Most Recent (Desc)</option>
            <option value="asc">Order: Oldest (Asc)</option>
            <option value="name">Order: Name (A-Z)</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">USER & EMAIL</th>
                <th className="py-4 px-5">ROLE</th>
                <th className="py-4 px-5">STATUS</th>
                <th className="py-4 px-5">JOINED DATE</th>
                <th className="py-4 px-6 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="w-7 h-7 text-[#0284c7] animate-spin" />
                      <div className="text-sm font-medium text-slate-700">
                        Loading organization users...
                      </div>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Fetching user credentials and access roles from your organization database.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <UsersIcon className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-medium text-slate-700">No users found</div>
                      <p className="text-xs text-slate-400 max-w-sm">
                        No accounts match your search or filter criteria. Click "Add User" to create one.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const avatarChar = u.name ? u.name.charAt(0) : '?';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* USER & EMAIL */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-8 h-8 rounded-full bg-sky-100 text-[#0284c7] font-semibold flex items-center justify-center text-xs shrink-0">
                            {avatarChar}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                              {u.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-normal">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ROLE */}
                      <td className="py-4 px-5">
                        <span
                          className={`inline-block font-medium text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : u.role === 'MANAGER'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="py-4 px-5">
                        <span
                          className={`inline-block font-medium text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                            u.status === 'ACTIVE'
                              ? 'bg-[#E6F8F0] text-[#10B981] border-[#B2EAD6]'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      {/* JOINED DATE */}
                      <td className="py-4 px-5 text-slate-500 font-normal text-xs whitespace-nowrap">
                        {u.createdAt}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit user"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POPUP MODAL: ADD / EDIT USER */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingUserId ? 'Edit User' : 'Add New User'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {editingUserId
                  ? 'Update user account credentials and role.'
                  : 'Provision a new account within your organization.'}
              </p>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
                {formError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Full Name */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Jane Doe"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jane@organization.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  Password {!editingUserId && <span className="text-rose-500">*</span>}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required={!editingUserId}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 8 characters"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              {/* Role & Status Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">Role</label>
                  <div className="relative">
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-8 text-xs text-slate-800 font-medium focus:outline-none focus:border-sky-500 transition-all cursor-pointer"
                    >
                      <option value="USER">USER</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">Status</label>
                  <div className="relative">
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-8 text-xs text-slate-800 font-medium focus:outline-none focus:border-sky-500 transition-all cursor-pointer"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-5 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#0284c7] hover:bg-sky-600 text-white transition-all shadow-sm shadow-sky-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {submitting
                      ? 'Creating...'
                      : editingUserId
                      ? 'Save Changes'
                      : 'Create Account'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManager;
