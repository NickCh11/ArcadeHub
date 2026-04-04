import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Validate a Supabase JWT and return the authenticated user
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
