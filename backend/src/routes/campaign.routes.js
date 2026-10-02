import { Router } from 'express';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  assignUserToCampaign,
  removeUserFromCampaign,
} from '../controllers/campaign.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorize.js';

const router = Router();

// Require authentication for all campaign endpoints
router.use(authenticate);

// POST /api/campaigns - Create campaign (ADMIN, MANAGER)
router.post(
  '/',
  authorizeRoles('ADMIN', 'MANAGER', 'You do not have permission to create campaigns'),
  createCampaign
);

// GET /api/campaigns - List campaigns in current organization (ADMIN, MANAGER, USER)
router.get(
  '/',
  authorizeRoles('ADMIN', 'MANAGER', 'USER'),
  getCampaigns
);

// GET /api/campaigns/:id - Get single campaign with assigned users (ADMIN, MANAGER, USER)
router.get(
  '/:id',
  authorizeRoles('ADMIN', 'MANAGER', 'USER'),
  getCampaignById
);

// PATCH /api/campaigns/:id - Update campaign (ADMIN, MANAGER)
router.patch(
  '/:id',
  authorizeRoles('ADMIN', 'MANAGER', 'You do not have permission to perform this action'),
  updateCampaign
);

// DELETE /api/campaigns/:id - Delete campaign (ADMIN only)
router.delete(
  '/:id',
  authorizeRoles('ADMIN', 'You do not have permission to perform this action'),
  deleteCampaign
);

// POST /api/campaigns/:id/users - Assign user to campaign (ADMIN, MANAGER)
router.post(
  '/:id/users',
  authorizeRoles('ADMIN', 'MANAGER', 'You do not have permission to perform this action'),
  assignUserToCampaign
);

// DELETE /api/campaigns/:id/users/:userId - Remove user from campaign (ADMIN, MANAGER)
router.delete(
  '/:id/users/:userId',
  authorizeRoles('ADMIN', 'MANAGER', 'You do not have permission to perform this action'),
  removeUserFromCampaign
);

export default router;
