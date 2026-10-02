import { and, desc, asc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { securityEvents, users } from '../db/schema/index.js';
import {
  validateCreateSecurityEvent,
  validateUpdateSecurityEventStatus,
} from '../validators/securityEvent.validator.js';
import { canTransitionSecurityEventStatus } from '../utils/securityEventStatus.js';
import { createAuditLog } from '../services/audit.service.js';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../utils/auditActions.js';

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
 * Create a new security event (ADMIN, MANAGER)
 * Organization scoped to req.user.organizationId
 */
export const createSecurityEvent = async (req, res) => {
  try {
    if (!req.user || !req.user.organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const validationResult = validateCreateSecurityEvent(req.body);
    if (!validationResult.success) {
      const errors = formatZodErrors(validationResult.error);
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    const { eventType, severity, status = 'OPEN', description, userId } = validationResult.data;
    const organizationId = req.user.organizationId;

    // If userId is provided, verify user exists in the SAME organization
    if (userId) {
      const [targetUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
        .limit(1);

      if (!targetUser) {
        return res.status(422).json({
          success: false,
          message: 'Target user does not exist in your organization',
          errors: { userId: 'User not found in organization' },
        });
      }
    }

    // Insert security event and create audit log within transaction
    const result = await db.transaction(async (tx) => {
      const [newEvent] = await tx
        .insert(securityEvents)
        .values({
          organizationId,
          userId: userId || null,
          eventType,
          severity,
          status: status || 'OPEN',
          description: description.trim(),
        })
        .returning();

      // Automatically create audit log
      await createAuditLog(
        {
          organizationId,
          userId: req.user.id,
          action: AUDIT_ACTIONS.SECURITY_EVENT_CREATED,
          resourceType: AUDIT_RESOURCE_TYPES.SECURITY_EVENT,
          resourceId: newEvent.id,
          description: `Security event created: ${eventType} (${severity})`,
          metadata: {
            eventType,
            severity,
            status: newEvent.status,
          },
        },
        tx
      );

      return newEvent;
    });

    return res.status(201).json({
      success: true,
      message: 'Security event created successfully',
      data: {
        event: result,
      },
    });
  } catch (error) {
    console.error('Create security event error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to process request',
    });
  }
};

/**
 * List security events with pagination, filtering, and sorting
 * Scoped to req.user.organizationId
 */
export const getSecurityEvents = async (req, res) => {
  try {
    if (!req.user || !req.user.organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const organizationId = req.user.organizationId;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const severity = req.query.severity ? String(req.query.severity).trim() : null;
    const status = req.query.status ? String(req.query.status).trim() : null;
    const eventType = req.query.eventType ? String(req.query.eventType).trim() : null;
    const userId = req.query.userId ? String(req.query.userId).trim() : null;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = (req.query.sortOrder || 'desc').toLowerCase();

    // Filter conditions
    const conditions = [eq(securityEvents.organizationId, organizationId)];

    if (severity) {
      conditions.push(eq(securityEvents.severity, severity));
    }
    if (status) {
      conditions.push(eq(securityEvents.status, status));
    }
    if (eventType) {
      conditions.push(eq(securityEvents.eventType, eventType));
    }
    if (userId && isValidUuid(userId)) {
      conditions.push(eq(securityEvents.userId, userId));
    }

    // Total matching count
    const [countResult] = await db
      .select({ count: sql`cast(count(${securityEvents.id}) as int)` })
      .from(securityEvents)
      .where(and(...conditions));

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    // Sorting with whitelist
    let sortCol = securityEvents.createdAt;
    if (sortBy === 'severity') sortCol = securityEvents.severity;
    else if (sortBy === 'status') sortCol = securityEvents.status;
    else if (sortBy === 'eventType') sortCol = securityEvents.eventType;

    const orderClause = sortOrder === 'asc' ? asc(sortCol) : desc(sortCol);

    const eventsList = await db
      .select({
        id: securityEvents.id,
        organizationId: securityEvents.organizationId,
        userId: securityEvents.userId,
        eventType: securityEvents.eventType,
        severity: securityEvents.severity,
        status: securityEvents.status,
        description: securityEvents.description,
        createdAt: securityEvents.createdAt,
      })
      .from(securityEvents)
      .where(and(...conditions))
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset);

    return res.status(200).json({
      success: true,
      data: {
        events: eventsList,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error('Get security events error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to process request',
    });
  }
};

/**
 * Get a single security event by ID
 * Scoped to req.user.organizationId
 */
export const getSecurityEventById = async (req, res) => {
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
        message: 'Security event not found',
      });
    }

    const organizationId = req.user.organizationId;

    const [event] = await db
      .select({
        id: securityEvents.id,
        organizationId: securityEvents.organizationId,
        userId: securityEvents.userId,
        eventType: securityEvents.eventType,
        severity: securityEvents.severity,
        status: securityEvents.status,
        description: securityEvents.description,
        createdAt: securityEvents.createdAt,
      })
      .from(securityEvents)
      .where(
        and(
          eq(securityEvents.id, id),
          eq(securityEvents.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Security event not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        event,
      },
    });
  } catch (error) {
    console.error('Get security event by id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to process request',
    });
  }
};

/**
 * Update security event status (ADMIN, MANAGER)
 * Validates state transition
 */
export const updateSecurityEventStatus = async (req, res) => {
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
        message: 'Security event not found',
      });
    }

    const validationResult = validateUpdateSecurityEventStatus(req.body);
    if (!validationResult.success) {
      const errors = formatZodErrors(validationResult.error);
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    const { status: newStatus } = validationResult.data;
    const organizationId = req.user.organizationId;

    // Check existing event
    const [existingEvent] = await db
      .select()
      .from(securityEvents)
      .where(
        and(
          eq(securityEvents.id, id),
          eq(securityEvents.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Security event not found',
      });
    }

    // Validate transition
    const isValidTransition = canTransitionSecurityEventStatus(existingEvent.status, newStatus);
    if (!isValidTransition) {
      return res.status(422).json({
        success: false,
        message: 'Invalid security event status transition',
      });
    }

    // Update event and create audit log within transaction
    const result = await db.transaction(async (tx) => {
      const [updatedEvent] = await tx
        .update(securityEvents)
        .set({ status: newStatus })
        .where(
          and(
            eq(securityEvents.id, id),
            eq(securityEvents.organizationId, organizationId)
          )
        )
        .returning();

      // Create audit log
      await createAuditLog(
        {
          organizationId,
          userId: req.user.id,
          action: AUDIT_ACTIONS.SECURITY_EVENT_UPDATED,
          resourceType: AUDIT_RESOURCE_TYPES.SECURITY_EVENT,
          resourceId: id,
          description: `Security event status updated from ${existingEvent.status} to ${newStatus}`,
          metadata: {
            previousStatus: existingEvent.status,
            newStatus,
          },
        },
        tx
      );

      return updatedEvent;
    });

    return res.status(200).json({
      success: true,
      message: 'Security event status updated successfully',
      data: {
        event: result,
      },
    });
  } catch (error) {
    console.error('Update security event status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to process request',
    });
  }
};
