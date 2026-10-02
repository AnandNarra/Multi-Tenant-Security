import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { auditLogs, users } from '../db/schema/index.js';
import { validateAuditLogQuery } from '../validators/auditLog.validator.js';

const formatZodErrors = (error) => {
  const errors = {};
  const issues = error.issues || error.errors || [];
  issues.forEach((err) => {
    const field = err.path && err.path.length > 0 ? err.path[0] : 'general';
    errors[field] = err.message;
  });
  return errors;
};

const isValidUuid = (val) => {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

/**
 * List audit logs with pagination and filters (ADMIN only)
 * Scoped to req.user.organizationId
 */
export const getAuditLogs = async (req, res) => {
  try {
    if (!req.user || !req.user.organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const validationResult = validateAuditLogQuery(req.query);
    if (!validationResult.success) {
      const errors = formatZodErrors(validationResult.error);
      const issues = validationResult.error.issues || validationResult.error.errors || [];
      const hasDateOrderError = issues.some(
        (issue) => issue.message === 'dateFrom cannot be later than dateTo'
      );

      return res.status(422).json({
        success: false,
        message: hasDateOrderError ? 'dateFrom cannot be later than dateTo' : 'Validation failed',
        errors,
      });
    }

    const { page = 1, limit = 20, action, resourceType, userId, dateFrom, dateTo } =
      validationResult.data;
    const organizationId = req.user.organizationId;

    // Filter conditions
    const conditions = [eq(auditLogs.organizationId, organizationId)];

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }
    if (resourceType) {
      conditions.push(eq(auditLogs.resourceType, resourceType));
    }
    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }
    if (dateFrom) {
      conditions.push(gte(auditLogs.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      // Set to end of day if only date is passed
      const toDate = new Date(dateTo);
      if (dateTo.length <= 10) {
        toDate.setHours(23, 59, 59, 999);
      }
      conditions.push(lte(auditLogs.createdAt, toDate));
    }

    // Count matching records
    const [countResult] = await db
      .select({ count: sql`cast(count(${auditLogs.id}) as int)` })
      .from(auditLogs)
      .where(and(...conditions));

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    // Fetch logs joined with users (excluding passwordHash)
    const rawLogs = await db
      .select({
        id: auditLogs.id,
        organizationId: auditLogs.organizationId,
        userId: auditLogs.userId,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        description: auditLogs.description,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const formattedLogs = rawLogs.map((log) => ({
      id: log.id,
      organizationId: log.organizationId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      description: log.description,
      metadata: log.metadata || {},
      createdAt: log.createdAt,
      user: log.userId
        ? {
            id: log.userId,
            name: log.userName || null,
            email: log.userEmail || null,
            role: log.userRole || null,
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to process request',
    });
  }
};

/**
 * Get audit log details by ID (ADMIN only)
 * Scoped to req.user.organizationId
 */
export const getAuditLogById = async (req, res) => {
  try {
    if (!req.user || !req.user.organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found',
      });
    }

    const organizationId = req.user.organizationId;

    const [log] = await db
      .select({
        id: auditLogs.id,
        organizationId: auditLogs.organizationId,
        userId: auditLogs.userId,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        description: auditLogs.description,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(
        and(
          eq(auditLogs.id, id),
          eq(auditLogs.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found',
      });
    }

    const formattedLog = {
      id: log.id,
      organizationId: log.organizationId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      description: log.description,
      metadata: log.metadata || {},
      createdAt: log.createdAt,
      user: log.userId
        ? {
            id: log.userId,
            name: log.userName || null,
            email: log.userEmail || null,
            role: log.userRole || null,
          }
        : null,
    };

    return res.status(200).json({
      success: true,
      data: {
        log: formattedLog,
      },
    });
  } catch (error) {
    console.error('Get audit log by id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to process request',
    });
  }
};
