export const SECURITY_EVENT_TYPES = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'SUSPICIOUS_ACTIVITY',
  'UNAUTHORIZED_ACCESS',
  'ACCOUNT_LOCKED',
  'SECURITY_ALERT',
  'OTHER',
];

export const SECURITY_EVENT_SEVERITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];

export const SECURITY_EVENT_STATUSES = [
  'OPEN',
  'INVESTIGATING',
  'RESOLVED',
];

/**
 * Validates allowed status transitions for security events
 * OPEN -> INVESTIGATING
 * OPEN -> RESOLVED
 * INVESTIGATING -> RESOLVED
 */
export const canTransitionSecurityEventStatus = (currentStatus, newStatus) => {
  if (!currentStatus || !newStatus) return false;
  if (currentStatus === newStatus) return true;

  const validTransitions = {
    OPEN: ['INVESTIGATING', 'RESOLVED'],
    INVESTIGATING: ['RESOLVED'],
    RESOLVED: [],
  };

  const allowed = validTransitions[currentStatus] || [];
  return allowed.includes(newStatus);
};
