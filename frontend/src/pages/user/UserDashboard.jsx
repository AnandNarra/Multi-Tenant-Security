import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserDashboard } from '../../api/userApi';
import UserStatsCards from '../../components/user/UserStatsCards';
import RecentCampaigns from '../../components/user/RecentCampaigns';

const UserDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    user: null,
    stats: {
      assignedCampaigns: 0,
      activeCampaigns: 0,
      completedCampaigns: 0,
    },
    recentCampaigns: [],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getUserDashboard();
      if (res?.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Failed to load user dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            User Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            View your assigned campaigns and track your security initiative progress.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Refresh dashboard"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>

          <NavLink
            to="/user/campaigns"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            View My Campaigns &rarr;
          </NavLink>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <UserStatsCards stats={dashboardData?.stats} loading={loading} />

      {/* Recent Campaigns */}
      <RecentCampaigns
        campaigns={dashboardData?.recentCampaigns}
        loading={loading}
      />
    </div>
  );
};

export default UserDashboard;
