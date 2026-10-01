import { Router } from 'express';
import {
  getOrganizations,
  getOrganizationById,
  createOrganization,
} from '../controllers/organization.controller.js';

const router = Router();

router.get('/', getOrganizations);
router.get('/:id', getOrganizationById);
router.post('/', createOrganization);

export default router;
