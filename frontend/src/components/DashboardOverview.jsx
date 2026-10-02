import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Users,
  FileText,
  Activity,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
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
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0284c7] to-cyan-600 rounded-2xl p-6 text-white shadow-lg shadow-sky-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wider backdrop-blur-xs">
            Organization Dashboard
          </span>
          <h2 className="text-2xl font-bold tracking-tight mt-2">
            Welcome back, {user?.name || 'Administrator'}
          </h2>
          <p className="text-xs text-sky-100 mt-1 max-w-xl">
            {organization?.name || 'Your organization'} is secured with multi-tenant isolation, real-time security events, and audit logging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <NavLink
            to="/admin/events"
            className="px-4 py-2 rounded-xl bg-white text-[#0284c7] font-semibold text-xs shadow-sm hover:bg-sky-50 transition-colors"
          >
            View Security Events
          </NavLink>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Security Events
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{stats.eventsTotal}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium mt-1">
            <AlertTriangle className="w-3 h-3" />
            <span>{stats.openThreats} open threats</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Audit Trail
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{stats.auditTotal}</div>
          <p className="text-[11px] text-slate-400 mt-1">Compliance actions recorded</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Campaigns
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{stats.campaignsTotal}</div>
          <p className="text-[11px] text-slate-400 mt-1">Security initiatives</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tenant Members
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{stats.usersTotal}</div>
          <p className="text-[11px] text-slate-400 mt-1">Provisioned accounts</p>
        </div>
      </div>

      {/* Two Columns: Recent Security Events & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Security Events */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-sm text-slate-900">Recent Security Events</h3>
            </div>
            <NavLink
              to="/admin/events"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </NavLink>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {recentEvents.length === 0 ? (
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
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">Recent Audit Logs</h3>
            </div>
            <NavLink
              to="/admin/audit-logs"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </NavLink>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {recentLogs.length === 0 ? (
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
