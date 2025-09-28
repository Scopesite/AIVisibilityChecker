// Magic link authentication service
// Handles token generation, validation, and single-use consumption

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { magicTokens, users, type MagicToken, type InsertMagicToken } from '@shared/schema';
import { eq, and, lt, isNull, gt } from 'drizzle-orm';
import { config } from '../env';

interface MagicTokenData {
  email: string;
  userId?: string;
  source: 'stripe' | 'manual' | 'init';
}

interface TokenValidationResult {
  success: boolean;
  email?: string;
  userId?: string;
  source?: string;
  error?: string;
}

/**
 * Generate a secure magic link token with 30-minute expiration
 * Returns both the token and expiration timestamp
 */
export async function issueMagicToken(email: string, userId?: string, source: 'stripe' | 'manual' | 'init' = 'manual'): Promise<{ token: string; expiresAt: Date }> {
  try {
    // Clean up expired tokens first
    await cleanupExpiredTokens();

    // Generate secure token using JWT
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    const tokenData: MagicTokenData = {
      email: email.toLowerCase(),
      userId,
      source
    };

    // Create JWT token with expiration
    const token = jwt.sign(tokenData, config.SESSION_SECRET, {
      expiresIn: '30m',
      issuer: 'voice-ai-scanner',
      subject: email.toLowerCase()
    });

    // Store token in database
    const tokenRecord: InsertMagicToken = {
      token,
      user_id: userId || null,
      email: email.toLowerCase(),
      expires_at: expiresAt,
      consumed_at: null
    };

    await db.insert(magicTokens).values(tokenRecord);

    console.log(`✅ Magic token issued for: ${email} (source: ${source}, expires: ${expiresAt.toISOString()})`);
    
    return { token, expiresAt };

  } catch (error) {
    console.error('❌ Error issuing magic token:', error);
    throw new Error('Failed to issue magic token');
  }
}

/**
 * Validate and consume a magic token (single-use)
 * Returns user information if valid, error if invalid/expired/consumed
 */
export async function consumeMagicToken(token: string): Promise<TokenValidationResult> {
  try {
    console.log(`🔍 Validating magic token: ${token.substring(0, 20)}...`);

    // First verify JWT signature and expiration
    let tokenData: MagicTokenData;
    try {
      tokenData = jwt.verify(token, config.SESSION_SECRET, {
        issuer: 'voice-ai-scanner'
      }) as MagicTokenData;
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError);
      return { success: false, error: 'Invalid or expired token' };
    }

    // Look up token in database
    const [tokenRecord] = await db
      .select()
      .from(magicTokens)
      .where(eq(magicTokens.token, token));

    if (!tokenRecord) {
      console.log('❌ Token not found in database');
      return { success: false, error: 'Token not found' };
    }

    // Check if token has already been consumed
    if (tokenRecord.consumed_at) {
      console.log('❌ Token already consumed at:', tokenRecord.consumed_at);
      return { success: false, error: 'Token has already been used' };
    }

    // Check expiration (double-check against database)
    if (new Date() > tokenRecord.expires_at) {
      console.log('❌ Token expired at:', tokenRecord.expires_at);
      return { success: false, error: 'Token has expired' };
    }

    // Mark token as consumed (single-use)
    await db
      .update(magicTokens)
      .set({ consumed_at: new Date() })
      .where(eq(magicTokens.token, token));

    console.log(`✅ Magic token consumed successfully for: ${tokenData.email}`);

    return {
      success: true,
      email: tokenData.email,
      userId: tokenData.userId,
      source: tokenData.source
    };

  } catch (error) {
    console.error('❌ Error consuming magic token:', error);
    return { success: false, error: 'Token validation failed' };
  }
}

/**
 * Clean up expired tokens from the database
 * Should be called periodically or before issuing new tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const now = new Date();
    
    // Delete expired tokens
    const result = await db
      .delete(magicTokens)
      .where(lt(magicTokens.expires_at, now));

    // Note: result in Drizzle might not have rowCount, so we'll handle gracefully
    console.log(`🧹 Cleaned up expired magic tokens (cutoff: ${now.toISOString()})`);
    
    return 0; // Return 0 since we can't get exact count easily
  } catch (error) {
    console.error('❌ Error cleaning up expired tokens:', error);
    return 0;
  }
}

/**
 * Revoke all magic tokens for a specific email
 * Useful for security purposes
 */
export async function revokeMagicTokensForEmail(email: string): Promise<boolean> {
  try {
    // Mark all tokens for this email as consumed
    await db
      .update(magicTokens)
      .set({ consumed_at: new Date() })
      .where(and(
        eq(magicTokens.email, email.toLowerCase()),
        isNull(magicTokens.consumed_at)
      ));

    console.log(`🚫 Revoked all magic tokens for: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error revoking magic tokens:', error);
    return false;
  }
}

/**
 * Get active (unconsumed, unexpired) tokens for an email
 * Useful for debugging or rate limiting
 */
export async function getActiveMagicTokensForEmail(email: string): Promise<MagicToken[]> {
  try {
    const now = new Date();
    
    const activeTokens = await db
      .select()
      .from(magicTokens)
      .where(and(
        eq(magicTokens.email, email.toLowerCase()),
        isNull(magicTokens.consumed_at),
        gt(magicTokens.expires_at, now)
      ));

    return activeTokens;
  } catch (error) {
    console.error('❌ Error fetching active magic tokens:', error);
    return [];
  }
}

/**
 * Rate limiting helper: check if email can receive new magic link
 * Prevents spam by limiting to 1 active token per email
 */
export async function canIssueMagicToken(email: string): Promise<{ canIssue: boolean; reason?: string }> {
  try {
    const activeTokens = await getActiveMagicTokensForEmail(email);
    
    if (activeTokens.length > 0) {
      const nextExpiry = Math.min(...activeTokens.map(t => t.expires_at.getTime()));
      const minutesUntilExpiry = Math.ceil((nextExpiry - Date.now()) / (1000 * 60));
      
      return {
        canIssue: false,
        reason: `Magic link already sent. Please wait ${minutesUntilExpiry} minutes or check your email.`
      };
    }

    return { canIssue: true };
  } catch (error) {
    console.error('❌ Error checking magic token rate limit:', error);
    return { canIssue: true }; // Allow on error to avoid blocking users
  }
}

/**
 * Generate a magic link URL for the given token
 */
export function generateMagicLinkUrl(token: string): string {
  const baseUrl = config.APP_BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/api/auth/magic/consume?token=${encodeURIComponent(token)}`;
}

/**
 * Development helper: generate a test token (non-production only)
 */
export async function generateTestToken(email: string): Promise<string> {
  if (config.NODE_ENV === 'production') {
    throw new Error('Test tokens not available in production');
  }

  const { token } = await issueMagicToken(email, undefined, 'manual');
  console.log(`🧪 Test magic token generated for: ${email}`);
  console.log(`🔗 Test magic link: ${generateMagicLinkUrl(token)}`);
  
  return token;
}