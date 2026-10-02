import React from 'react';

const STATUS_MAP = {
  OPEN: {
    label: 'OPEN',
    classes: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  INVESTIGATING: {
    label: 'INVESTIGATING',
    classes: 'border-blue-200 bg-blue-50 text-blue-800',
  },
  RESOLVED: {
    label: 'RESOLVED',
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
};

const SecurityEventStatusBadge = ({ status }) => {
  const normalized = (status || 'OPEN').toUpperCase();
  const config = STATUS_MAP[normalized] || STATUS_MAP.OPEN;

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-md border text-[11px] font-bold uppercase tracking-wider ${config.classes}`}
    >
      {config.label}
    </span>
  );
};

export default SecurityEventStatusBadge;
