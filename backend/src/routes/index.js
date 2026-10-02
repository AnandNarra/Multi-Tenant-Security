import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import campaignRoutes from './campaign.routes.js';
import securityEventRoutes from './securityEvent.routes.js';
import auditLogRoutes from './auditLog.routes.js';
import { createUser, getOrganizationUsers } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorize.js';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication Routes
router.use('/auth', authRoutes);

// User Management & Profile Routes (GET /api/users, GET /api/user/dashboard)
router.use('/users', userRoutes);
router.use('/user', userRoutes);

// Campaign Management Routes
router.use('/campaigns', campaignRoutes);

// Security Events Routes
router.use('/security-events', securityEventRoutes);

// Audit Logs Routes
router.use('/audit-logs', auditLogRoutes);

// Direct endpoints
router.post('/createUser', authenticate, authorizeRoles('ADMIN'), createUser);
router.get('/getUsers', authenticate, authorizeRoles('ADMIN', 'MANAGER'), getOrganizationUsers);

export default router;
