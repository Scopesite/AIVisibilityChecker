/**
 * VOICE Scanner Credit Management System
 * Ledger-based accounting with atomic operations and idempotency
 */

import { db } from "./db.js";
import { creditLedger, users, promoCodes, promoRedemptions, type CreditLedger, type InsertCreditLedger } from "@shared/schema";
import { eq, and, or, sql, isNull, gt, desc } from "drizzle-orm";
import { storage } from "./storage.js";

export const SCAN_COST = 1;

/**
 * Get user's current credit balance (unexpired credits only)
 */
export async function getBalance(userId: string): Promise<number> {
  const now = new Date();
  
  const result = await db
    .select({
      balance: sql<number>`COALESCE(SUM(${creditLedger.delta}), 0)`.as('balance')
    })
    .from(creditLedger)
    .where(
      and(
        eq(creditLedger.userId, userId),
        or(
          isNull(creditLedger.expiresAt),
          gt(creditLedger.expiresAt, now)
        )
      )
    );

  return result[0]?.balance || 0;
}

/**
 * Get detailed balance breakdown for user
 */
export async function getBalanceDetails(userId: string): Promise<{
  totalBalance: number;
  unexpiredBalance: number;
  expiredCredits: number;
  pendingExpiry: CreditLedger[];
}> {
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Get all ledger entries for user
  const allEntries = await db
    .select()
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId))
    .orderBy(creditLedger.createdAt);

  // Calculate totals
  const totalBalance = allEntries.reduce((sum, entry) => sum + entry.delta, 0);
  
  const unexpiredEntries = allEntries.filter(entry => 
    !entry.expiresAt || entry.expiresAt > now
  );
  const unexpiredBalance = unexpiredEntries.reduce((sum, entry) => sum + entry.delta, 0);
  
  const expiredEntries = allEntries.filter(entry => 
    entry.expiresAt && entry.expiresAt <= now
  );
  const expiredCredits = expiredEntries.reduce((sum, entry) => sum + entry.delta, 0);

  // Credits expiring in next 30 days
  const pendingExpiry = allEntries.filter(entry =>
    entry.expiresAt && 
    entry.expiresAt > now && 
    entry.expiresAt <= nextMonth &&
    entry.delta > 0 // Only positive entries (purchases)
  );

  return {
    totalBalance,
    unexpiredBalance,
    expiredCredits,
    pendingExpiry
  };
}

/**
 * Grant credits to user (purchases, bonuses, refunds)
 */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: string,
  options?: {
    expiresAt?: Date;
    jobId?: string;
    extRef?: string; // For Stripe event ID
  }
): Promise<{ success: boolean; newBalance: number; error?: string; idempotent?: boolean }> {
  
  if (amount <= 0) {
    return { success: false, newBalance: 0, error: "Amount must be positive" };
  }

  try {
    return await db.transaction(async (tx) => {
      // Lock user row to prevent concurrent credit mutations (prevent double-spend)
      await tx
        .select({ dummy: sql`1`.as('dummy') })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');

      // Check for idempotency if jobId or extRef provided
      if (options?.jobId || options?.extRef) {
        const whereConditions = [eq(creditLedger.userId, userId)];
        
        // Build idempotency conditions based on what's provided
        if (options.jobId && options.extRef) {
          // Both provided - check either matches (OR condition)
          const orCondition = or(
            eq(creditLedger.jobId, options.jobId),
            eq(creditLedger.extRef, options.extRef)
          );
          if (orCondition) {
            whereConditions.push(orCondition);
          }
        } else if (options.jobId) {
          // Only jobId provided
          whereConditions.push(eq(creditLedger.jobId, options.jobId));
        } else if (options.extRef) {
          // Only extRef provided
          whereConditions.push(eq(creditLedger.extRef, options.extRef));
        }

        const existingEntry = await tx
          .select()
          .from(creditLedger)
          .where(and(...whereConditions));

        if (existingEntry.length > 0) {
          // Get current balance from within transaction using arithmetic
          const currentEntries = await tx
            .select()
            .from(creditLedger)
            .where(
              and(
                eq(creditLedger.userId, userId),
                or(
                  isNull(creditLedger.expiresAt),
                  gt(creditLedger.expiresAt, new Date())
                )
              )
            );
          const newBalance = currentEntries.reduce((sum, entry) => sum + entry.delta, 0);
          return { success: true, newBalance, idempotent: true };
        }
      }

      // Create ledger entry
      const entry: InsertCreditLedger = {
        userId,
        delta: amount,
        reason,
        jobId: options?.jobId || null,
        extRef: options?.extRef || null,
        expiresAt: options?.expiresAt || null,
      };

      await tx.insert(creditLedger).values(entry);

      // Get new balance from within transaction using arithmetic
      const allEntries = await tx
        .select()
        .from(creditLedger)
        .where(
          and(
            eq(creditLedger.userId, userId),
            or(
              isNull(creditLedger.expiresAt),
              gt(creditLedger.expiresAt, new Date())
            )
          )
        );
      const newBalance = allEntries.reduce((sum, entry) => sum + entry.delta, 0);
      return { success: true, newBalance };
    });
    
  } catch (error) {
    console.error("Error granting credits:", error);
    
    // Check for unique constraint violations (idempotency)
    if (error instanceof Error && (
      error.message.includes('unique') || 
      (error as any).code === '23505' // PostgreSQL unique violation
    )) {
      const newBalance = await getBalance(userId);
      return { success: true, newBalance, idempotent: true };
    }
    
    return { success: false, newBalance: 0, error: "Database error" };
  }
}

/**
 * Consume credits atomically with idempotency
 */
export async function consumeCredits(
  userId: string,
  jobId: string
): Promise<{ 
  success: boolean; 
  remainingBalance: number; 
  consumed: number;
  error?: string;
  idempotent?: boolean;
}> {
  
  const amount = SCAN_COST;

  if (!jobId) {
    return { success: false, remainingBalance: 0, consumed: 0, error: "Job ID required for idempotency" };
  }

  try {
    return await db.transaction(async (tx) => {
      // Lock user row to prevent concurrent credit mutations (prevent double-spend)
      await tx
        .select({ dummy: sql`1`.as('dummy') })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');

      // Check if already processed (idempotency)
      const existingEntry = await tx
        .select()
        .from(creditLedger)
        .where(
          and(
            eq(creditLedger.userId, userId),
            eq(creditLedger.jobId, jobId)
          )
        );

      if (existingEntry.length > 0) {
        // Already processed - get current balance from within transaction
        const currentEntries = await tx
          .select()
          .from(creditLedger)
          .where(
            and(
              eq(creditLedger.userId, userId),
              or(
                isNull(creditLedger.expiresAt),
                gt(creditLedger.expiresAt, new Date())
              )
            )
          );
        const remainingBalance = currentEntries.reduce((sum, entry) => sum + entry.delta, 0);
        return { 
          success: true, 
          remainingBalance, 
          consumed: -existingEntry[0].delta, // Delta is negative for consumption
          idempotent: true 
        };
      }

      // Check available balance within transaction
      const currentEntries = await tx
        .select()
        .from(creditLedger)
        .where(
          and(
            eq(creditLedger.userId, userId),
            or(
              isNull(creditLedger.expiresAt),
              gt(creditLedger.expiresAt, new Date())
            )
          )
        );
      const currentBalance = currentEntries.reduce((sum, entry) => sum + entry.delta, 0);
      
      if (currentBalance < amount) {
        return { 
          success: false, 
          remainingBalance: currentBalance, 
          consumed: 0,
          error: `Insufficient credits. Required: ${amount}, Available: ${currentBalance}` 
        };
      }

      // Create consumption entry
      const entry: InsertCreditLedger = {
        userId,
        delta: -amount, // Negative for consumption
        reason: 'consume:standard',
        jobId,
        extRef: null,
        expiresAt: null,
      };

      await tx.insert(creditLedger).values(entry);

      // Calculate remaining balance within transaction (currentBalance - amount)
      const remainingBalance = currentBalance - amount;
      return { 
        success: true, 
        remainingBalance, 
        consumed: amount 
      };
    });
    
  } catch (error) {
    console.error("Error consuming credits:", error);
    
    // Check for unique constraint violations (idempotency)
    if (error instanceof Error && (
      error.message.includes('unique') || 
      (error as any).code === '23505' // PostgreSQL unique violation
    )) {
      // Get the existing entry to return correct consumed amount
      const existingEntry = await db
        .select()
        .from(creditLedger)
        .where(
          and(
            eq(creditLedger.userId, userId),
            eq(creditLedger.jobId, jobId)
          )
        );
      
      const consumed = existingEntry.length > 0 ? -existingEntry[0].delta : 0;
      const remainingBalance = await getBalance(userId);
      return { success: true, remainingBalance, consumed, idempotent: true };
    }
    
    return { success: false, remainingBalance: 0, consumed: 0, error: "Database error" };
  }
}

/**
 * Check if user can use monthly free scan
 */
export async function canUseMonthlyFreeScan(userId: string): Promise<{
  canUse: boolean;
  reason: string;
  daysUntilReset?: number;
}> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return { canUse: false, reason: "User not found" };
    }

    const now = new Date();
    const lastFreeScan = user.lastFreeScanAt;

    if (!lastFreeScan) {
      // Never used free scan
      return { canUse: true, reason: "First free scan available" };
    }

    // Check if 30 days have passed
    const daysSinceLastScan = Math.floor((now.getTime() - lastFreeScan.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastScan >= 30) {
      return { canUse: true, reason: "Monthly free scan reset" };
    }

    const daysUntilReset = 30 - daysSinceLastScan;
    return { 
      canUse: false, 
      reason: `Monthly free scan already used`,
      daysUntilReset 
    };
    
  } catch (error) {
    console.error("Error checking monthly free scan:", error);
    return { canUse: false, reason: "Database error" };
  }
}

/**
 * Use monthly free scan (update lastFreeScanAt)
 */
export async function useMonthlyFreeScan(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const canUse = await canUseMonthlyFreeScan(userId);
    
    if (!canUse.canUse) {
      return { success: false, error: canUse.reason };
    }

    await db
      .update(users)
      .set({ lastFreeScanAt: new Date() })
      .where(eq(users.id, userId));

    return { success: true };
    
  } catch (error) {
    console.error("Error using monthly free scan:", error);
    return { success: false, error: "Database error" };
  }
}

/**
 * Grant purchased credits with automatic 30-day expiry
 */
export async function grantPurchasedCredits(
  userId: string,
  amount: number,
  reason: string,
  options?: {
    jobId?: string;
    extRef?: string; // For Stripe event ID
  }
): Promise<{ success: boolean; newBalance: number; error?: string; idempotent?: boolean }> {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  
  return grantCredits(userId, amount, reason, {
    ...options,
    expiresAt
  });
}

/**
 * Grant signup bonus credits (no expiry)
 */
export async function grantSignupCredits(userId: string): Promise<{
  success: boolean;
  newBalance: number;
  error?: string;
}> {
  return grantCredits(userId, 3, "signup:free", {
    // No expiry for free signup credits
    expiresAt: undefined
  });
}

/**
 * Get credit transaction history for user
 */
export async function getCreditHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  transactions: CreditLedger[];
  totalCount: number;
}> {
  try {
    const [transactions, countResult] = await Promise.all([
      // Get paginated transactions
      db
        .select()
        .from(creditLedger)
        .where(eq(creditLedger.userId, userId))
        .orderBy(desc(creditLedger.createdAt))
        .limit(limit)
        .offset(offset),
      
      // Get total count
      db
        .select({ count: sql<number>`COUNT(*)`.as('count') })
        .from(creditLedger)
        .where(eq(creditLedger.userId, userId))
    ]);

    return {
      transactions,
      totalCount: countResult[0]?.count || 0
    };
    
  } catch (error) {
    console.error("Error getting credit history:", error);
    return { transactions: [], totalCount: 0 };
  }
}

/**
 * Redeem a promotional code for credits and/or subscription
 */
export async function redeemPromoCode(
  userId: string,
  code: string
): Promise<{
  success: boolean;
  creditsGranted: number;
  subscriptionGranted?: "none" | "starter" | "pro";
  subscriptionDays?: number;
  newBalance: number;
  error?: string;
}> {
  
  if (!code || !userId) {
    return { success: false, creditsGranted: 0, newBalance: 0, error: "Code and user ID required" };
  }

  const normalizedCode = code.toUpperCase().trim();

  try {
    console.log(`🔍 Starting promo redemption for ${userId} with code ${normalizedCode}`);
    
    return await db.transaction(async (tx) => {
      console.log(`🔒 Locking user ${userId}`);
      // Lock user row to prevent concurrent operations
      await tx
        .select({ dummy: sql`1`.as('dummy') })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      
      console.log(`✅ User ${userId} locked successfully`);

      console.log(`🔍 Looking up promo code: ${normalizedCode}`);
      // Find and lock the promo code to prevent concurrent redemptions
      const [promoCode] = await tx
        .select()
        .from(promoCodes)
        .where(eq(promoCodes.code, normalizedCode))
        .for('update');
      
      console.log(`📝 Promo code query result:`, promoCode ? `Found ${promoCode.code}` : 'Not found');

      if (!promoCode) {
        return { success: false, creditsGranted: 0, newBalance: 0, error: "Invalid promo code" };
      }

      if (!promoCode.isActive) {
        return { success: false, creditsGranted: 0, newBalance: 0, error: "This promo code is no longer active" };
      }

      if (promoCode.expiresAt && new Date() > promoCode.expiresAt) {
        return { success: false, creditsGranted: 0, newBalance: 0, error: "This promo code has expired" };
      }

      if (promoCode.currentUses >= promoCode.maxUses) {
        return { success: false, creditsGranted: 0, newBalance: 0, error: "This promo code has been fully redeemed" };
      }

      // Check if user has already used this code
      const [existingRedemption] = await tx
        .select()
        .from(promoRedemptions)
        .where(
          and(
            eq(promoRedemptions.userId, userId),
            eq(promoRedemptions.promoCodeId, promoCode.id)
          )
        );

      if (existingRedemption) {
        return { success: false, creditsGranted: 0, newBalance: 0, error: "You have already used this promo code" };
      }

      // Grant credits if any
      let newBalance = 0;
      if (promoCode.creditAmount > 0) {
        const creditResult = await grantCredits(
          userId,
          promoCode.creditAmount,
          `promo:${normalizedCode}`,
          {
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry for promo credits
            extRef: `promo_${promoCode.id}_${userId}`
          }
        );

        if (!creditResult.success) {
          return { success: false, creditsGranted: 0, newBalance: 0, error: creditResult.error || "Failed to grant credits" };
        }
        
        newBalance = creditResult.newBalance;
      } else {
        // Get current balance if no credits granted
        newBalance = await getBalance(userId);
      }

      // Grant subscription if any
      let subscriptionGranted: "none" | "starter" | "pro" | undefined;
      let subscriptionDays: number | undefined;
      
      if (promoCode.subscriptionType !== 'none' && promoCode.subscriptionDays > 0) {
        const endDate = new Date(Date.now() + promoCode.subscriptionDays * 24 * 60 * 60 * 1000);
        await storage.updateUserSubscription(
          userId,
          promoCode.subscriptionType,
          endDate,
          `promo_${promoCode.id}_${userId}`
        );
        subscriptionGranted = promoCode.subscriptionType;
        subscriptionDays = promoCode.subscriptionDays;
      }

      // Record the redemption
      await tx.insert(promoRedemptions).values({
        userId,
        promoCodeId: promoCode.id,
        creditsGranted: promoCode.creditAmount,
        subscriptionGranted: subscriptionGranted || undefined,
        subscriptionDays: subscriptionDays || undefined
      });

      // Update promo code usage count
      await tx
        .update(promoCodes)
        .set({ currentUses: promoCode.currentUses + 1 })
        .where(eq(promoCodes.id, promoCode.id));

      console.log(`✅ Promo code ${normalizedCode} redeemed by user ${userId}: ${promoCode.creditAmount} credits${subscriptionGranted ? ` + ${subscriptionDays} days ${subscriptionGranted}` : ''}`);

      return {
        success: true,
        creditsGranted: promoCode.creditAmount,
        subscriptionGranted,
        subscriptionDays,
        newBalance,
      };
    });
    
  } catch (error) {
    console.error("Error redeeming promo code:", error);
    
    // Check for unique constraint violations (already redeemed)
    if (error instanceof Error && (
      error.message.includes('unique') || 
      (error as any).code === '23505'
    )) {
      const newBalance = await getBalance(userId);
      return { success: false, creditsGranted: 0, newBalance, error: "You have already used this promo code" };
    }
    
    return { success: false, creditsGranted: 0, newBalance: 0, error: "Failed to redeem promo code" };
  }
}

