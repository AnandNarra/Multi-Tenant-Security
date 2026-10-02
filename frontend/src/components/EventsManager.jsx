import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { securityEventAPI, userAPI } from '../api/api';

const SEVERITY_CONFIG = {
  CRITICAL: {
    label: 'CRITICAL',
    badge: 'border border-rose-300 bg-rose-50 text-rose-700',
  },
  HIGH: {
    label: 'HIGH',
    badge: 'border border-orange-300 bg-orange-50 text-orange-700',
  },
  MEDIUM: {
    label: 'MEDIUM',
    badge: 'border border-amber-300 bg-amber-50 text-amber-700',
  },
  LOW: {
    label: 'LOW',
    badge: 'border border-sky-300 bg-sky-50 text-sky-700',
  },
};

const STATUS_CONFIG = {
  OPEN: {
    label: 'OPEN',
    badge: 'border border-amber-300 bg-amber-50 text-amber-800',
  },
  INVESTIGATING: {
    label: 'INVESTIGATING',
    badge: 'border border-blue-300 bg-blue-50 text-blue-800',
  },
  RESOLVED: {
    label: 'RESOLVED',
    badge: 'border border-emerald-300 bg-emerald-50 text-emerald-800',
  },
};

const EVENT_TYPES = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'SUSPICIOUS_ACTIVITY',
  'UNAUTHORIZED_ACCESS',
  'ACCOUNT_LOCKED',
  'SECURITY_ALERT',
  'OTHER',
];

const ITEMS_PER_PAGE = 10;

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const EventsManager = () => {
  const { user } = useAuth();
  const userRole = user?.role?.toUpperCase() || 'USER';
  const canManage = userRole === 'ADMIN' || userRole === 'MANAGER';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orgUsers, setOrgUsers] = useState([]);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    totalPages: 1,
  });

  // Modals & Active items
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Form State
  const [createForm, setCreateForm] = useState({
    eventType: 'SECURITY_ALERT',
    severity: 'HIGH',
    status: 'OPEN',
    description: '',
    userId: '',
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

  // Fetch Users for selector
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await userAPI.getAll();
        if (res.data?.success) {
          setOrgUsers(res.data?.data?.users || []);
        }
      } catch (err) {
        console.warn('Could not load org users for selector:', err);
      }
    };
    loadUsers();
  }, []);

  // Fetch Security Events
  const fetchEvents = useCallback(
    async (isManual = false, pageOverride) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const targetPage = pageOverride !== undefined ? pageOverride : currentPage;

      try {
        const params = {
          page: targetPage,
          limit: ITEMS_PER_PAGE,
        };
        if (severityFilter !== 'ALL') params.severity = severityFilter;
        if (statusFilter !== 'ALL') params.status = statusFilter;
        if (eventTypeFilter !== 'ALL') params.eventType = eventTypeFilter;

        const res = await securityEventAPI.getAll(params);
        if (res.data?.success && res.data?.data) {
          let list = res.data.data.events || [];
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
              (e) =>
                e.description?.toLowerCase().includes(q) ||
                e.eventType?.toLowerCase().includes(q)
            );
          }
          setEvents(list);
          if (res.data.data.pagination) {
            setPagination(res.data.data.pagination);
          }
        }
      } catch (err) {
        console.error('Fetch security events error:', err);
        showToast(err.response?.data?.message || 'Failed to fetch security events', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, severityFilter, statusFilter, eventTypeFilter, searchQuery]
  );

  useEffect(() => {
    fetchEvents(false, 1);
    setCurrentPage(1);
  }, [severityFilter, statusFilter, eventTypeFilter]);

  useEffect(() => {
    fetchEvents(false, currentPage);
  }, [currentPage]);

  // Handle Status Update
  const handleUpdateStatus = async (eventId, newStatus) => {
    try {
      const res = await securityEventAPI.updateStatus(eventId, newStatus);
      if (res.data?.success) {
        showToast(`Event status transitioned to ${newStatus}`, 'success');
        fetchEvents(false, currentPage);
        if (selectedEvent?.id === eventId) {
          setSelectedEvent((prev) => (prev ? { ...prev, status: newStatus } : prev));
        }
      }
    } catch (err) {
      console.error('Update status error:', err);
      showToast(err.response?.data?.message || 'Failed to update event status', 'error');
    }
  };

  // Handle Create Event
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    if (!createForm.description || createForm.description.trim().length < 3) {
      setFormErrors({ description: 'Description must be at least 3 characters' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        eventType: createForm.eventType,
        severity: createForm.severity,
        status: createForm.status,
        description: createForm.description.trim(),
      };
      if (createForm.userId) {
        payload.userId = createForm.userId;
      }

      const res = await securityEventAPI.create(payload);
      if (res.data?.success) {
        showToast('Security event recorded successfully', 'success');
        setIsCreateModalOpen(false);
        setCreateForm({
          eventType: 'SECURITY_ALERT',
          severity: 'HIGH',
          status: 'OPEN',
          description: '',
          userId: '',
        });
        fetchEvents(false, 1);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Create event error:', err);
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      } else {
        showToast(err.response?.data?.message || 'Failed to create security event', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Security Events
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time threat monitoring, access anomalies, and isolated tenant security events.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchEvents(true)}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh events"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          {canManage && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all cursor-pointer"
            >
              + Log Security Event
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <span className="text-xs text-slate-500 font-medium">Filters:</span>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 font-medium text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 font-medium text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          {/* Event Type Filter */}
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 font-medium text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Event Types</option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    Loading security events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-700">No security events found</p>
                    <p className="text-xs text-slate-400 mt-1">No anomalous security records match your criteria.</p>
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const severityStyle = SEVERITY_CONFIG[ev.severity] || SEVERITY_CONFIG.LOW;
                  const statusStyle = STATUS_CONFIG[ev.status] || STATUS_CONFIG.OPEN;

                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        {ev.eventType}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${severityStyle.badge}`}
                        >
                          {ev.severity}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusStyle.badge}`}
                        >
                          {ev.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate" title={ev.description}>
                        {ev.description}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(ev.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Status Progression */}
                          {canManage && ev.status === 'OPEN' && (
                            <button
                              onClick={() => handleUpdateStatus(ev.id, 'INVESTIGATING')}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                              title="Transition to Investigating"
                            >
                              Investigate
                            </button>
                          )}

                          {canManage && (ev.status === 'OPEN' || ev.status === 'INVESTIGATING') && (
                            <button
                              onClick={() => handleUpdateStatus(ev.id, 'RESOLVED')}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                              title="Resolve Event"
                            >
                              Resolve
                            </button>
                          )}

                          {/* View details */}
                          <button
                            onClick={() => {
                              setSelectedEvent(ev);
                              setIsDetailModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="View Event Details"
                          >
                            View
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

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{events.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{pagination.total}</span> events
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

      {/* CREATE SECURITY EVENT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Log Security Event</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Event Type
                  </label>
                  <select
                    value={createForm.eventType}
                    onChange={(e) => setCreateForm({ ...createForm, eventType: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Severity
                  </label>
                  <select
                    value={createForm.severity}
                    onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target User (Optional)
                  </label>
                  <select
                    value={createForm.userId}
                    onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="">None / System Event</option>
                    {orgUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  placeholder="Describe suspicious activity or security alert..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className={`w-full text-xs bg-slate-50 border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                    formErrors.description ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
                {formErrors.description && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.description}</p>
                )}
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
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Record Security Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVENT DETAIL MODAL */}
      {isDetailModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Security Event Details</h3>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Event ID:</span>
                  <span className="font-mono text-slate-700">{selectedEvent.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Event Type:</span>
                  <span className="font-bold text-slate-900">{selectedEvent.eventType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Severity:</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      SEVERITY_CONFIG[selectedEvent.severity]?.badge
                    }`}
                  >
                    {selectedEvent.severity}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      STATUS_CONFIG[selectedEvent.status]?.badge
                    }`}
                  >
                    {selectedEvent.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Timestamp:</span>
                  <span className="text-slate-700">{formatDate(selectedEvent.createdAt)}</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Description</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                  {selectedEvent.description}
                </p>
              </div>

              {canManage && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Transition Status:</span>
                  <div className="flex items-center gap-2">
                    {selectedEvent.status === 'OPEN' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedEvent.id, 'INVESTIGATING')}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                      >
                        Investigate
                      </button>
                    )}
                    {(selectedEvent.status === 'OPEN' || selectedEvent.status === 'INVESTIGATING') && (
                      <button
                        onClick={() => handleUpdateStatus(selectedEvent.id, 'RESOLVED')}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                      >
                        Resolve
                      </button>
                    )}
                    {selectedEvent.status === 'RESOLVED' && (
                      <span className="text-emerald-700 font-semibold text-xs">
                        [✓] Resolved
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsManager;
