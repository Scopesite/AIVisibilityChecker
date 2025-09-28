import express from 'express';
import { storage } from '../storage.js';
import { grantCredits } from '../credits.js';

const router = express.Router();

/**
 * Admin endpoint to set up pro account in production
 * GET /api/admin/setup-pro-account?email=dan@scopesite.co.uk&key=ADMIN_KEY
 */
router.get('/setup-pro-account', async (req, res) => {
  try {
    const { email, key } = req.query;
    
    // Security check - require admin key
    const adminKey = process.env.ADMIN_SEED_KEY;
    if (!adminKey || key !== adminKey) {
      return res.status(403).json({ error: 'Unauthorized - invalid admin key' });
    }
    
    if (!email || email !== 'dan@scopesite.co.uk') {
      return res.status(400).json({ error: 'Invalid email - this endpoint is for dan@scopesite.co.uk only' });
    }
    
    const targetEmail = email as string;
    console.log('🚀 Admin: Setting up pro account for:', targetEmail);
    
    // Check if user exists
    let user = await storage.getUserByEmail(targetEmail);
    
    if (!user) {
      console.log('👤 Admin: Creating new user account...');
      user = await storage.upsertUser({
        email: targetEmail.toLowerCase(),
        firstName: 'Dan',
        lastName: 'Cartwright',
        profileImageUrl: null
      });
      console.log('✅ Admin: User created with ID:', user.id);
    } else {
      console.log('👤 Admin: User already exists with ID:', user.id);
    }
    
    // Ensure user has credit record
    let userCredits = await storage.getUserCredits(user.id);
    if (!userCredits) {
      console.log('💳 Admin: Creating credit record...');
      userCredits = await storage.createUserCredits({
        user_id: user.id,
        email: user.email!,
        free_checks_used: 0,
        paid_checks_remaining: 0,
        total_checks_performed: 0,
        subscription_status: 'none',
        monthly_checks_used: 0,
        starter_pack_purchased: false,
        total_lifetime_checks: 0,
        stripe_customer_id: null
      });
      console.log('✅ Admin: Credit record created');
    } else {
      console.log('💳 Admin: Credit record already exists');
    }
    
    // Check existing balance to avoid duplicate grants
    const existingCredits = await storage.getUserCredits(user.id);
    const currentBalance = existingCredits?.paid_checks_remaining || 0;
    
    let creditMessage = '';
    if (currentBalance >= 200) {
      creditMessage = `User already has sufficient credits: ${currentBalance}`;
      console.log('✅ Admin:', creditMessage);
    } else {
      // Grant 200 pro credits for testing and video creation
      console.log('🎯 Admin: Granting 200 pro credits for testing and video creation...');
      const creditResult = await grantCredits(
        user.id,
        200, // 200 credits for extensive testing
        'admin:production_pro_setup',
        {
          // Set expiry to 90 days for extensive testing and video creation
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          extRef: 'admin_prod_pro_setup_dan_scopesite_v1' // Deterministic for idempotency
        }
      );
      
      if (creditResult.success) {
        creditMessage = `Credits granted! New balance: ${creditResult.newBalance}`;
        console.log('✅ Admin:', creditMessage);
      } else {
        creditMessage = `Failed to grant credits: ${creditResult.error}`;
        console.error('❌ Admin:', creditMessage);
        if (creditResult.idempotent) {
          creditMessage += ' (already granted - idempotent operation)';
          console.log('ℹ️ Admin: Credits were already granted (idempotent operation)');
        }
      }
    }
    
    // Check existing subscription status
    const currentCreditsCheck = await storage.getUserCredits(user.id);
    const targetEndDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    
    let subscriptionMessage = '';
    if (currentCreditsCheck?.subscription_status === 'pro' && 
        currentCreditsCheck?.subscription_end_date && 
        new Date(currentCreditsCheck.subscription_end_date) > new Date(Date.now() + 80 * 24 * 60 * 60 * 1000)) {
      subscriptionMessage = `User already has pro subscription until: ${
        typeof currentCreditsCheck.subscription_end_date === 'string' 
          ? currentCreditsCheck.subscription_end_date 
          : currentCreditsCheck.subscription_end_date.toISOString()
      }`;
      console.log('✅ Admin:', subscriptionMessage);
    } else {
      // Update subscription status to pro
      console.log('👑 Admin: Setting pro subscription status...');
      await storage.updateUserSubscription(
        user.id,
        'pro',
        targetEndDate, // 90 days from now
        'admin_prod_pro_setup_dan_scopesite_v1' // Deterministic for idempotency
      );
      subscriptionMessage = 'Pro subscription status set for 90 days';
      console.log('✅ Admin:', subscriptionMessage);
    }
    
    // Final verification
    const finalCredits = await storage.getUserCredits(user.id);
    
    const result = {
      success: true,
      message: 'Pro account setup completed successfully',
      details: {
        email: targetEmail,
        userId: user.id,
        subscription: finalCredits?.subscription_status,
        subscriptionEnd: finalCredits?.subscription_end_date 
          ? (typeof finalCredits.subscription_end_date === 'string' 
             ? finalCredits.subscription_end_date 
             : finalCredits.subscription_end_date.toISOString())
          : 'Not set',
        creditAction: creditMessage,
        subscriptionAction: subscriptionMessage
      }
    };
    
    console.log('🎉 Admin: Pro account setup complete!', result.details);
    
    return res.json(result);
    
  } catch (error) {
    console.error('❌ Admin: Error setting up pro account:', error);
    return res.status(500).json({ 
      error: 'Failed to setup pro account', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;