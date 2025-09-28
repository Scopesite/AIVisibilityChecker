import { db } from "./db";
import {
  users,
  sessions,
  userCredits,
  dailyUsage,
  schemaAnalysis,
  billingTransactions,
  creditLedger,
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
  type CreditLedger,
  type InsertCreditLedger,
} from "@shared/schema";
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
  
  // User Credits operations
  getUserCredits(userId: string): Promise<UserCredits | undefined>;
  createUserCredits(credits: InsertUserCredits): Promise<UserCredits>;
  updateUserCredits(userId: string, updates: Partial<UserCredits>): Promise<UserCredits>;
  
  // Schema Analysis operations
  insertSchemaAnalysis(analysis: InsertSchemaAnalysis): Promise<SchemaAnalysis>;
  getSchemaAnalysisByRunId(runId: string): Promise<SchemaAnalysis | undefined>;
  
  // Billing audit methods for idempotency
  checkOperationExists(userId: string, operationType: "consume_check" | "add_starter_credits" | "subscription_update", runId: string): Promise<boolean>;
  insertBillingTransaction(transaction: InsertBillingTransaction): Promise<BillingTransaction>;
  getBillingTransaction(userId: string, operationType: "consume_check" | "add_starter_credits" | "subscription_update", runId: string): Promise<BillingTransaction | undefined>;
  
  // New methods for Stripe webhook handling
  getBillingTransactionByStripeId(stripeId: string): Promise<BillingTransaction | undefined>;
  createBillingTransaction(transaction: Omit<InsertBillingTransaction, 'operation_type'> & { 
    stripe_payment_intent_id?: string;
    amount_cents?: number;
    currency?: string;
    status?: string;
    credits_granted?: number;
    transaction_type?: string;
    description?: string;
    metadata?: string;
  }): Promise<BillingTransaction>;
  
  // Credit ledger operations
  addCreditLedgerEntry(entry: Omit<InsertCreditLedger, 'id' | 'createdAt'> & {
    operation_type: string;
    credits_before: number;
    credits_after: number;
    credits_delta: number;
    description: string;
    metadata?: string;
  }): Promise<CreditLedger>;
}

class Storage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const [result] = await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async getUserIdByEmail(email: string): Promise<string | undefined> {
    const user = await this.getUserByEmail(email);
    return user?.id;
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    return this.getUserByEmail(email);
  }

  // Password authentication methods
  async hashPassword(password: string): Promise<string> {
    return await argon2.hash(password);
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    const [result] = await db
      .insert(users)
      .values(userData)
      .returning();
    return result;
  }

  async setUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({
        passwordHash,
        passwordSetAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async incrementFailedLoginAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async clearFailedLoginAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await this.setUserPassword(userId, passwordHash);
  }

  // Single session enforcement methods
  async setCurrentSessionId(userId: string, sessionId: string): Promise<void> {
    await db
      .update(users)
      .set({
        currentSessionId: sessionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async invalidateOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    // Delete all sessions except the current one
    await db
      .delete(sessions)
      .where(and(
        sql`sess->>'userId' = ${userId}`,
        sql`sid != ${currentSessionId}`
      ));
  }

  async getCurrentSessionId(userId: string): Promise<string | undefined> {
    const [user] = await db
      .select({ currentSessionId: users.currentSessionId })
      .from(users)
      .where(eq(users.id, userId));
    return user?.currentSessionId || undefined;
  }

  // Application operations
  async getDailyUsage(email: string, date: string): Promise<DailyUsage[]> {
    return await db
      .select()
      .from(dailyUsage)
      .where(and(
        eq(dailyUsage.email, email),
        eq(dailyUsage.usage_date, date)
      ));
  }

  async insertDailyUsage(usage: InsertDailyUsage): Promise<DailyUsage> {
    const [result] = await db
      .insert(dailyUsage)
      .values(usage)
      .returning();
    return result;
  }

  // User Credits operations
  async getUserCredits(userId: string): Promise<UserCredits | undefined> {
    const [credits] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.user_id, userId));
    return credits;
  }

  async createUserCredits(credits: InsertUserCredits): Promise<UserCredits> {
    const [result] = await db
      .insert(userCredits)
      .values(credits)
      .returning();
    return result;
  }

  async updateUserCredits(userId: string, updates: Partial<UserCredits>): Promise<UserCredits> {
    const [result] = await db
      .update(userCredits)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(userCredits.user_id, userId))
      .returning();
    return result;
  }

  // Schema Analysis operations
  async insertSchemaAnalysis(analysis: InsertSchemaAnalysis): Promise<SchemaAnalysis> {
    const [result] = await db
      .insert(schemaAnalysis)
      .values(analysis)
      .returning();
    return result;
  }

  async getSchemaAnalysisByRunId(runId: string): Promise<SchemaAnalysis | undefined> {
    const [result] = await db
      .select()
      .from(schemaAnalysis)
      .where(eq(schemaAnalysis.run_id, runId));
    return result;
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

  // New methods for Stripe webhook handling
  async getBillingTransactionByStripeId(stripeId: string): Promise<BillingTransaction | undefined> {
    const [transaction] = await db
      .select()
      .from(billingTransactions)
      .where(eq(billingTransactions.run_id, stripeId));
    return transaction;
  }

  async createBillingTransaction(transaction: any): Promise<BillingTransaction> {
    // Map the extended transaction data to the basic schema
    const billingTransaction: InsertBillingTransaction = {
      user_id: transaction.user_id,
      operation_type: transaction.credits_granted === 50 ? 'add_starter_credits' : 'add_starter_credits', // Will be updated in schema
      run_id: transaction.stripe_payment_intent_id || transaction.run_id,
      metadata: transaction.metadata ? JSON.parse(transaction.metadata) : {
        amount_cents: transaction.amount_cents,
        currency: transaction.currency,
        status: transaction.status,
        credits_granted: transaction.credits_granted,
        transaction_type: transaction.transaction_type,
        description: transaction.description
      }
    };

    return this.insertBillingTransaction(billingTransaction);
  }

  // Credit ledger operations
  async addCreditLedgerEntry(entry: any): Promise<CreditLedger> {
    const ledgerEntry: InsertCreditLedger = {
      userId: entry.user_id,
      delta: entry.credits_delta,
      reason: `${entry.operation_type}:${entry.credits_delta}`,
      jobId: null, // Not used for purchases
      extRef: entry.metadata ? JSON.parse(entry.metadata).stripe_session_id : null,
      expiresAt: null // Credits don't expire for now
    };

    const [result] = await db
      .insert(creditLedger)
      .values(ledgerEntry)
      .returning();
    return result;
  }
}

export const storage = new Storage();
