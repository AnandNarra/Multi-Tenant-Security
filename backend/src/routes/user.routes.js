import { Router } from 'express';
import { createUser, getOrganizationUsers, getUserDashboard } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorize.js';

const router = Router();

// GET /api/user/dashboard (and /api/users/dashboard) - Get dashboard stats and recent campaigns for user
router.get('/dashboard', authenticate, authorizeRoles('USER', 'ADMIN', 'MANAGER'), getUserDashboard);

// GET /api/users - Get all users scoped to authenticated user's organization
router.get('/', authenticate, authorizeRoles('ADMIN', 'MANAGER'), getOrganizationUsers);

// POST /api/users - Create new user scoped to admin's organization
router.post('/', authenticate, authorizeRoles('ADMIN'), createUser);

export default router;

