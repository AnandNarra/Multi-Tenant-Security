import { Router } from 'express';
import authRoutes from './auth.routes.js';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication Routes
router.use('/auth', authRoutes);

export default router;
