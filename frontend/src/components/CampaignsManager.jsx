import React from 'react';
import { ShieldCheck, Plus } from 'lucide-react';

const CampaignsManager = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Campaigns</h2>
          <p className="text-xs text-slate-500 mt-1">Simulated training and compliance campaigns.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0284c7] hover:bg-sky-600 text-white shadow-sm shadow-sky-500/20 transition-all cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-slate-700">No active campaigns</h4>
        <p className="text-xs text-slate-400 mt-1">Create a campaign to test security awareness.</p>
      </div>
    </div>
  );
};

export default CampaignsManager;
