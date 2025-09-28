// Magic link authentication routes
// POST /auth/magic/init - Request magic link via email
// POST /auth/magic/consume - Consume magic token and complete authentication

import express from 'express';
import { z } from 'zod';
import { 
  issueMagicToken, 
  consumeMagicToken, 
  canIssueMagicToken,
  generateMagicLinkUrl 
} from '../services/auth';
import { sendMagicLink } from '../services/email';
import { storage } from '../storage';
import { config } from '../env';
import { ZodError } from 'zod';

const router = express.Router();

// Rate limiting storage (in-memory for development, should use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Validation schemas
const magicInitSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase()
});

const magicConsumeSchema = z.object({
  token: z.string().min(1, "Token is required")
});

/**
 * Simple rate limiting middleware
 * Limits magic link requests to 3 per 15 minutes per email
 */
function rateLimitMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const email = req.body.email;
  if (!email) return next();

  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 3;

  const key = `magic_link:${email.toLowerCase()}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (record.count >= maxAttempts) {
    const remainingMs = record.resetTime - now;
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    
    return res.status(429).json({
      error: 'Too many magic link requests',
      message: `Please wait ${remainingMinutes} minutes before requesting another magic link`,
      retryAfter: remainingMs
    });
  }

  // Increment counter
  record.count += 1;
  return next();
}

/**
 * POST /auth/magic/init
 * Request a magic link to be sent to the provided email
 */
router.post('/init', rateLimitMiddleware, async (req, res) => {
  try {
    console.log('🔐 Magic link init request:', req.body);

    // Validate request body
    const { email } = magicInitSchema.parse(req.body);
    
    // Check if user can receive another magic link (prevents spam)
    const { canIssue, reason } = await canIssueMagicToken(email);
    if (!canIssue) {
      return res.status(429).json({
        error: 'Magic link already active',
        message: reason
      });
    }

    // Check if user exists, create pending user if not
    let user = await storage.getUserByEmail(email);
    let userId = user?.id;

    if (!user) {
      console.log(`👤 Creating pending user for: ${email}`);
      // Create pending user record
      user = await storage.upsertUser({
        email,
        firstName: null,
        lastName: null,
        profileImageUrl: null
      });
      userId = user.id;
    }

    // Generate magic token
    const { token, expiresAt } = await issueMagicToken(email, userId, 'init');
    
    // Generate magic link URL
    const magicLinkUrl = generateMagicLinkUrl(token);
    
    // Send magic link email
    const emailSent = await sendMagicLink(email, magicLinkUrl, 30);
    
    if (!emailSent) {
      return res.status(500).json({
        error: 'Email delivery failed',
        message: 'Unable to send magic link email. Please try again.'
      });
    }

    console.log(`✅ Magic link sent to: ${email}`);
    
    res.status(200).json({
      success: true,
      message: 'Magic link sent to your email',
      expiresAt: expiresAt.toISOString(),
      expiresInMinutes: 30
    });

  } catch (error) {
    console.error('❌ Magic link init error:', error);
    
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors[0]?.message || 'Invalid request data'
      });
    }

    res.status(500).json({
      error: 'Magic link generation failed',
      message: 'Unable to generate magic link. Please try again.'
    });
  }
});

/**
 * GET /auth/magic/consume
 * Consume a magic token and complete authentication
 * Accepts token as query parameter for magic link clicks
 */
router.get('/consume', async (req, res) => {
  try {
    console.log('🔓 Magic token consume request via GET:', req.query);

    // Validate query parameter (not body since this is a GET request)
    const { token } = magicConsumeSchema.parse({ token: req.query.token });
    
    // Validate and consume the magic token
    const result = await consumeMagicToken(token);
    
    if (!result.success) {
      return res.status(401).json({
        error: 'Invalid magic token',
        message: result.error || 'Token is invalid, expired, or already used'
      });
    }

    const { email, userId, source } = result;
    
    if (!email || !userId) {
      return res.status(400).json({
        error: 'Invalid token data',
        message: 'Token missing required user information'
      });
    }

    // Get or ensure user exists
    let user = await storage.getUser(userId);
    
    if (!user) {
      console.log(`👤 User not found, creating for: ${email}`);
      user = await storage.upsertUser({
        id: userId,
        email,
        firstName: null,
        lastName: null,
        profileImageUrl: null
      });
    }

    // Mark user as active (no longer pending)
    await storage.upsertUser({
      id: user.id,
      email: user.email!,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      updatedAt: new Date()
    });

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

    console.log(`✅ User authenticated via magic link: ${email} (source: ${source})`);
    
    // Create compatible user object for existing auth middleware
    const authUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      // Add fields expected by isAuthenticated middleware
      expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now (matching session TTL)
      access_token: null, // Magic link auth doesn't use OAuth tokens
      refresh_token: null,
      claims: {
        sub: user.id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
        iat: Math.floor(Date.now() / 1000),
        iss: 'magic-link-auth'
      }
    };
    
    // Use Passport's login method to properly authenticate and serialize user
    await new Promise<void>((resolve, reject) => {
      (req as any).login(authUser, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log(`🍪 User authenticated via Passport login: ${email}`);
    
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl
      },
      credits: userCredits,
      source,
      message: 'Authentication successful'
    });

  } catch (error) {
    console.error('❌ Magic token consume error:', error);
    
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors[0]?.message || 'Invalid request data'
      });
    }

    res.status(500).json({
      error: 'Authentication failed',
      message: 'Unable to complete authentication. Please try again.'
    });
  }
});

/**
 * GET /auth/magic/status
 * Check magic link feature status (development helper)
 */
router.get('/status', (req, res) => {
  res.json({
    enabled: config.FEATURE_MAGIC_LINK,
    environment: config.NODE_ENV,
    emailConfigured: !!config.EMAIL_SENDER_KEY,
    appBaseUrl: config.APP_BASE_URL
  });
});

export default router;