// Integration reference: blueprint:javascript_log_in_with_replit
import {
  users,
  sessions,
  userCredits,
  dailyUsage,
  schemaAnalysis,
  billingTransactions,
  type User,
  type UpsertUser,
  type UserCredits,
  type InsertUserCredits,
  type DailyUsage,
  type InsertDailyUsage,
  type SchemaAnalysis,
  type InsertSchemaAnalysis,
  type BillingTransaction,
  type InsertBillingTransaction,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import * as argon2 from "argon2";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Helper methods
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserIdByEmail(email: string): Promise<string | undefined>;
  findUserByEmail(email: string): Promise<User | undefined>; // Alias for consistency
  
  // Password authentication methods
  hashPassword(password: string): Promise<string>;
  createUser(userData: Omit<UpsertUser, 'id'>): Promise<User>;
  setUserPassword(userId: string, passwordHash: string): Promise<void>;
  incrementFailedLoginAttempts(userId: string): Promise<void>;
  clearFailedLoginAttempts(userId: string): Promise<void>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  
  // Single session enforcement methods
  setCurrentSessionId(userId: string, sessionId: string): Promise<void>;
  invalidateOtherSessions(userId: string, currentSessionId: string): Promise<void>;
  getCurrentSessionId(userId: string): Promise<string | undefined>;
  
  // Application operations
  getDailyUsage(email: string, date: string): Promise<DailyUsage[]>;
  insertDailyUsage(usage: InsertDailyUsage): Promise<DailyUsage>;
  getSchemaAnalysis(runId: string): Promise<SchemaAnalysis | undefined>;
  insertSchemaAnalysis(analysis: InsertSchemaAnalysis): Promise<SchemaAnalysis>;
  
  // User Credits operations - primarily userId-based
  getUserCredits(userId: string): Promise<UserCredits | undefined>;
  getUserCreditsByEmail(email: string): Promise<UserCredits | undefined>; // Backward compatibility
  createUserCredits(credits: InsertUserCredits): Promise<UserCredits>;
  updateUserCreditsById(userId: string, updates: Partial<UserCredits>): Promise<void>;
  
  // Subscription management - userId-based
  updateUserSubscription(userId: string, subscriptionStatus: "none" | "starter" | "pro", endDate?: Date, runId?: string): Promise<void>;
  resetMonthlyUsage(userId: string): Promise<void>;
  checkSubscriptionStatus(userId: string): Promise<{isActive: boolean, status: "none" | "starter" | "pro", checksRemaining: number}>;
  
  // Atomic credit operations with transaction support
  consumeCheck(userId: string, runId: string): Promise<{success: boolean, remainingChecks: number, error?: string}>;
  addStarterPackCredits(userId: string, runId: string): Promise<{success: boolean, error?: string}>;
  
  // Backward compatibility methods (deprecated - will call userId versions internally)
  updateUserCredits(email: string, updates: Partial<UserCredits>): Promise<void>;
  
  // Billing audit methods for idempotency
  checkOperationExists(userId: string, operationType: "consume_check" | "add_starter_credits" | "subscription_update", runId: string): Promise<boolean>;
  insertBillingTransaction(transaction: InsertBillingTransaction): Promise<BillingTransaction>;
  getBillingTransaction(userId: string, operationType: "consume_check" | "add_starter_credits" | "subscription_update", runId: string): Promise<BillingTransaction | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async getUserIdByEmail(email: string): Promise<string | undefined> {
    const user = await this.getUserByEmail(email);
    return user?.id;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Application operations
  async getDailyUsage(email: string, date: string): Promise<DailyUsage[]> {
    return await db
      .select()
      .from(dailyUsage)
      .where(and(eq(dailyUsage.email, email), eq(dailyUsage.usage_date, date)));
  }

  async insertDailyUsage(usage: InsertDailyUsage): Promise<DailyUsage> {
    const [result] = await db.insert(dailyUsage).values(usage).returning();
    return result;
  }

  // User Credits operations - primarily userId-based
  async getUserCredits(userId: string): Promise<UserCredits | undefined> {
    const [credits] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.user_id, userId));
    return credits;
  }

  async getUserCreditsByEmail(email: string): Promise<UserCredits | undefined> {
    const [credits] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.email, email.toLowerCase()));
    return credits;
  }

  async createUserCredits(credits: InsertUserCredits): Promise<UserCredits> {
    const [result] = await db.insert(userCredits).values(credits).returning();
    return result;
  }

  async updateUserCreditsById(userId: string, updates: Partial<UserCredits>): Promise<void> {
    await db
      .update(userCredits)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(userCredits.user_id, userId));
  }

  // Backward compatibility method - deprecated
  async updateUserCredits(email: string, updates: Partial<UserCredits>): Promise<void> {
    const userId = await this.getUserIdByEmail(email);
    if (userId) {
      await this.updateUserCreditsById(userId, updates);
    } else {
      throw new Error(`User not found for email: ${email}`);
    }
  }

  async getSchemaAnalysis(runId: string): Promise<SchemaAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(schemaAnalysis)
      .where(eq(schemaAnalysis.run_id, runId));
    return analysis;
  }

  async insertSchemaAnalysis(analysis: InsertSchemaAnalysis): Promise<SchemaAnalysis> {
    const [result] = await db.insert(schemaAnalysis).values(analysis).returning();
    return result;
  }

  // Subscription management - userId-based
  async updateUserSubscription(
    userId: string, 
    subscriptionStatus: "none" | "starter" | "pro", 
    endDate?: Date,
    runId?: string
  ): Promise<void> {
    const updates: Partial<UserCredits> = {
      subscription_status: subscriptionStatus,
      subscription_end_date: endDate || null,
      updated_at: new Date()
    };

    // If setting up pro subscription, initialize monthly tracking based on Stripe period
    if (subscriptionStatus === "pro" && endDate) {
      updates.monthly_checks_used = 0;
      updates.monthly_reset_date = endDate; // Use Stripe's current_period_end instead of computed date
    }

    // NOTE: For starter pack, we do NOT set starter_pack_purchased here!
    // This prevents race conditions where webhook calls updateUserSubscription before addStarterPackCredits.
    // Only addStarterPackCredits should set starter_pack_purchased=true to ensure atomic credit addition.

    await db
      .update(userCredits)
      .set(updates)
      .where(eq(userCredits.user_id, userId));
  }

  async resetMonthlyUsage(userId: string): Promise<void> {
    // Get current user credits to determine next reset date from Stripe period
    const credits = await this.getUserCredits(userId);
    if (!credits?.subscription_end_date) {
      throw new Error('Cannot reset monthly usage without subscription end date');
    }
    
    // Calculate next reset based on Stripe subscription period (monthly)
    const currentEndDate = new Date(credits.subscription_end_date);
    const nextResetDate = new Date(currentEndDate.getFullYear(), currentEndDate.getMonth() + 1, currentEndDate.getDate());
    
    await db
      .update(userCredits)
      .set({ 
        monthly_checks_used: 0,
        monthly_reset_date: nextResetDate,
        updated_at: new Date()
      })
      .where(eq(userCredits.user_id, userId));
  }

  async checkSubscriptionStatus(userId: string): Promise<{
    isActive: boolean, 
    status: "none" | "starter" | "pro", 
    checksRemaining: number
  }> {
    const credits = await this.getUserCredits(userId);
    if (!credits) {
      return { isActive: false, status: "none", checksRemaining: 0 };
    }

    const now = new Date();
    let isActive = false;
    let checksRemaining = 0;

    switch (credits.subscription_status) {
      case "pro":
        isActive = credits.subscription_end_date ? new Date(credits.subscription_end_date) > now : false;
        if (isActive) {
          // Check if monthly reset is needed - but don't trigger it here (read-only operation)
          const needsReset = credits.monthly_reset_date && new Date(credits.monthly_reset_date) <= now;
          if (needsReset) {
            checksRemaining = 100; // Pro users get 100 checks per month after reset
          } else {
            checksRemaining = Math.max(0, 100 - (credits.monthly_checks_used || 0));
          }
        }
        break;
        
      case "starter":
        isActive = credits.starter_pack_purchased && (credits.paid_checks_remaining || 0) > 0;
        checksRemaining = credits.paid_checks_remaining || 0;
        break;
        
      case "none":
      default:
        isActive = (credits.free_checks_used || 0) < 1;
        checksRemaining = isActive ? 1 : 0;
        break;
    }

    return { 
      isActive, 
      status: credits.subscription_status as "none" | "starter" | "pro", 
      checksRemaining 
    };
  }

  // Atomic credit operations with transaction support
  async consumeCheck(userId: string, runId: string): Promise<{success: boolean, remainingChecks: number, error?: string}> {
    return await db.transaction(async (tx) => {
      try {
        // First check if this operation has already been processed (idempotency)
        const [existingTransaction] = await tx
          .select()
          .from(billingTransactions)
          .where(and(
            eq(billingTransactions.user_id, userId),
            eq(billingTransactions.operation_type, 'consume_check'),
            eq(billingTransactions.run_id, runId)
          ));

        if (existingTransaction) {
          // Already processed - get current credits to return accurate remaining count
          const [credits] = await tx
            .select()
            .from(userCredits)
            .where(eq(userCredits.user_id, userId));

          if (!credits) {
            return { success: false, remainingChecks: 0, error: 'User credits not found' };
          }

          // Calculate current remaining checks based on subscription status
          let remainingChecks = 0;
          const now = new Date();
          switch (credits.subscription_status) {
            case 'pro':
              const proActive = credits.subscription_end_date ? new Date(credits.subscription_end_date) > now : false;
              if (proActive) {
                const needsReset = credits.monthly_reset_date && new Date(credits.monthly_reset_date) <= now;
                remainingChecks = needsReset ? 100 : Math.max(0, 100 - (credits.monthly_checks_used || 0));
              }
              break;
            case 'starter':
              remainingChecks = credits.paid_checks_remaining || 0;
              break;
            case 'none':
            default:
              remainingChecks = (credits.free_checks_used || 0) < 1 ? 1 - (credits.free_checks_used || 0) : 0;
              break;
          }
          
          return { success: true, remainingChecks }; // Already processed, return current state
        }

        // Get current user credits with row lock to prevent race conditions
        const [credits] = await tx
          .select()
          .from(userCredits)
          .where(eq(userCredits.user_id, userId))
          .for('update');

        if (!credits) {
          return { success: false, remainingChecks: 0, error: 'User credits not found' };
        }

        const now = new Date();
        let canConsume = false;
        let updatesNeeded: Partial<UserCredits> = { updated_at: now };
        let remainingAfterConsume = 0;

        // Enforce precedence: free → starter → pro
        switch (credits.subscription_status) {
          case 'pro':
            const proActive = credits.subscription_end_date ? new Date(credits.subscription_end_date) > now : false;
            if (proActive) {
              // Check if monthly reset is needed
              const needsReset = credits.monthly_reset_date && new Date(credits.monthly_reset_date) <= now;
              if (needsReset) {
                // Reset monthly usage based on subscription period
                const currentEndDate = new Date(credits.subscription_end_date!);
                const nextResetDate = new Date(currentEndDate.getFullYear(), currentEndDate.getMonth() + 1, currentEndDate.getDate());
                updatesNeeded.monthly_checks_used = 1;
                updatesNeeded.monthly_reset_date = nextResetDate;
                remainingAfterConsume = 99;
                canConsume = true;
              } else {
                const monthlyUsed = credits.monthly_checks_used || 0;
                if (monthlyUsed < 100) {
                  updatesNeeded.monthly_checks_used = monthlyUsed + 1;
                  remainingAfterConsume = 100 - monthlyUsed - 1;
                  canConsume = true;
                }
              }
            }
            break;

          case 'starter':
            const paidRemaining = credits.paid_checks_remaining || 0;
            if (paidRemaining > 0) {
              updatesNeeded.paid_checks_remaining = paidRemaining - 1;
              remainingAfterConsume = paidRemaining - 1;
              canConsume = true;
            }
            break;

          case 'none':
          default:
            const freeUsed = credits.free_checks_used || 0;
            if (freeUsed < 1) {
              updatesNeeded.free_checks_used = 1;
              remainingAfterConsume = 0;
              canConsume = true;
            }
            break;
        }

        if (!canConsume) {
          return { 
            success: false, 
            remainingChecks: 0, 
            error: `No credits available for ${credits.subscription_status} tier` 
          };
        }

        // Insert audit record first for idempotency (before consuming credits)
        await tx
          .insert(billingTransactions)
          .values({
            user_id: userId,
            operation_type: 'consume_check',
            run_id: runId,
            metadata: { 
              subscription_status: credits.subscription_status,
              credits_consumed: 1,
              remaining_after: remainingAfterConsume
            }
          });

        // Update usage tracking
        updatesNeeded.total_checks_performed = (credits.total_checks_performed || 0) + 1;
        updatesNeeded.total_lifetime_checks = (credits.total_lifetime_checks || 0) + 1;

        // Apply updates
        await tx
          .update(userCredits)
          .set(updatesNeeded)
          .where(eq(userCredits.user_id, userId));

        return { success: true, remainingChecks: remainingAfterConsume };
      } catch (error) {
        // Check if this was a unique constraint violation (already processed)
        if (error instanceof Error && error.message.includes('unique_user_operation_run')) {
          // Already processed - get current remaining count and return success
          const existingCredits = await this.getUserCredits(userId);
          if (!existingCredits) {
            return { success: false, remainingChecks: 0, error: 'User credits not found' };
          }

          // Calculate current remaining checks
          let remainingChecks = 0;
          const now = new Date();
          switch (existingCredits.subscription_status) {
            case 'pro':
              const proActive = existingCredits.subscription_end_date ? new Date(existingCredits.subscription_end_date) > now : false;
              if (proActive) {
                const needsReset = existingCredits.monthly_reset_date && new Date(existingCredits.monthly_reset_date) <= now;
                remainingChecks = needsReset ? 100 : Math.max(0, 100 - (existingCredits.monthly_checks_used || 0));
              }
              break;
            case 'starter':
              remainingChecks = existingCredits.paid_checks_remaining || 0;
              break;
            case 'none':
            default:
              remainingChecks = (existingCredits.free_checks_used || 0) < 1 ? 1 - (existingCredits.free_checks_used || 0) : 0;
              break;
          }
          
          return { success: true, remainingChecks }; // Already processed
        }
        console.error('Error in consumeCheck transaction:', error);
        throw error; // Let transaction rollback
      }
    });
  }

  async addStarterPackCredits(userId: string, runId: string): Promise<{success: boolean, error?: string}> {
    return await db.transaction(async (tx) => {
      try {
        // First check if this operation has already been processed (idempotency)
        const [existingTransaction] = await tx
          .select()
          .from(billingTransactions)
          .where(and(
            eq(billingTransactions.user_id, userId),
            eq(billingTransactions.operation_type, 'add_starter_credits'),
            eq(billingTransactions.run_id, runId)
          ));

        if (existingTransaction) {
          return { success: true }; // Already processed, return success
        }

        // Insert audit record first for idempotency
        await tx
          .insert(billingTransactions)
          .values({
            user_id: userId,
            operation_type: 'add_starter_credits',
            run_id: runId,
            metadata: { credits_added: 5, subscription_status: 'starter' }
          });

        // Get current user credits with row lock
        const [credits] = await tx
          .select()
          .from(userCredits)
          .where(eq(userCredits.user_id, userId))
          .for('update');

        if (!credits) {
          return { success: false, error: 'User credits not found' };
        }

        const currentPaidCredits = credits.paid_checks_remaining || 0;
        const updates: Partial<UserCredits> = {
          paid_checks_remaining: currentPaidCredits + 5,
          starter_pack_purchased: true,
          subscription_status: 'starter', // Atomic: set both credits AND subscription status
          updated_at: new Date()
        };

        await tx
          .update(userCredits)
          .set(updates)
          .where(eq(userCredits.user_id, userId));

        return { success: true };
      } catch (error) {
        // Check if this was a unique constraint violation (already processed)
        if (error instanceof Error && error.message.includes('unique_user_operation_run')) {
          return { success: true }; // Already processed, return success
        }
        console.error('Error in addStarterPackCredits transaction:', error);
        throw error; // Let transaction rollback
      }
    });
  }

  // Billing audit methods for idempotency
  async checkOperationExists(userId: string, operationType: "consume_check" | "add_starter_credits" | "subscription_update", runId: string): Promise<boolean> {
    const [transaction] = await db
      .select()
      .from(billingTransactions)
      .where(and(
        eq(billingTransactions.user_id, userId),
        eq(billingTransactions.operation_type, operationType),
        eq(billingTransactions.run_id, runId)
      ));
    return !!transaction;
  }

  async insertBillingTransaction(transaction: InsertBillingTransaction): Promise<BillingTransaction> {
    const [result] = await db
      .insert(billingTransactions)
      .values(transaction)
      .returning();
    return result;
  }

  async getBillingTransaction(userId: string, operationType: "consume_check" | "add_starter_credits" | "subscription_update", runId: string): Promise<BillingTransaction | undefined> {
    const [transaction] = await db
      .select()
      .from(billingTransactions)
      .where(and(
        eq(billingTransactions.user_id, userId),
        eq(billingTransactions.operation_type, operationType),
        eq(billingTransactions.run_id, runId)
      ));
    return transaction;
  }

  // Password authentication methods
  async findUserByEmail(email: string): Promise<User | undefined> {
    return this.getUserByEmail(email);
  }

  async hashPassword(password: string): Promise<string> {
    return await argon2.hash(password);
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        email: userData.email?.toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return user;
  }

  async setUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({
        passwordHash,
        passwordSetAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async incrementFailedLoginAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
        lockedUntil: sql`CASE 
          WHEN ${users.failedLoginAttempts} + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
          ELSE NULL
        END`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async clearFailedLoginAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({
        passwordHash,
        passwordSetAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
  // Single session enforcement methods
  async setCurrentSessionId(userId: string, sessionId: string): Promise<void> {
    await db
      .update(users)
      .set({ currentSessionId: sessionId, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getCurrentSessionId(userId: string): Promise<string | undefined> {
    const [user] = await db
      .select({ currentSessionId: users.currentSessionId })
      .from(users)
      .where(eq(users.id, userId));
    return user?.currentSessionId || undefined;
  }

  async invalidateOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    // Delete all sessions for this user except the current one
    await db.execute(sql`
      DELETE FROM sessions 
      WHERE sess->'passport'->'user'->>'id' = ${userId} 
      AND sid != ${currentSessionId}
    `);
  }
}

export const storage = new DatabaseStorage();

// AI Analysis storage operations
import { projects, analyses, type InsertProject, type InsertAnalysis } from "@shared/schema";
import type { AIRecommendationsV1 } from "../shared/types/ai.js";

/**
 * Insert a new project record
 */
export async function insertProject(data: {
  userId: string;
  url: string;
  email: string;
  jobId: string;
}): Promise<string> {
  const projectData: InsertProject = {
    userId: data.userId,
    url: data.url,
    email: data.email,
    jobId: data.jobId
  };

  const result = await db.insert(projects).values(projectData).returning({ id: projects.id });
  return result[0].id;
}

/**
 * Insert analysis results for a project
 */
export async function insertAnalysis(data: {
  projectId: string;
  recommendations: AIRecommendationsV1;
}): Promise<string> {
  const analysisData: InsertAnalysis = {
    projectId: data.projectId,
    recommendationsJson: data.recommendations
  };

  const result = await db.insert(analyses).values(analysisData).returning({ id: analyses.id });
  return result[0].id;
}
