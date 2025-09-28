import express from 'express';
import type { AuthenticatedUser } from '../types/auth.js';
import { getBalance, SCAN_COST } from '../credits.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

const router = express.Router();

// GET /api/credits/balance
router.get('/balance', async (req, res) => {
  try {
    // Check authentication
    const userId = req.user?.claims?.sub || req.user?.id;
    if (!req.isAuthenticated() || !userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const balance = await getBalance(userId);

    return res.json({
      balance,
      perScan: SCAN_COST
    });

  } catch (error) {
    console.error('Credits balance route error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

export default router;
