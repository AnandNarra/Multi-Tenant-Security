import React from 'react';
import { AlertCircle } from 'lucide-react';

const EventsManager = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Security Events</h2>
        <p className="text-xs text-slate-500 mt-1">Real-time threat detection and security event logs.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-slate-700">All systems secure</h4>
        <p className="text-xs text-slate-400 mt-1">No anomalous security events detected.</p>
      </div>
    </div>
  );
};

export default EventsManager;
