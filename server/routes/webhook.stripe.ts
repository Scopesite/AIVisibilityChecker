// Stripe webhook handler for magic link authentication
// Handles checkout.session.completed events to trigger magic link emails

import express from 'express';
import Stripe from 'stripe';
import { config } from '../env';
import { storage } from '../storage';
import { issueMagicToken, generateMagicLinkUrl } from '../services/auth';
import { sendMagicLink, sendRegistrationNotification } from '../services/email';

const router = express.Router();

// Initialize Stripe with the same configuration as main app
const stripeSecretKey = process.env.NODE_ENV === 'development' 
  ? process.env.TESTING_STRIPE_SECRET_KEY 
  : process.env.STRIPE_SECRET_KEY;

// Fail fast if no Stripe key is configured
if (!stripeSecretKey) {
  const expectedVar = process.env.NODE_ENV === 'development' ? 'TESTING_STRIPE_SECRET_KEY' : 'STRIPE_SECRET_KEY';
  throw new Error(`Missing required environment variable: ${expectedVar}`);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-08-27.basil', // Match existing API version
});

/**
 * POST /webhooks/stripe
 * Handle Stripe webhook events for magic link authentication
 * Primary focus: checkout.session.completed → magic link flow
 */
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    // Verify webhook signature for security
    if (config.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(
        req.body, 
        sig as string, 
        config.STRIPE_WEBHOOK_SECRET
      );
    } else {
      // For development, accept webhooks without signature verification
      event = JSON.parse(req.body.toString());
      console.log("⚠️ WARNING: Magic link webhook signature verification disabled (development mode)");
    }
  } catch (err: any) {
    console.error("❌ Magic link webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`🪝 Magic link webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('💳 Processing checkout session for magic link:', session.id);
        
        // Extract customer email from session
        const customerEmail = session.customer_details?.email || session.customer_email;
        
        if (!customerEmail) {
          console.error('❌ No customer email found in checkout session:', session.id);
          return res.status(400).json({ 
            error: 'Missing customer email',
            sessionId: session.id
          });
        }

        console.log(`👤 Processing magic link for customer: ${customerEmail}`);

        // Upsert user with pending status
        let user = await storage.getUserByEmail(customerEmail);
        
        if (!user) {
          console.log(`👤 Creating new user for: ${customerEmail}`);
          user = await storage.upsertUser({
            email: customerEmail.toLowerCase(),
            firstName: session.customer_details?.name?.split(' ')[0] || null,
            lastName: session.customer_details?.name?.split(' ').slice(1).join(' ') || null,
            profileImageUrl: null
          });
        } else {
          console.log(`👤 Updating existing user: ${customerEmail}`);
          user = await storage.upsertUser({
            id: user.id,
            email: user.email!,
            firstName: user.firstName || session.customer_details?.name?.split(' ')[0] || null,
            lastName: user.lastName || session.customer_details?.name?.split(' ').slice(1).join(' ') || null,
            profileImageUrl: user.profileImageUrl,
            updatedAt: new Date()
          });
        }

        // Ensure user has credit record (for subscription management)
        let userCredits = await storage.getUserCredits(user.id);
        if (!userCredits) {
          console.log(`💳 Creating credit record for: ${customerEmail}`);
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
            stripe_customer_id: session.customer as string || null
          });
        }

        // Issue magic token for 30 minutes
        console.log(`🎫 Issuing magic token for: ${customerEmail}`);
        const { token, expiresAt } = await issueMagicToken(
          customerEmail, 
          user.id, 
          'stripe'
        );

        // Generate magic link URL
        const magicLinkUrl = generateMagicLinkUrl(token);

        // Send magic link email
        console.log(`📧 Sending magic link email to: ${customerEmail}`);
        const emailSent = await sendMagicLink(customerEmail, magicLinkUrl, 30);

        if (!emailSent) {
          console.error('❌ Failed to send magic link email to:', customerEmail);
          // Don't fail the webhook - log and continue
        }

        // Send registration notification (optional)
        await sendRegistrationNotification(customerEmail, 'stripe');

        console.log(`✅ Magic link flow completed for: ${customerEmail}`);
        
        // Respond quickly to Stripe (within 10 seconds)
        res.status(200).json({ 
          received: true, 
          processed: true,
          email: customerEmail,
          sessionId: session.id
        });
        
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`💼 Subscription ${event.type}: ${subscription.id}`);
        
        // Handle subscription events if needed for magic link users
        // This could trigger additional magic links for subscription changes
        
        res.status(200).json({ received: true });
        break;
      }

      default: {
        console.log(`ℹ️ Unhandled magic link webhook event: ${event.type}`);
        res.status(200).json({ received: true, handled: false });
      }
    }

  } catch (error) {
    console.error('❌ Magic link webhook processing error:', error);
    
    // Log detailed error information for debugging
    console.error('Event type:', event.type);
    console.error('Event ID:', event.id);
    
    // Return 500 to tell Stripe to retry
    res.status(500).json({
      error: 'Webhook processing failed',
      eventType: event.type,
      eventId: event.id
    });
  }
});

/**
 * GET /webhooks/stripe/status
 * Health check and configuration status for magic link webhooks
 */
router.get('/status', (req, res) => {
  res.json({
    service: 'Magic Link Stripe Webhooks',
    enabled: config.FEATURE_MAGIC_LINK,
    environment: config.NODE_ENV,
    stripeConfigured: !!stripeSecretKey,
    webhookSecretConfigured: !!config.STRIPE_WEBHOOK_SECRET,
    emailConfigured: !!config.EMAIL_SENDER_KEY,
    appBaseUrl: config.APP_BASE_URL
  });
});

export default router;