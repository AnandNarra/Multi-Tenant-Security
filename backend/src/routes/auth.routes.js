import { Router } from 'express';
import { registerOrganization, loginUser, logoutUser } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', registerOrganization);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

export default router;
