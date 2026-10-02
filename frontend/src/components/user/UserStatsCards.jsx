import React from 'react';

const UserStatsCards = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs animate-pulse space-y-3"
          >
            <div className="h-3 bg-slate-200 rounded w-28" />
            <div className="h-7 bg-slate-200 rounded w-16" />
            <div className="h-2.5 bg-slate-100 rounded w-36" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Assigned Campaigns
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-900">
          {stats?.assignedCampaigns ?? 0}
        </div>
        <p className="text-[11px] text-indigo-600 font-medium mt-1">
          Total allocated campaigns
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Active Campaigns
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-900">
          {stats?.activeCampaigns ?? 0}
        </div>
        <p className="text-[11px] text-emerald-600 font-medium mt-1">
          Currently in progress & live
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Completed Campaigns
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-900">
          {stats?.completedCampaigns ?? 0}
        </div>
        <p className="text-[11px] text-teal-600 font-medium mt-1">
          Successfully concluded
        </p>
      </div>
    </div>
  );
};

export default UserStatsCards;
