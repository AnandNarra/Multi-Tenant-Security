import { Router } from 'express';
import {
  createSecurityEvent,
  getSecurityEvents,
  getSecurityEventById,
  updateSecurityEventStatus,
} from '../controllers/securityEvent.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorize.js';

const router = Router();

// Require authentication for all security event endpoints
router.use(authenticate);

// POST /api/security-events - Create security event (ADMIN, MANAGER)
router.post(
  '/',
  authorizeRoles('ADMIN', 'MANAGER', 'You do not have permission to perform this action'),
  createSecurityEvent
);

// GET /api/security-events - List security events (ADMIN, MANAGER)
router.get(
  '/',
  authorizeRoles('ADMIN', 'MANAGER', 'You do not have permission to perform this action'),
  getSecurityEvents
);

// GET /api/security-events/:id - Get single security event (ADMIN, MANAGER)
router.get(
  '/:id',
  authorizeRoles('ADMIN', 'MANAGER', 'You do not have permission to perform this action'),
  getSecurityEventById
);

// PATCH /api/security-events/:id/status - Update security event status (ADMIN, MANAGER)
router.patch(
  '/:id/status',
  authorizeRoles('ADMIN', 'MANAGER', 'You do not have permission to perform this action'),
  updateSecurityEventStatus
);

export default router;
