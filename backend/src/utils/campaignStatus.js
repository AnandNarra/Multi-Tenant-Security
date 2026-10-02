export const CAMPAIGN_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const ALLOWED_TRANSITIONS = {
  [CAMPAIGN_STATUS.DRAFT]: [CAMPAIGN_STATUS.ACTIVE, CAMPAIGN_STATUS.CANCELLED],
  [CAMPAIGN_STATUS.ACTIVE]: [CAMPAIGN_STATUS.COMPLETED, CAMPAIGN_STATUS.CANCELLED],
  [CAMPAIGN_STATUS.COMPLETED]: [],
  [CAMPAIGN_STATUS.CANCELLED]: [],
};

/**
 * Validates whether a campaign can transition from currentStatus to newStatus.
 * Same status transition is considered invalid.
 * Terminal states (COMPLETED, CANCELLED) cannot transition to any state.
 *
 * @param {string} currentStatus
 * @param {string} newStatus
 * @returns {boolean}
 */
export const canTransitionCampaignStatus = (currentStatus, newStatus) => {
  if (!currentStatus || !newStatus) return false;
  if (currentStatus === newStatus) return false;

  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed) return false;

  return allowed.includes(newStatus);
};
