import { Router } from 'express';
import {
  getAuditLogs,
  getAuditLogById,
} from '../controllers/auditLog.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorize.js';

const router = Router();

// Require authentication for all audit log endpoints
router.use(authenticate);

// GET /api/audit-logs - List audit logs (ADMIN only)
router.get(
  '/',
  authorizeRoles('ADMIN', 'You do not have permission to view audit logs'),
  getAuditLogs
);

// GET /api/audit-logs/:id - Get audit log details by ID (ADMIN only)
router.get(
  '/:id',
  authorizeRoles('ADMIN', 'You do not have permission to view audit logs'),
  getAuditLogById
);

export default router;
