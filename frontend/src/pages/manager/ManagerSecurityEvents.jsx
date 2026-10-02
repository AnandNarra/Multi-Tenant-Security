import React, { useState, useEffect, useCallback } from 'react';
import { getSecurityEvents, createSecurityEvent, updateSecurityEventStatus } from '../../api/securityEventApi';
import SecurityEventStatusBadge from '../../components/manager/SecurityEventStatusBadge';
import SecurityEventSeverityBadge from '../../components/manager/SecurityEventSeverityBadge';

const EVENT_TYPES = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'SUSPICIOUS_ACTIVITY',
  'UNAUTHORIZED_ACCESS',
  'ACCOUNT_LOCKED',
  'SECURITY_ALERT',
  'OTHER',
];

const SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED'];

const ManagerSecurityEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [filterType, setFilterType] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Create form state
  const [formData, setFormData] = useState({
    eventType: 'SECURITY_ALERT',
    severity: 'HIGH',
    status: 'OPEN',
    description: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Status update state
  const [newStatus, setNewStatus] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState(null);

  const showNotification = (msg, isErr = false) => {
    setToastMessage({ text: msg, isErr });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
      };

      if (filterType !== 'ALL') params.eventType = filterType;
      if (filterSeverity !== 'ALL') params.severity = filterSeverity;
      if (filterStatus !== 'ALL') params.status = filterStatus;

      const res = await getSecurityEvents(params);

      let eventList = [];
      let meta = {
        page,
        limit,
        total: 0,
        totalPages: 1,
      };

      if (Array.isArray(res)) {
        eventList = res;
        meta.total = res.length;
        meta.totalPages = Math.ceil(res.length / limit) || 1;
      } else if (res && typeof res === 'object') {
        if (Array.isArray(res.data?.events)) {
          eventList = res.data.events;
          if (res.data.pagination) meta = res.data.pagination;
        } else if (Array.isArray(res.events)) {
          eventList = res.events;
          if (res.pagination) meta = res.pagination;
        } else if (Array.isArray(res.data)) {
          eventList = res.data;
          if (res.pagination) meta = res.pagination;
        }
      }

      setEvents(Array.isArray(eventList) ? eventList : []);
      setPagination(meta);
    } catch (err) {
      console.error('Failed to load security events:', err);
      setEvents([]);
      if (err.response?.status === 403) {
        setError('You do not have permission to view security events.');
      } else {
        setError(err.response?.data?.message || 'Unable to load security events. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, filterType, filterSeverity, filterStatus]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Handle filter changes
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1); // Reset to page 1 on filter changes
  };

  // Valid status transitions for security events
  const getAllowedStatusOptions = (currentStatus) => {
    const cur = currentStatus ? currentStatus.toUpperCase() : 'OPEN';
    if (cur === 'OPEN') {
      return ['INVESTIGATING', 'RESOLVED'];
    }
    if (cur === 'INVESTIGATING') {
      return ['RESOLVED'];
    }
    return [];
  };

  // Create Event submission
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.description || formData.description.trim().length < 3) {
      errors.description = 'Description is required (minimum 3 characters).';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    setFormErrors({});

    try {
      await createSecurityEvent({
        eventType: formData.eventType,
        severity: formData.severity,
        status: formData.status,
        description: formData.description.trim(),
      });

      showNotification('Security event created successfully.');
      setShowCreateModal(false);
      setFormData({
        eventType: 'SECURITY_ALERT',
        severity: 'HIGH',
        status: 'OPEN',
        description: '',
      });
      fetchEvents();
    } catch (err) {
      console.error('Create security event error:', err);
      if (err.response?.status === 403) {
        showNotification('You do not have permission to create security events.', true);
      } else if (err.response?.status === 422) {
        showNotification(err.response?.data?.message || 'Invalid security event data.', true);
      } else {
        showNotification(err.response?.data?.message || 'Unable to create security event.', true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Open Status Update Modal
  const openStatusModal = (event) => {
    setSelectedEvent(event);
    const allowed = getAllowedStatusOptions(event.status);
    setNewStatus(allowed.length > 0 ? allowed[0] : '');
    setStatusError(null);
    setShowStatusModal(true);
  };

  // Submit Status Update
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEvent || !newStatus) return;

    setStatusSubmitting(true);
    setStatusError(null);

    try {
      await updateSecurityEventStatus(selectedEvent.id, newStatus);
      showNotification('Security event updated successfully.');
      setShowStatusModal(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (err) {
      console.error('Update event status error:', err);
      if (err.response?.status === 422) {
        setStatusError('Invalid security event status transition.');
        showNotification('Invalid security event status transition.', true);
      } else if (err.response?.status === 403) {
        setStatusError('You do not have permission to update security events.');
        showNotification('You do not have permission to update this event.', true);
      } else {
        setStatusError(err.response?.data?.message || 'Failed to update security event status.');
        showNotification('Failed to update event status.', true);
      }
    } finally {
      setStatusSubmitting(false);
    }
  };

  const startRecord = (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl border text-sm font-semibold shadow-lg transition-all ${
            toastMessage.isErr
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security Events</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor and manage security activity within your organization.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              eventType: 'SECURITY_ALERT',
              severity: 'HIGH',
              status: 'OPEN',
              description: '',
            });
            setFormErrors({});
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
        >
          <span>+ Create Security Event</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Event Type Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Event Type
            </label>
            <select
              value={filterType}
              onChange={(e) => handleFilterChange(setFilterType, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium cursor-pointer"
            >
              <option value="ALL">All Event Types</option>
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Severity
            </label>
            <select
              value={filterSeverity}
              onChange={(e) => handleFilterChange(setFilterSeverity, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              {SEVERITY_LEVELS.map((sev) => (
                <option key={sev} value={sev}>
                  {sev}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Events List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium text-slate-500">Loading security events...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-rose-600 font-medium mb-3">{error}</p>
            <button
              onClick={fetchEvents}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : !Array.isArray(events) || events.length === 0 ? (
          <div className="py-16 text-center px-4">
            <h3 className="text-base font-bold text-slate-800">No security events found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No security events match the selected criteria or none have been logged yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200">
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.isArray(events) &&
                  events.map((evt) => {
                    const allowedTransitions = getAllowedStatusOptions(evt.status);
                    const isTerminal = allowedTransitions.length === 0;

                    return (
                      <tr key={evt.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-900 text-sm">
                          {evt.eventType ? evt.eventType.replace(/_/g, ' ') : 'SECURITY EVENT'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <SecurityEventSeverityBadge severity={evt.severity} />
                      </td>
                      <td className="px-5 py-4">
                        <SecurityEventStatusBadge status={evt.status} />
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {evt.description || 'No description provided.'}
                        </p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-xs text-slate-500">
                          {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {isTerminal ? (
                          <span className="text-xs font-medium text-slate-400">Resolved</span>
                        ) : (
                          <button
                            onClick={() => openStatusModal(evt)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Update Status
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && !error && events.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-700">{startRecord}</span> to{' '}
              <span className="font-bold text-slate-700">{endRecord}</span> of{' '}
              <span className="font-bold text-slate-700">{pagination.total}</span> events
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    return (
                      p === 1 ||
                      p === pagination.totalPages ||
                      Math.abs(p - pagination.page) <= 1
                    );
                  })
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    const showEllipsis = prevP && p - prevP > 1;

                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && (
                          <span className="px-1 text-xs text-slate-400">...</span>
                        )}
                        <button
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            pagination.page === p
                              ? 'bg-teal-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE SECURITY EVENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Create Security Event</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {/* Event Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Event Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity & Initial Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Severity <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
                  >
                    {SEVERITY_LEVELS.map((sev) => (
                      <option key={sev} value={sev}>
                        {sev}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
                  >
                    <option value="OPEN">OPEN (Default)</option>
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the security event details, triggers, or affected systems..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                {formErrors.description && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {submitting ? 'Creating Event...' : 'Create Security Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {showStatusModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Update Event Status</h2>
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedEvent(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="p-6 space-y-4">
              {statusError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {statusError}
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Event:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedEvent.eventType?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Current Status:</span>
                  <SecurityEventStatusBadge status={selectedEvent.status} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select New Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
                >
                  {getAllowedStatusOptions(selectedEvent.status).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Valid transitions: OPEN → INVESTIGATING, OPEN → RESOLVED, INVESTIGATING → RESOLVED.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedEvent(null);
                  }}
                  disabled={statusSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusSubmitting || !newStatus}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {statusSubmitting ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerSecurityEvents;
