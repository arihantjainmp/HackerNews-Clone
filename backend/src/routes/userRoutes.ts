import { Router } from 'express';
import { getUserProfile } from '../controllers/userController';

const router = Router();

/**
 * GET /api/users/:username
 * Get user profile with recent activities
 */
router.get('/:username', getUserProfile);

export default router;
