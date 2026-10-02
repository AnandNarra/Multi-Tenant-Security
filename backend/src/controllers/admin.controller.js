import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { validateCreateUser } from '../validators/user.validator.js';
import { hashPassword } from '../utils/password.js';
import { createAuditLog } from '../services/audit.service.js';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../utils/auditActions.js';

export const createUser = async (req, res) => {
  try {
    // 1. Verify authenticated user identity and organization
    if (!req.user || !req.user.organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create users',
      });
    }

    // 2. Prevent privilege escalation: ADMIN cannot create another ADMIN through this endpoint
    if (req.body?.role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You cannot create an ADMIN user',
      });
    }

    // 3. Validate request payload using Zod
    const validationResult = validateCreateUser(req.body);

    if (!validationResult.success) {
      const errors = {};
      const issues = validationResult.error.issues || validationResult.error.errors || [];
      issues.forEach((err) => {
        const field = err.path[0] || 'general';
        errors[field] = err.message;
      });

      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    const { name, email, password, role, status = 'ACTIVE' } = validationResult.data;
    const normalizedEmail = email.trim().toLowerCase();
    const organizationId = req.user.organizationId;

    // 4. Check for duplicate email within the same organization
    const [existingUser] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.email, normalizedEmail)
        )
      )
      .limit(1);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists in your organization',
      });
    }

    // 5. Hash password using bcrypt utility
    const passwordHash = await hashPassword(password);

    // 6. Insert new user into database and record audit log within a transaction
    const newUser = await db.transaction(async (tx) => {
      const [insertedUser] = await tx
        .insert(users)
        .values({
          organizationId,
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role,
          status: status || 'ACTIVE',
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          status: users.status,
          organizationId: users.organizationId,
          createdAt: users.createdAt,
        });

      // Create Audit Log
      await createAuditLog(
        {
          organizationId,
          userId: req.user.id,
          action: AUDIT_ACTIONS.USER_CREATED,
          resourceType: AUDIT_RESOURCE_TYPES.USER,
          resourceId: insertedUser.id,
          description: 'User created',
          metadata: {
            role: insertedUser.role,
            status: insertedUser.status,
          },
        },
        tx
      );

      return insertedUser;
    });

    // 7. Return safe 201 response (never return password or hash)
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          organizationId: newUser.organizationId,
          createdAt: newUser.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Create user error:', error);

    // PostgreSQL unique constraint error handling
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists in your organization',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to create user',
    });
  }
};

export const getOrganizationUsers = async (req, res) => {
  try {
    if (!req.user || !req.user.organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const organizationId = req.user.organizationId;

    // Fetch all users scoped to the authenticated user's organization
    const orgUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        organizationId: users.organizationId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(users.createdAt));

    return res.status(200).json({
      success: true,
      message: 'Organization users retrieved successfully',
      data: {
        users: orgUsers,
        total: orgUsers.length,
      },
    });
  } catch (error) {
    console.error('Get organization users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve organization users',
    });
  }
};
