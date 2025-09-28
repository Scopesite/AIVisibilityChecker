#!/usr/bin/env tsx
/**
 * Production Pro Account Setup Script
 * 
 * This script safely sets up a pro account in the production environment.
 * Run this script in the production environment to grant pro status and credits.
 */

import { storage } from '../server/storage';
import { grantCredits } from '../server/credits';

async function setupProductionProAccount() {
  const email = 'dan@scopesite.co.uk';
  const firstName = 'Dan';
  const lastName = 'Cartwright';
  
  console.log('🚀 Setting up production pro account for:', email);
  console.log('📍 Environment:', process.env.NODE_ENV || 'development');
  
  try {
    // Check if user already exists
    let user = await storage.getUserByEmail(email);
    
    if (!user) {
      console.log('👤 Creating new user account...');
      user = await storage.upsertUser({
        email: email.toLowerCase(),
        firstName,
        lastName,
        profileImageUrl: null
      });
      console.log('✅ User created with ID:', user.id);
    } else {
      console.log('👤 User already exists with ID:', user.id);
    }
    
    // Ensure user has credit record
    let userCredits = await storage.getUserCredits(user.id);
    if (!userCredits) {
      console.log('💳 Creating credit record...');
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
      console.log('✅ Credit record created');
    } else {
      console.log('💳 Credit record already exists');
    }
    
    // Check existing balance to avoid duplicate grants
    const existingCredits = await storage.getUserCredits(user.id);
    const currentBalance = existingCredits?.paid_checks_remaining || 0;
    
    if (currentBalance >= 200) {
      console.log('✅ User already has sufficient credits:', currentBalance);
    } else {
      // Grant 200 pro credits for testing and video creation
      console.log('🎯 Granting 200 pro credits for testing and video creation...');
      const creditResult = await grantCredits(
        user.id,
        200, // 200 credits for extensive testing
        'manual:production_pro_setup',
        {
          // Set expiry to 90 days for extensive testing and video creation
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          extRef: 'prod_pro_setup_dan_scopesite_v1' // Deterministic for idempotency
        }
      );
      
      if (creditResult.success) {
        console.log('✅ Credits granted! New balance:', creditResult.newBalance);
      } else {
        console.error('❌ Failed to grant credits:', creditResult.error);
        if (creditResult.idempotent) {
          console.log('ℹ️ Credits were already granted (idempotent operation)');
        }
      }
    }
    
    
    // Check existing subscription status
    const currentCredits = await storage.getUserCredits(user.id);
    const targetEndDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    
    if (currentCredits?.subscription_status === 'pro' && 
        currentCredits?.subscription_end_date && 
        new Date(currentCredits.subscription_end_date) > new Date(Date.now() + 80 * 24 * 60 * 60 * 1000)) {
      console.log('✅ User already has pro subscription until:', 
        typeof currentCredits.subscription_end_date === 'string' 
          ? currentCredits.subscription_end_date 
          : currentCredits.subscription_end_date.toISOString());
    } else {
      // Update subscription status to pro
      console.log('👑 Setting pro subscription status...');
      await storage.updateUserSubscription(
        user.id,
        'pro',
        targetEndDate, // 90 days from now
        'prod_pro_setup_dan_scopesite_v1' // Deterministic for idempotency
      );
      console.log('✅ Pro subscription status set');
    }
    
    // Final verification by checking actual balance
    console.log('🔍 Verifying final setup...');
    const finalCredits = await storage.getUserCredits(user.id);
    
    console.log('\n🎉 Production pro account setup complete!');
    console.log('📊 Final account status:');
    console.log('   Email:', email);
    console.log('   User ID:', user.id);
    console.log('   Subscription:', finalCredits?.subscription_status);
    console.log('   Subscription End:', 
      finalCredits?.subscription_end_date 
        ? (typeof finalCredits.subscription_end_date === 'string' 
           ? finalCredits.subscription_end_date 
           : finalCredits.subscription_end_date.toISOString())
        : 'Not set');
    console.log('   Setup complete - please refresh your browser to see updated credits');
    
  } catch (error) {
    console.error('❌ Error setting up production pro account:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    process.exit(1);
  }
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupProductionProAccount()
    .then(() => {
      console.log('✅ Production pro account setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

export { setupProductionProAccount };