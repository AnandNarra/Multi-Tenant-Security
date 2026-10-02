import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCampaigns } from '../../api/campaignApi';
import { getSecurityEvents } from '../../api/securityEventApi';
import CampaignStatusBadge from '../../components/manager/CampaignStatusBadge';
import SecurityEventSeverityBadge from '../../components/manager/SecurityEventSeverityBadge';
import SecurityEventStatusBadge from '../../components/manager/SecurityEventStatusBadge';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const ManagerDashboard = () => {
  const { user, organization } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    draftCampaigns: 0,
    completedCampaigns: 0,
    openEvents: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [campaignsRes, eventsRes] = await Promise.allSettled([
          getCampaigns({ page: 1, limit: 10 }),
          getSecurityEvents({ page: 1, limit: 5 }),
        ]);

        const newStats = {
          activeCampaigns: 0,
          draftCampaigns: 0,
          completedCampaigns: 0,
          openEvents: 0,
        };

        if (campaignsRes.status === 'fulfilled') {
          const cVal = campaignsRes.value;
          let allCamps = [];
          if (Array.isArray(cVal)) allCamps = cVal;
          else if (Array.isArray(cVal?.data?.campaigns)) allCamps = cVal.data.campaigns;
          else if (Array.isArray(cVal?.campaigns)) allCamps = cVal.campaigns;
          else if (Array.isArray(cVal?.data)) allCamps = cVal.data;

          setRecentCampaigns(allCamps.slice(0, 5));

          // Calculate status counts
          newStats.activeCampaigns = allCamps.filter((c) => c.status === 'ACTIVE').length;
          newStats.draftCampaigns = allCamps.filter((c) => c.status === 'DRAFT').length;
          newStats.completedCampaigns = allCamps.filter((c) => c.status === 'COMPLETED').length;
        }

        if (eventsRes.status === 'fulfilled') {
          const eVal = eventsRes.value;
          let allEvents = [];
          if (Array.isArray(eVal)) allEvents = eVal;
          else if (Array.isArray(eVal?.data?.events)) allEvents = eVal.data.events;
          else if (Array.isArray(eVal?.events)) allEvents = eVal.events;
          else if (Array.isArray(eVal?.data)) allEvents = eVal.data;

          setRecentEvents(allEvents.slice(0, 5));
          newStats.openEvents = allEvents.filter((e) => e.status === 'OPEN').length;
        }

        setStats(newStats);
      } catch (err) {
        console.error('Manager dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Manager Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage campaigns and monitor security activity for your organization.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <NavLink
            to="/manager/campaigns"
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
          >
            + Create Campaign
          </NavLink>
          <NavLink
            to="/manager/security-events"
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
          >
            + Log Security Event
          </NavLink>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs animate-pulse space-y-3"
            >
              <div className="h-3 bg-slate-200 rounded w-28"></div>
              <div className="h-7 bg-slate-200 rounded w-16"></div>
              <div className="h-2.5 bg-slate-100 rounded w-36"></div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Campaigns
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{stats.activeCampaigns}</div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">In progress & live</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Draft Campaigns
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{stats.draftCampaigns}</div>
              <p className="text-[11px] text-amber-600 font-medium mt-1">Pending launch</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Completed Campaigns
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{stats.completedCampaigns}</div>
              <p className="text-[11px] text-teal-600 font-medium mt-1">Successfully concluded</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Open Security Events
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{stats.openEvents}</div>
              <p className="text-[11px] text-rose-600 font-medium mt-1">Awaiting review</p>
            </div>
          </>
        )}
      </div>

      {/* Two Column Layout: Recent Campaigns & Recent Security Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Recent Campaigns</h3>
            <NavLink
              to="/manager/campaigns"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              View all &rarr;
            </NavLink>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
                Loading campaigns...
              </div>
            ) : recentCampaigns.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No campaigns created yet.
              </div>
            ) : (
              recentCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  onClick={() => navigate(`/manager/campaigns/${camp.id}`)}
                  className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900 block truncate">
                      {camp.name}
                    </span>
                    <span className="text-slate-400 text-[11px] truncate block mt-0.5">
                      {camp.description || 'No description provided'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <CampaignStatusBadge status={camp.status} />
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {formatDate(camp.updatedAt || camp.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Security Events */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Recent Security Events</h3>
            <NavLink
              to="/manager/security-events"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              View all &rarr;
            </NavLink>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
                Loading security events...
              </div>
            ) : recentEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No recent security events detected.
              </div>
            ) : (
              recentEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 font-mono">{ev.eventType}</span>
                      <SecurityEventSeverityBadge severity={ev.severity} />
                    </div>
                    <p className="text-slate-500 truncate mt-0.5 max-w-xs">{ev.description}</p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <SecurityEventStatusBadge status={ev.status} />
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {formatTime(ev.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
