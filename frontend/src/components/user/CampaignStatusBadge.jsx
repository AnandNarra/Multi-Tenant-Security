import React from 'react';

const STATUS_MAP = {
  DRAFT: {
    label: 'DRAFT',
    classes: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  ACTIVE: {
    label: 'ACTIVE',
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  COMPLETED: {
    label: 'COMPLETED',
    classes: 'border-teal-200 bg-teal-50 text-teal-800',
  },
  CANCELLED: {
    label: 'CANCELLED',
    classes: 'border-rose-200 bg-rose-50 text-rose-800',
  },
};

const CampaignStatusBadge = ({ status }) => {
  const normalized = (status || 'DRAFT').toUpperCase();
  const config = STATUS_MAP[normalized] || STATUS_MAP.DRAFT;

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-md border text-[11px] font-bold uppercase tracking-wider ${config.classes}`}
    >
      {config.label}
    </span>
  );
};

export default CampaignStatusBadge;
