import { db } from '../db/index.js';
import { auditLogs } from '../db/schema/index.js';

/**
 * Sanitize metadata to prevent leaking sensitive information
 */
const sanitizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') return null;

  const forbiddenKeys = [
    'password',
    'passwordhash',
    'password_hash',
    'accesstoken',
    'refreshtoken',
    'token',
    'jwtsecret',
    'secret',
  ];

  const sanitized = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!forbiddenKeys.includes(key.toLowerCase())) {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
};

/**
 * Create an audit log record
 * Can be called with an optional transaction client (tx)
 */
export const createAuditLog = async (
  {
    organizationId,
    userId = null,
    action,
    resourceType,
    resourceId = null,
    description,
    metadata = null,
  },
  tx = null
) => {
  try {
    if (!organizationId) {
      console.warn('Audit log skipped: missing organizationId');
      return null;
    }

    const client = tx || db;
    const cleanMetadata = sanitizeMetadata(metadata);

    const [newLog] = await client
      .insert(auditLogs)
      .values({
        organizationId,
        userId: userId || null,
        action,
        resourceType,
        resourceId: resourceId || null,
        description: description || action,
        metadata: cleanMetadata,
      })
      .returning();

    return newLog;
  } catch (error) {
    console.error('Create audit log error:', error);
    // If inside a transaction, re-throw so the transaction rolls back consistently
    if (tx) {
      throw error;
    }
    return null;
  }
};
