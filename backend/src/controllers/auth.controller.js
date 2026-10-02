import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { organizations, users, refreshTokens, securityEvents } from '../db/schema/index.js';
import { validateRegistration, validateLogin } from '../validators/auth.validator.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, hashToken } from '../utils/jwt.js';
import { createAuditLog } from '../services/audit.service.js';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../utils/auditActions.js';

export const registerOrganization = async (req, res) => {
  try {
    // 1. Zod Validation
    const validationResult = validateRegistration(req.body);

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

    const { organizationName, organizationEmail, password } = validationResult.data;
    const normalizedEmail = organizationEmail.trim().toLowerCase();

    // 2. Check for duplicate organization email
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.email, normalizedEmail))
      .limit(1);

    if (existingOrg) {
      return res.status(409).json({
        success: false,
        message: 'An organization with this email already exists',
      });
    }

    // 3. Perform Transaction: Create Organization + First ADMIN User
    const result = await db.transaction(async (tx) => {
      // Create Organization
      const [newOrg] = await tx
        .insert(organizations)
        .values({
          name: organizationName.trim(),
          email: normalizedEmail,
        })
        .returning({
          id: organizations.id,
          name: organizations.name,
          email: organizations.email,
        });

      // Hash Password
      const passwordHash = await hashPassword(password);

      // Create initial ADMIN User
      await tx.insert(users).values({
        organizationId: newOrg.id,
        name: organizationName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      return newOrg;
    });

    // 4. Return Success Response
    return res.status(201).json({
      success: true,
      message: 'Organization registered successfully',
      data: {
        organization: {
          id: result.id,
          name: result.name,
          email: result.email,
        },
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to register organization',
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    // 1. Zod Validation
    const validationResult = validateLogin(req.body);

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

    const { email, password } = validationResult.data;
    const normalizedEmail = email.trim().toLowerCase();

    // 2. Find User by Email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 3. Status check: Inactive users cannot log in (do not expose account status)
    if (user.status && user.status !== 'ACTIVE') {
      // Record failed login audit log and security event
      await createAuditLog({
        organizationId: user.organizationId,
        userId: user.id,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        resourceType: AUDIT_RESOURCE_TYPES.AUTH,
        description: 'Failed login attempt',
      });

      await db.insert(securityEvents).values({
        organizationId: user.organizationId,
        userId: user.id,
        eventType: 'LOGIN_FAILED',
        severity: 'MEDIUM',
        status: 'OPEN',
        description: 'Failed login attempt',
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 4. Verify Password with bcrypt
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      // Record failed login audit log and security event
      await createAuditLog({
        organizationId: user.organizationId,
        userId: user.id,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        resourceType: AUDIT_RESOURCE_TYPES.AUTH,
        description: 'Failed login attempt',
      });

      await db.insert(securityEvents).values({
        organizationId: user.organizationId,
        userId: user.id,
        eventType: 'LOGIN_FAILED',
        severity: 'MEDIUM',
        status: 'OPEN',
        description: 'Failed login attempt',
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 5. Retrieve Organization Details
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);

    if (!org) {
      return res.status(500).json({
        success: false,
        message: 'Unable to login',
      });
    }

    // 6. Generate JWT Access and Refresh Tokens
    const tokenPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ sub: user.id });

    // 7. Hash and Save Refresh Token in Database
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // 8. Create Audit Log and Security Event for successful login
    await createAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      resourceType: AUDIT_RESOURCE_TYPES.AUTH,
      description: 'User logged in successfully',
    });

    await db.insert(securityEvents).values({
      organizationId: user.organizationId,
      userId: user.id,
      eventType: 'LOGIN_SUCCESS',
      severity: 'LOW',
      status: 'RESOLVED',
      description: 'Successful login',
    });

    // 9. Set HTTP-Only Refresh Token Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 10. Return Safe Response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          organizationId: user.organizationId,
        },
        organization: {
          id: org.id,
          name: org.name,
          email: org.email,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to login',
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;

    if (rawRefreshToken) {
      // 1. Hash the incoming refresh token using the same hashing strategy
      const tokenHash = hashToken(rawRefreshToken);

      // Find token record to record logout audit log
      const [tokenRecord] = await db
        .select({ userId: refreshTokens.userId, organizationId: users.organizationId })
        .from(refreshTokens)
        .leftJoin(users, eq(refreshTokens.userId, users.id))
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1);

      if (tokenRecord && tokenRecord.organizationId) {
        await createAuditLog({
          organizationId: tokenRecord.organizationId,
          userId: tokenRecord.userId,
          action: AUDIT_ACTIONS.LOGOUT,
          resourceType: AUDIT_RESOURCE_TYPES.AUTH,
          description: 'User logged out',
        });
      }

      // 2. Revoke the token record in PostgreSQL by setting revoked_at timestamp
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.tokenHash, tokenHash));
    }

    // 3. Clear the HTTP-only cookie with matching path & security options
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    });

    // 4. Return idempotent success response
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to logout',
    });
  }
};
