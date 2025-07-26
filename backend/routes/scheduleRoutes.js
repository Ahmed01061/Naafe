import express from 'express';
import { getProviderSchedule } from '../controllers/scheduleController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /api/schedule/:providerId
router.get('/:providerId', authenticateToken, getProviderSchedule);

export default router; 