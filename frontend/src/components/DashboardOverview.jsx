import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { securityEventAPI, auditLogAPI, campaignAPI, userAPI } from '../api/api';

const DashboardOverview = () => {
  const { user, organization } = useAuth();
  const [stats, setStats] = useState({
    eventsTotal: 0,
    openThreats: 0,
    auditTotal: 0,
    campaignsTotal: 0,
    usersTotal: 0,
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOverviewData = async () => {
      setLoading(true);
      try {
        const [eventsRes, logsRes, campaignsRes, usersRes] = await Promise.allSettled([
          securityEventAPI.getAll({ page: 1, limit: 5 }),
          auditLogAPI.getAll({ page: 1, limit: 5 }),
          campaignAPI.getAll({ page: 1, limit: 1 }),
          userAPI.getAll(),
        ]);

        const newStats = {
          eventsTotal: 0,
          openThreats: 0,
          auditTotal: 0,
          campaignsTotal: 0,
          usersTotal: 0,
        };

        if (eventsRes.status === 'fulfilled' && eventsRes.value.data?.success) {
          const evData = eventsRes.value.data.data;
          newStats.eventsTotal = evData.pagination?.total || 0;
          const openCount = (evData.events || []).filter((e) => e.status === 'OPEN').length;
          newStats.openThreats = openCount;
          setRecentEvents(evData.events || []);
        }

        if (logsRes.status === 'fulfilled' && logsRes.value.data?.success) {
          const logData = logsRes.value.data.data;
          newStats.auditTotal = logData.pagination?.total || 0;
          setRecentLogs(logData.logs || []);
        }

        if (campaignsRes.status === 'fulfilled' && campaignsRes.value.data?.success) {
          newStats.campaignsTotal = campaignsRes.value.data.data?.pagination?.total || 0;
        }

        if (usersRes.status === 'fulfilled' && usersRes.value.data?.success) {
          newStats.usersTotal = usersRes.value.data.data?.users?.length || 0;
        }

        setStats(newStats);
      } catch (err) {
        console.error('Overview data load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOverviewData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard Overview
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Platform overview, security telemetry, and recent tenant activity.
          </p>
        </div>
        {loading && (
          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md animate-pulse">
            Loading data...
          </span>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs animate-pulse space-y-3"
            >
              <div className="h-3 bg-slate-200 rounded w-24"></div>
              <div className="h-7 bg-slate-200 rounded w-16"></div>
              <div className="h-2.5 bg-slate-100 rounded w-32"></div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Security Events
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900">{stats.eventsTotal}</div>
              <div className="text-[11px] text-amber-700 font-medium mt-1">
                {stats.openThreats} open threats
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Audit Trail
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900">{stats.auditTotal}</div>
              <p className="text-[11px] text-slate-400 mt-1">Compliance actions recorded</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Campaigns
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900">{stats.campaignsTotal}</div>
              <p className="text-[11px] text-slate-400 mt-1">Security initiatives</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tenant Members
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900">{stats.usersTotal}</div>
              <p className="text-[11px] text-slate-400 mt-1">Provisioned accounts</p>
            </div>
          </>
        )}
      </div>

      {/* Two Columns: Recent Security Events & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Security Events */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Recent Security Events</h3>
            <NavLink
              to="/admin/events"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              View all &rarr;
            </NavLink>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
                Loading recent security events...
              </div>
            ) : recentEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No security events detected.
              </div>
            ) : (
              recentEvents.map((ev) => (
                <div key={ev.id} className="p-3.5 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 font-mono">{ev.eventType}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          ev.severity === 'CRITICAL' || ev.severity === 'HIGH'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {ev.severity}
                      </span>
                    </div>
                    <p className="text-slate-500 truncate mt-0.5 max-w-xs">{ev.description}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">{formatDate(ev.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Recent Audit Logs</h3>
            <NavLink
              to="/admin/audit-logs"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View all &rarr;
            </NavLink>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
                Loading recent audit records...
              </div>
            ) : recentLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No audit activity recorded yet.
              </div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="p-3.5 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-indigo-700 font-mono">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-medium">({log.resourceType})</span>
                    </div>
                    <p className="text-slate-500 truncate mt-0.5 max-w-xs">
                      {log.description} {log.user?.name ? `by ${log.user.name}` : ''}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">{formatDate(log.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
