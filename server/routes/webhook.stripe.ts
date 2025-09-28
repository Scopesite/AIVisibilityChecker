// Stripe webhook handler for one-time credit purchases
// Handles checkout.session.completed and payment_intent.succeeded events

import express from 'express';
import Stripe from 'stripe';
import { config } from '../env';
import { storage } from '../storage';

const router = express.Router();

// Initialize Stripe
const stripeSecretKey = process.env.NODE_ENV === 'development' 
  ? process.env.TESTING_STRIPE_SECRET_KEY 
  : process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  const expectedVar = process.env.NODE_ENV === 'development' ? 'TESTING_STRIPE_SECRET_KEY' : 'STRIPE_SECRET_KEY';
  throw new Error(`Missing required environment variable: ${expectedVar}`);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-08-27.basil',
});

// Credit amounts for each product
const CREDIT_AMOUNTS = {
  [process.env.STRIPE_PRICE_STARTER || '']: 50,  // Starter pack: 50 credits
  [process.env.STRIPE_PRICE_PRO || '']: 250,    // Pro pack: 250 credits
};

/**
 * POST /webhooks/stripe
 * Handle Stripe webhook events for credit purchases
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
      console.log("⚠️ WARNING: Webhook signature verification disabled (development mode)");
    }
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`🪝 Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('💳 Processing checkout session:', session.id);
        
        // Extract customer email from session
        const customerEmail = session.customer_details?.email || session.customer_email;
        
        if (!customerEmail) {
          console.error('❌ No customer email found in checkout session:', session.id);
          return res.status(400).json({ 
            error: 'Missing customer email',
            sessionId: session.id
          });
        }

        // Get line items to determine what was purchased
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        
        if (!lineItems.data || lineItems.data.length === 0) {
          console.error('❌ No line items found for session:', session.id);
          return res.status(400).json({ 
            error: 'No line items found',
            sessionId: session.id
          });
        }

        // Process each line item (in case multiple items were purchased)
        for (const item of lineItems.data) {
          const priceId = item.price?.id;
          const quantity = item.quantity || 1;
          
          if (!priceId || !CREDIT_AMOUNTS[priceId]) {
            console.log(`⚠️ Unknown price ID: ${priceId}, skipping`);
            continue;
          }

          const creditsPerItem = CREDIT_AMOUNTS[priceId];
          const totalCredits = creditsPerItem * quantity;

          console.log(`💰 Processing ${quantity}x ${priceId} = ${totalCredits} credits for ${customerEmail}`);

          // Grant credits idempotently using session ID as transaction reference
          await grantCreditsIdempotent(
            customerEmail,
            totalCredits,
            session.id,
            `${priceId}_${quantity}`,
            session.customer_details?.name || null
          );
        }

        console.log(`✅ Credit purchase completed for: ${customerEmail}`);
        
        res.status(200).json({ 
          received: true, 
          processed: true,
          email: customerEmail,
          sessionId: session.id
        });
        
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        console.log('💳 Payment succeeded:', paymentIntent.id);
        
        // Additional verification that payment was successful
        // This is a backup in case checkout.session.completed fails
        
        res.status(200).json({ received: true });
        break;
      }

      default: {
        console.log(`ℹ️ Unhandled webhook event: ${event.type}`);
        res.status(200).json({ received: true, handled: false });
      }
    }

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
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
 * Grant credits to a user idempotently
 * Uses billing transaction records to prevent double-granting
 */
async function grantCreditsIdempotent(
  email: string,
  credits: number,
  transactionId: string,
  description: string,
  customerName: string | null = null
): Promise<void> {
  try {
    // Check if we've already processed this transaction
    const existingTransaction = await storage.getBillingTransactionByStripeId(transactionId);
    
    if (existingTransaction) {
      console.log(`✅ Transaction already processed: ${transactionId}`);
      return;
    }

    // Upsert user
    let user = await storage.getUserByEmail(email);
    
    if (!user) {
      console.log(`👤 Creating new user for: ${email}`);
      const nameParts = customerName?.split(' ') || [];
      user = await storage.upsertUser({
        email: email.toLowerCase(),
        firstName: nameParts[0] || null,
        lastName: nameParts.slice(1).join(' ') || null,
        profileImageUrl: null
      });
    }

    // Ensure user has credit record
    let userCredits = await storage.getUserCredits(user.id);
    if (!userCredits) {
      console.log(`💳 Creating credit record for: ${email}`);
      userCredits = await storage.createUserCredits({
        user_id: user.id,
        email: user.email!,
        free_checks_used: 0,
        paid_checks_remaining: 0,
        total_checks_performed: 0,
        subscription_status: 'none',
        monthly_checks_used: 0,
        starter_pack_purchased: false,
        total_lifetime_checks: 0
      });
    }

    // Add credits to user account
    const newPaidCredits = userCredits.paid_checks_remaining + credits;
    
    await storage.updateUserCredits(user.id, {
      paid_checks_remaining: newPaidCredits,
      starter_pack_purchased: credits === 50 ? true : userCredits.starter_pack_purchased,
      updated_at: new Date()
    });

    // Record the transaction to prevent double-processing
    await storage.createBillingTransaction({
      user_id: user.id,
      email: email,
      stripe_payment_intent_id: transactionId,
      amount_cents: credits === 50 ? 2900 : 9900, // £29 or £99
      currency: 'gbp',
      status: 'completed',
      credits_granted: credits,
      transaction_type: 'credit_purchase',
      description: `Credit purchase: ${description}`,
      metadata: JSON.stringify({ credits, description })
    });

    // Add credit ledger entry
    await storage.addCreditLedgerEntry({
      user_id: user.id,
      email: email,
      operation_type: credits === 50 ? 'add_starter_credits' : 'add_pro_credits',
      credits_before: userCredits.paid_checks_remaining,
      credits_after: newPaidCredits,
      credits_delta: credits,
      description: `Purchased ${credits} credits via Stripe`,
      metadata: JSON.stringify({ 
        stripe_session_id: transactionId,
        price_id: description.split('_')[0],
        quantity: parseInt(description.split('_')[1]) || 1
      })
    });

    console.log(`✅ Granted ${credits} credits to ${email} (total: ${newPaidCredits})`);
    
  } catch (error) {
    console.error('❌ Error granting credits:', error);
    throw error;
  }
}

/**
 * GET /webhooks/stripe/status
 * Health check and configuration status
 */
router.get('/status', (req, res) => {
  res.json({
    service: 'Credit Purchase Webhooks',
    environment: config.NODE_ENV,
    stripeConfigured: !!stripeSecretKey,
    webhookSecretConfigured: !!config.STRIPE_WEBHOOK_SECRET,
    priceIds: {
      starter: process.env.STRIPE_PRICE_STARTER,
      pro: process.env.STRIPE_PRICE_PRO
    },
    creditAmounts: CREDIT_AMOUNTS
  });
});

export default router;
