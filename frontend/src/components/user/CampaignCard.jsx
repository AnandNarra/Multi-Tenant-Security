import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Shield } from 'lucide-react';
import CampaignStatusBadge from './CampaignStatusBadge';

const formatDate = (dateStr) => {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const CampaignCard = ({ campaign }) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors truncate">
              {campaign.name}
            </h3>
          </div>
          <CampaignStatusBadge status={campaign.status} />
        </div>

        <p className="text-slate-600 text-xs leading-relaxed line-clamp-2 mb-4">
          {campaign.description || 'No description provided for this assigned campaign.'}
        </p>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Updated: {formatDate(campaign.updatedAt || campaign.createdAt)}</span>
        </div>

        <Link
          to={`/user/campaigns/${campaign.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer group/btn"
        >
          <span>View Campaign</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

export default CampaignCard;
