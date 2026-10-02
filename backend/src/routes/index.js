import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
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

// User Management Routes (GET /api/users, POST /api/users)
router.use('/users', userRoutes);

// Direct endpoints
router.post('/createUser', authenticate, authorizeRoles('ADMIN'), createUser);
router.get('/getUsers', authenticate, authorizeRoles('ADMIN', 'MANAGER'), getOrganizationUsers);

export default router;
