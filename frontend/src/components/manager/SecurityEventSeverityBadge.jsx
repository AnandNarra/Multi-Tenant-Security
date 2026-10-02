import React from 'react';

const SEVERITY_MAP = {
  CRITICAL: {
    label: 'CRITICAL',
    classes: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  HIGH: {
    label: 'HIGH',
    classes: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  MEDIUM: {
    label: 'MEDIUM',
    classes: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  LOW: {
    label: 'LOW',
    classes: 'border-sky-200 bg-sky-50 text-sky-700',
  },
};

const SecurityEventSeverityBadge = ({ severity }) => {
  const normalized = (severity || 'LOW').toUpperCase();
  const config = SEVERITY_MAP[normalized] || SEVERITY_MAP.LOW;

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-md border text-[11px] font-bold uppercase tracking-wider ${config.classes}`}
    >
      {config.label}
    </span>
  );
};

export default SecurityEventSeverityBadge;
