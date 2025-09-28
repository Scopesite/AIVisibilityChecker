import express from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { redeemPromoCode } from '../credits.js';

const router = express.Router();

// Rate limiting for promo code redemption (prevents brute force)
const promoCodeRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each user to 10 redemption attempts per windowMs
  message: { 
    error: 'Too many promo code attempts. Please try again later.' 
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Schema for promo code redemption
const redeemPromoCodeSchema = z.object({
  code: z.string().min(1, "Promo code is required").max(20, "Promo code too long")
});

/**
 * POST /api/promocodes/redeem - Redeem a promotional code
 */
router.post('/redeem', async (req, res) => {
  console.log("🚀 PROMO ROUTE HIT - Request received");
  
  try {
    // Check if user is authenticated
    if (!req.user || !req.isAuthenticated()) {
      console.log("❌ PROMO AUTH FAILED");
      return res.status(401).json({ error: 'Authentication required to redeem promo codes' });
    }

    const user = req.user as any;
    console.log(`🎁 User ${user.email} attempting to redeem promo code`);
    
    const { code } = redeemPromoCodeSchema.parse(req.body);
    console.log(`🔍 Parsed code: ${code}`);

    const result = await redeemPromoCode(user.id, code);

    if (!result.success) {
      console.log(`❌ Promo code redemption failed for ${user.email}: ${result.error}`);
      return res.status(400).json({ 
        error: result.error,
        newBalance: result.newBalance 
      });
    }

    console.log(`✅ Promo code ${code} successfully redeemed by ${user.email}`);

    return res.json({
      success: true,
      message: `Promo code redeemed successfully!`,
      creditsGranted: result.creditsGranted,
      subscriptionGranted: result.subscriptionGranted,
      subscriptionDays: result.subscriptionDays,
      newBalance: result.newBalance
    });

  } catch (error) {
    console.error('Promo code redemption error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.errors[0].message 
      });
    }

    return res.status(500).json({ 
      error: 'Failed to redeem promo code' 
    });
  }
});

export default router;