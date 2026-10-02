import { and, desc, asc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { campaigns, campaignUsers, users } from '../db/schema/index.js';
import { canTransitionCampaignStatus } from '../utils/campaignStatus.js';
import {
  validateCreateCampaign,
  validateUpdateCampaign,
  validateAssignUser,
} from '../validators/campaign.validator.js';
import { createAuditLog } from '../services/audit.service.js';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../utils/auditActions.js';

/**
 * Format Zod validation errors
 */
const formatZodErrors = (error) => {
  const errors = {};
  const issues = error.issues || error.errors || [];
  issues.forEach((err) => {
    const field = err.path && err.path.length > 0 ? err.path[0] : 'general';
    errors[field] = err.message;
  });
  return errors;
};

/**
 * Helper to check UUID pattern
 */
const isValidUuid = (val) => {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

/**
 * Create a new campaign
 * Scoped to req.user.organizationId
 */
export const createCampaign = async (req, res) => {
  try {
    if (!req.user || !req.user.organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const validationResult = validateCreateCampaign(req.body);
    if (!validationResult.success) {
      const errors = formatZodErrors(validationResult.error);
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    const { name, description, status = 'DRAFT' } = validationResult.data;
    const organizationId = req.user.organizationId;

    const newCampaign = await db.transaction(async (tx) => {
      const [insertedCampaign] = await tx
        .insert(campaigns)
        .values({
          organizationId,
          name: name.trim(),
          description: description || null,
          status: status || 'DRAFT',
        })
        .returning({
          id: campaigns.id,
          organizationId: campaigns.organizationId,
          name: campaigns.name,
          description: campaigns.description,
          status: campaigns.status,
          createdAt: campaigns.createdAt,
          updatedAt: campaigns.updatedAt,
        });

      await createAuditLog(
        {
          organizationId,
          userId: req.user.id,
          action: AUDIT_ACTIONS.CAMPAIGN_CREATED,
          resourceType: AUDIT_RESOURCE_TYPES.CAMPAIGN,
          resourceId: insertedCampaign.id,
          description: 'Campaign created',
          metadata: {
            name: insertedCampaign.name,
            status: insertedCampaign.status,
          },
        },
        tx
      );

      return insertedCampaign;
    });

    return res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: {
        campaign: newCampaign,
      },
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to process campaign request',
    });
  }
};

/**
 * List campaigns scoped to the authenticated organization with pagination (7 per page), search, status filter, and sorting
 */
export const getCampaigns = async (req, res) => {
  try {
    if (!req.user || !req.user.organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const organizationId = req.user.organizationId;

    // Pagination parameters (7 elements per page default)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 7);
    const search = req.query.search ? String(req.query.search).trim() : '';
    const status = req.query.status ? String(req.query.status).trim() : 'ALL';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = (req.query.sortOrder || 'desc').toLowerCase();

    // Build filter conditions
    const conditions = [eq(campaigns.organizationId, organizationId)];

    if (status && status !== 'ALL') {
      conditions.push(eq(campaigns.status, status));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(campaigns.name, searchPattern),
          ilike(campaigns.description, searchPattern)
        )
      );
    }

    // Get total matching count
    const [countResult] = await db
      .select({ count: sql`cast(count(distinct ${campaigns.id}) as int)` })
      .from(campaigns)
      .where(and(...conditions));

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    // Determine sort column
    let sortColumn = campaigns.createdAt;
    if (sortBy === 'name') sortColumn = campaigns.name;
    else if (sortBy === 'status') sortColumn = campaigns.status;
    else if (sortBy === 'updatedAt') sortColumn = campaigns.updatedAt;

    const orderClause = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    // Fetch paginated campaigns with member count
    const orgCampaigns = await db
      .select({
        id: campaigns.id,
        organizationId: campaigns.organizationId,
        name: campaigns.name,
        description: campaigns.description,
        status: campaigns.status,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
        memberCount: sql`cast(count(${campaignUsers.id}) as int)`,
      })
      .from(campaigns)
      .leftJoin(campaignUsers, eq(campaignUsers.campaignId, campaigns.id))
      .where(and(...conditions))
      .groupBy(campaigns.id)
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset);

    return res.status(200).json({
      success: true,
      data: {
        campaigns: orgCampaigns,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to process campaign request',
    });
  }
};

/**
 * Get a single campaign with assigned users
 * Scoped to req.user.organizationId
 */
export const getCampaignById = async (req, res) => {
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
        message: 'Campaign not found',
      });
    }

    const organizationId = req.user.organizationId;

    const [campaign] = await db
      .select({
        id: campaigns.id,
        organizationId: campaigns.organizationId,
        name: campaigns.name,
        description: campaigns.description,
        status: campaigns.status,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
      })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, id),
          eq(campaigns.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    // Retrieve assigned users for this campaign (excluding passwordHash)
    const assignedUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(campaignUsers)
      .innerJoin(users, eq(campaignUsers.userId, users.id))
      .where(eq(campaignUsers.campaignId, id));

    return res.status(200).json({
      success: true,
      data: {
        campaign: {
          ...campaign,
          assignedUsers,
        },
      },
    });
  } catch (error) {
    console.error('Get campaign by id error:', error);
    if (error.code === '22P02') {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Unable to process campaign request',
    });
  }
};

/**
 * Update campaign details and/or status
 * Validates status transitions and ensures organization isolation
 */
export const updateCampaign = async (req, res) => {
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
        message: 'Campaign not found',
      });
    }

    // Check if body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(422).json({
        success: false,
        message: 'At least one field is required',
      });
    }

    const validationResult = validateUpdateCampaign(req.body);
    if (!validationResult.success) {
      const issues = validationResult.error.issues || validationResult.error.errors || [];
      const hasRootRequiredError = issues.some(
        (issue) => issue.message === 'At least one field is required'
      );

      if (hasRootRequiredError && (!issues[0].path || issues[0].path.length === 0)) {
        return res.status(422).json({
          success: false,
          message: 'At least one field is required',
        });
      }

      const errors = formatZodErrors(validationResult.error);
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    const organizationId = req.user.organizationId;

    // Verify campaign exists and belongs to current organization
    const [existingCampaign] = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, id),
          eq(campaigns.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!existingCampaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    const { name, description, status } = validationResult.data;

    // Validate status transition if status is being updated
    if (status !== undefined) {
      const isValidTransition = canTransitionCampaignStatus(existingCampaign.status, status);
      if (!isValidTransition) {
        return res.status(422).json({
          success: false,
          message: 'Invalid campaign status transition',
        });
      }
    }

    // Prepare update payload
    const updatePayload = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updatePayload.name = name.trim();
    if (description !== undefined) updatePayload.description = description;
    if (status !== undefined) updatePayload.status = status;

    const updatedCampaign = await db.transaction(async (tx) => {
      const [campaignRecord] = await tx
        .update(campaigns)
        .set(updatePayload)
        .where(
          and(
            eq(campaigns.id, id),
            eq(campaigns.organizationId, organizationId)
          )
        )
        .returning({
          id: campaigns.id,
          organizationId: campaigns.organizationId,
          name: campaigns.name,
          description: campaigns.description,
          status: campaigns.status,
          createdAt: campaigns.createdAt,
          updatedAt: campaigns.updatedAt,
        });

      const changedFields = Object.keys(validationResult.data).filter(
        (key) => validationResult.data[key] !== undefined
      );

      await createAuditLog(
        {
          organizationId,
          userId: req.user.id,
          action: AUDIT_ACTIONS.CAMPAIGN_UPDATED,
          resourceType: AUDIT_RESOURCE_TYPES.CAMPAIGN,
          resourceId: campaignRecord.id,
          description: 'Campaign updated',
          metadata: {
            changedFields,
          },
        },
        tx
      );

      return campaignRecord;
    });

    return res.status(200).json({
      success: true,
      message: 'Campaign updated successfully',
      data: {
        campaign: updatedCampaign,
      },
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    if (error.code === '22P02') {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Unable to process campaign request',
    });
  }
};

/**
 * Delete a campaign
 * Only ADMIN can delete
 */
export const deleteCampaign = async (req, res) => {
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
        message: 'Campaign not found',
      });
    }

    const organizationId = req.user.organizationId;

    const [existingCampaign] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, id),
          eq(campaigns.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!existingCampaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(campaigns)
        .where(
          and(
            eq(campaigns.id, id),
            eq(campaigns.organizationId, organizationId)
          )
        );

      await createAuditLog(
        {
          organizationId,
          userId: req.user.id,
          action: AUDIT_ACTIONS.CAMPAIGN_DELETED,
          resourceType: AUDIT_RESOURCE_TYPES.CAMPAIGN,
          resourceId: existingCampaign.id,
          description: 'Campaign deleted',
        },
        tx
      );
    });

    return res.status(200).json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    console.error('Delete campaign error:', error);
    if (error.code === '22P02') {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Unable to process campaign request',
    });
  }
};

/**
 * Assign a user to a campaign
 * Ensures user and campaign both belong to req.user.organizationId
 */
export const assignUserToCampaign = async (req, res) => {
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
        message: 'Campaign not found',
      });
    }

    const validationResult = validateAssignUser(req.body);
    if (!validationResult.success) {
      const errors = formatZodErrors(validationResult.error);
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    const { userId } = validationResult.data;
    const organizationId = req.user.organizationId;

    // 1. Verify campaign exists and belongs to current organization
    const [campaign] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, id),
          eq(campaigns.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    // 2. Verify target user exists and belongs to the SAME organization
    const [targetUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // 3. Check for duplicate assignment
    const [existingAssignment] = await db
      .select({ id: campaignUsers.id })
      .from(campaignUsers)
      .where(
        and(
          eq(campaignUsers.campaignId, id),
          eq(campaignUsers.userId, userId)
        )
      )
      .limit(1);

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        message: 'User is already assigned to this campaign',
      });
    }

    // 4. Insert assignment record and audit log in a transaction
    const newAssignment = await db.transaction(async (tx) => {
      const [insertedAssignment] = await tx
        .insert(campaignUsers)
        .values({
          campaignId: id,
          userId,
        })
        .returning({
          id: campaignUsers.id,
          campaignId: campaignUsers.campaignId,
          userId: campaignUsers.userId,
          assignedAt: campaignUsers.assignedAt,
        });

      await createAuditLog(
        {
          organizationId,
          userId: req.user.id,
          action: AUDIT_ACTIONS.CAMPAIGN_USER_ASSIGNED,
          resourceType: AUDIT_RESOURCE_TYPES.CAMPAIGN,
          resourceId: id,
          description: 'User assigned to campaign',
          metadata: {
            assignedUserId: userId,
          },
        },
        tx
      );

      return insertedAssignment;
    });

    return res.status(201).json({
      success: true,
      message: 'User assigned to campaign successfully',
      data: {
        assignment: newAssignment,
      },
    });
  } catch (error) {
    console.error('Assign user to campaign error:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'User is already assigned to this campaign',
      });
    }
    if (error.code === '22P02') {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Unable to process campaign request',
    });
  }
};

/**
 * Remove a user from a campaign
 * Ensures organization isolation
 */
export const removeUserFromCampaign = async (req, res) => {
  try {
    if (!req.user || !req.user.organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { id, userId } = req.params;
    if (!isValidUuid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }
    if (!isValidUuid(userId)) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const organizationId = req.user.organizationId;

    // 1. Verify campaign exists and belongs to current organization
    const [campaign] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, id),
          eq(campaigns.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    // 2. Verify target user exists and belongs to current organization
    const [targetUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // 3. Find assignment record
    const [assignment] = await db
      .select({ id: campaignUsers.id })
      .from(campaignUsers)
      .where(
        and(
          eq(campaignUsers.campaignId, id),
          eq(campaignUsers.userId, userId)
        )
      )
      .limit(1);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'User is not assigned to this campaign',
      });
    }

    // 4. Delete assignment and record audit log in a transaction
    await db.transaction(async (tx) => {
      await tx
        .delete(campaignUsers)
        .where(eq(campaignUsers.id, assignment.id));

      await createAuditLog(
        {
          organizationId,
          userId: req.user.id,
          action: AUDIT_ACTIONS.CAMPAIGN_USER_REMOVED,
          resourceType: AUDIT_RESOURCE_TYPES.CAMPAIGN,
          resourceId: id,
          description: 'User removed from campaign',
          metadata: {
            removedUserId: userId,
          },
        },
        tx
      );
    });

    return res.status(200).json({
      success: true,
      message: 'User removed from campaign successfully',
    });
  } catch (error) {
    console.error('Remove user from campaign error:', error);
    if (error.code === '22P02') {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Unable to process campaign request',
    });
  }
};
