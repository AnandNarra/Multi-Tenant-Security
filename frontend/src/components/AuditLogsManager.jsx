import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { auditLogAPI, userAPI } from '../api/api';

const ACTION_CONFIG = {
  LOGIN_SUCCESS: {
    label: 'LOGIN_SUCCESS',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  LOGIN_FAILED: {
    label: 'LOGIN_FAILED',
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  LOGOUT: {
    label: 'LOGOUT',
    badge: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  USER_CREATED: {
    label: 'USER_CREATED',
    badge: 'border-purple-200 bg-purple-50 text-purple-700',
  },
  USER_UPDATED: {
    label: 'USER_UPDATED',
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  },
  USER_DEACTIVATED: {
    label: 'USER_DEACTIVATED',
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  USER_ACTIVATED: {
    label: 'USER_ACTIVATED',
    badge: 'border-teal-200 bg-teal-50 text-teal-700',
  },
  CAMPAIGN_CREATED: {
    label: 'CAMPAIGN_CREATED',
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  CAMPAIGN_UPDATED: {
    label: 'CAMPAIGN_UPDATED',
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  CAMPAIGN_DELETED: {
    label: 'CAMPAIGN_DELETED',
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  CAMPAIGN_USER_ASSIGNED: {
    label: 'CAMPAIGN_USER_ASSIGNED',
    badge: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  },
  CAMPAIGN_USER_REMOVED: {
    label: 'CAMPAIGN_USER_REMOVED',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  SECURITY_EVENT_CREATED: {
    label: 'SECURITY_EVENT_CREATED',
    badge: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  SECURITY_EVENT_UPDATED: {
    label: 'SECURITY_EVENT_UPDATED',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
  },
};

const RESOURCE_TYPES = ['AUTH', 'USER', 'CAMPAIGN', 'SECURITY_EVENT'];

const AUDIT_ACTIONS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DEACTIVATED',
  'USER_ACTIVATED',
  'CAMPAIGN_CREATED',
  'CAMPAIGN_UPDATED',
  'CAMPAIGN_DELETED',
  'CAMPAIGN_USER_ASSIGNED',
  'CAMPAIGN_USER_REMOVED',
  'SECURITY_EVENT_CREATED',
  'SECURITY_EVENT_UPDATED',
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
    second: '2-digit',
  });
};

const AuditLogsManager = () => {
  const { user } = useAuth();
  const userRole = user?.role?.toUpperCase() || 'USER';
  const isAdmin = userRole === 'ADMIN';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orgUsers, setOrgUsers] = useState([]);

  // Filters & Pagination
  const [actionFilter, setActionFilter] = useState('ALL');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateError, setDateError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    totalPages: 1,
  });

  // Modals & Detail State
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Fetch Users for selector
  useEffect(() => {
    if (!isAdmin) return;
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
  }, [isAdmin]);

  // Fetch Audit Logs
  const fetchLogs = useCallback(
    async (isManual = false, pageOverride) => {
      if (!isAdmin) return;
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const targetPage = pageOverride !== undefined ? pageOverride : currentPage;

      // Validate date range
      if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
        setDateError('dateFrom cannot be later than dateTo');
        setLoading(false);
        setRefreshing(false);
        return;
      } else {
        setDateError('');
      }

      try {
        const params = {
          page: targetPage,
          limit: ITEMS_PER_PAGE,
        };
        if (actionFilter !== 'ALL') params.action = actionFilter;
        if (resourceTypeFilter !== 'ALL') params.resourceType = resourceTypeFilter;
        if (userFilter !== 'ALL') params.userId = userFilter;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;

        const res = await auditLogAPI.getAll(params);
        if (res.data?.success && res.data?.data) {
          let list = res.data.data.logs || [];
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
              (l) =>
                l.description?.toLowerCase().includes(q) ||
                l.action?.toLowerCase().includes(q) ||
                l.user?.name?.toLowerCase().includes(q) ||
                l.user?.email?.toLowerCase().includes(q)
            );
          }
          setLogs(list);
          if (res.data.data.pagination) {
            setPagination(res.data.data.pagination);
          }
        }
      } catch (err) {
        console.error('Fetch audit logs error:', err);
        showToast(err.response?.data?.message || 'Failed to fetch audit logs', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAdmin, currentPage, actionFilter, resourceTypeFilter, userFilter, dateFrom, dateTo, searchQuery]
  );

  useEffect(() => {
    fetchLogs(false, 1);
    setCurrentPage(1);
  }, [actionFilter, resourceTypeFilter, userFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs(false, currentPage);
  }, [currentPage]);

  const handleResetFilters = () => {
    setActionFilter('ALL');
    setResourceTypeFilter('ALL');
    setUserFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setDateError('');
    setCurrentPage(1);
  };

  const handleCopyJson = (obj) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If not ADMIN, display restricted card
  if (!isAdmin) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Access Restricted</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Audit logs contain sensitive compliance trails. Only organization Administrators (ADMIN) are authorized to inspect audit logs.
          </p>
        </div>
      </div>
    );
  }

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
            Audit Logs
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Server-generated, immutable activity history and compliance audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh audit logs"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filter & Date Range Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-64">
            <input
              type="text"
              placeholder="Search description, user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Resource Type Filter */}
            <select
              value={resourceTypeFilter}
              onChange={(e) => setResourceTypeFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
            >
              <option value="ALL">All Resource Types</option>
              {RESOURCE_TYPES.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>

            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
            >
              <option value="ALL">All Audit Actions</option>
              {AUDIT_ACTIONS.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>

            {/* User Filter */}
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
            >
              <option value="ALL">All Actors</option>
              {orgUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
              <span className="text-slate-400 text-[11px]">Dates:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
                title="From Date"
              />
              <span className="text-slate-300">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
                title="To Date"
              />
            </div>

            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {dateError && (
          <div className="text-[11px] font-medium text-rose-600">
            <span>[!] {dateError}</span>
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    Loading audit records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-700">No audit logs found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or date range.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionStyle = ACTION_CONFIG[log.action]?.badge || 'border-slate-200 bg-slate-50 text-slate-700';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md border text-[10px] font-bold font-mono uppercase tracking-wider ${actionStyle}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {log.resourceType}
                      </td>

                      <td className="py-3.5 px-4">
                        {log.user ? (
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 block leading-none">
                              {log.user.name}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                              {log.user.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">System / Anonymous</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate" title={log.description}>
                        {log.description}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {formatDate(log.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setIsDetailModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Inspect Metadata & Payload"
                        >
                          View
                        </button>
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
            Showing <span className="font-semibold text-slate-700">{logs.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{pagination.total}</span> records
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

      {/* AUDIT LOG DETAIL & JSON MODAL */}
      {isDetailModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Audit Log Inspection</h3>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Log ID:</span>
                  <span className="font-mono text-slate-700">{selectedLog.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Action:</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedLog.action}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Resource Type:</span>
                  <span className="font-semibold text-slate-800">{selectedLog.resourceType}</span>
                </div>
                {selectedLog.resourceId && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Resource ID:</span>
                    <span className="font-mono text-slate-700">{selectedLog.resourceId}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Timestamp:</span>
                  <span className="text-slate-700 font-mono">{formatDate(selectedLog.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Actor:</span>
                  <span className="text-slate-900 font-medium">
                    {selectedLog.user ? `${selectedLog.user.name} (${selectedLog.user.email})` : 'System'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Description</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                  {selectedLog.description}
                </p>
              </div>

              {/* JSON Metadata Viewer */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-800">Structured Metadata (JSONB)</span>
                  <button
                    onClick={() => handleCopyJson(selectedLog.metadata || {})}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200"
                  >
                    {copied ? 'Copied!' : 'Copy JSON'}
                  </button>
                </div>

                <pre className="p-3.5 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsManager;
