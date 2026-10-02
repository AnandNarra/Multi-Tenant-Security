import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import CampaignStatusBadge from './CampaignStatusBadge';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const RecentCampaigns = ({ campaigns = [], loading = false }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-900">Recent Campaigns</h3>
        <NavLink
          to="/user/campaigns"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          View all &rarr;
        </NavLink>
      </div>

      <div className="divide-y divide-slate-100 flex-1">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No campaigns assigned yet.
          </div>
        ) : (
          campaigns.map((camp) => (
            <div
              key={camp.id}
              onClick={() => navigate(`/user/campaigns/${camp.id}`)}
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
  );
};

export default RecentCampaigns;
