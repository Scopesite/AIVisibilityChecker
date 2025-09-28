import { z } from "zod";
import { sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, serial, date, varchar, index, jsonb, pgEnum, boolean, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// Zod Schemas for API validation
export const submissionSchema = z.object({
  email: z.string().email("Invalid email address"),
  website_url: z.string().min(1, "Website URL is required"),
  consent: z.boolean().refine(val => val === true, "Consent is required")
});

export const scoreRequestSchema = z.object({
  email: z.string().email(),
  website_url: z.string().url()
});

export const scoreReadySchema = z.object({
  run_id: z.string().optional(),
  email: z.string().email(),
  website_url: z.string().url(),
  score: z.number().optional(),
  band: z.string().optional(),
  checked_at: z.string()
});

export type SubmissionData = z.infer<typeof submissionSchema>;
export type ScoreRequest = z.infer<typeof scoreRequestSchema>;
export type ScoreReady = z.infer<typeof scoreReadySchema>;

// Database Tables

// Subscription status enum for three-tier pricing system
export const subscriptionStatusEnum = pgEnum("subscription_status", ["none", "starter", "pro"]);

// Operation type enum for billing transactions audit
export const operationTypeEnum = pgEnum("operation_type", ["consume_check", "add_starter_credits", "subscription_update"]);

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  lastFreeScanAt: timestamp("last_free_scan_at"), // Track free monthly scans
  // Password authentication fields
  passwordHash: text("password_hash"),
  passwordSetAt: timestamp("password_set_at"),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  // Single session enforcement
  currentSessionId: varchar("current_session_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const dailyUsage = pgTable("daily_usage", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  ip_address: varchar("ip_address", { length: 45 }), // IPv6 compatible
  usage_date: date("usage_date").notNull(),
  website_url: text("website_url").notNull(),
  run_id: varchar("run_id", { length: 100 }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull()
});

export const insertDailyUsageSchema = createInsertSchema(dailyUsage).omit({
  id: true,
  created_at: true
});

export type DailyUsage = typeof dailyUsage.$inferSelect;
export type InsertDailyUsage = z.infer<typeof insertDailyUsageSchema>;

// User Credits Table for Paywall System with Three-Tier Pricing
export const userCredits = pgTable("user_credits", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(), // Keep for backward compatibility, but no unique constraint
  
  // Existing credit fields
  free_checks_used: integer("free_checks_used").default(0).notNull(),
  paid_checks_remaining: integer("paid_checks_remaining").default(0).notNull(),
  total_checks_performed: integer("total_checks_performed").default(0).notNull(),
  
  // New subscription system fields
  subscription_status: subscriptionStatusEnum("subscription_status").default("none").notNull(),
  subscription_end_date: timestamp("subscription_end_date"),
  monthly_checks_used: integer("monthly_checks_used").default(0).notNull(),
  monthly_reset_date: timestamp("monthly_reset_date"),
  starter_pack_purchased: boolean("starter_pack_purchased").default(false).notNull(),
  total_lifetime_checks: integer("total_lifetime_checks").default(0).notNull(),
  
  // Stripe integration fields
  stripe_customer_id: varchar("stripe_customer_id", { length: 255 }),
  stripe_subscription_id: varchar("stripe_subscription_id", { length: 255 }),
  last_payment_date: timestamp("last_payment_date"),
  
  // Audit fields
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

export const insertUserCreditsSchema = createInsertSchema(userCredits).omit({
  id: true,
  created_at: true,
  updated_at: true
});

export type UserCredits = typeof userCredits.$inferSelect;
export type InsertUserCredits = z.infer<typeof insertUserCreditsSchema>;

// Schema Analysis Results Table
export const schemaAnalysis = pgTable("schema_analysis", {
  id: serial("id").primaryKey(),
  run_id: varchar("run_id", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  website_url: text("website_url").notNull(),
  score: integer("score").notNull(),
  zone: varchar("zone", { length: 20 }).notNull(), // RED, AMBER, GREEN
  schema_types: text("schema_types"),
  recommendation_1: text("recommendation_1"),
  recommendation_2: text("recommendation_2"),
  recommendation_3: text("recommendation_3"),
  recommendation_4: text("recommendation_4"),
  
  // SEO Analysis Fields
  meta_title: text("meta_title"),
  meta_title_length: integer("meta_title_length"),
  meta_description: text("meta_description"),
  meta_description_length: integer("meta_description_length"),
  canonical_url: text("canonical_url"),
  h1_tags: text("h1_tags"), // JSON array of H1 content
  h1_count: integer("h1_count"),
  og_title: text("og_title"),
  og_description: text("og_description"),
  og_image: text("og_image"),
  og_type: text("og_type"),
  twitter_card: text("twitter_card"),
  twitter_title: text("twitter_title"),
  twitter_description: text("twitter_description"),
  twitter_image: text("twitter_image"),
  robots_meta: text("robots_meta"),
  robots_txt_status: varchar("robots_txt_status", { length: 50 }), // found, not_found, error
  sitemap_status: varchar("sitemap_status", { length: 50 }), // found, not_found, error
  sitemap_url: text("sitemap_url"),
  favicon_status: varchar("favicon_status", { length: 50 }), // found, not_found, error
  favicon_type: varchar("favicon_type", { length: 20 }), // ico, png, svg
  images_total: integer("images_total"),
  images_with_alt: integer("images_with_alt"),
  images_alt_percentage: integer("images_alt_percentage"),
  internal_links_count: integer("internal_links_count"),
  external_links_count: integer("external_links_count"),
  lang_attribute: varchar("lang_attribute", { length: 10 }),
  has_hreflang: integer("has_hreflang"), // 0 or 1 (boolean)
  viewport_meta: text("viewport_meta"),
  charset_meta: varchar("charset_meta", { length: 50 }),
  
  // SEO Score Breakdown
  schema_score: integer("schema_score"), // Score from schema markup
  seo_score: integer("seo_score"), // Score from SEO factors
  total_score: integer("total_score"), // Combined score (replaces 'score' for clarity)
  
  checked_at: timestamp("checked_at").defaultNow().notNull()
});

export const insertSchemaAnalysisSchema = createInsertSchema(schemaAnalysis).omit({
  id: true,
  checked_at: true
});

export type SchemaAnalysis = typeof schemaAnalysis.$inferSelect;
export type InsertSchemaAnalysis = z.infer<typeof insertSchemaAnalysisSchema>;

// Billing Transactions Audit Table for Idempotency
export const billingTransactions = pgTable("billing_transactions", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  operation_type: operationTypeEnum("operation_type").notNull(),
  run_id: varchar("run_id", { length: 255 }).notNull(), // Can be website check run_id or Stripe payment_intent_id/event_id
  metadata: jsonb("metadata"), // Optional additional data (e.g., credits_added, subscription_status)
  created_at: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  // Unique constraint to prevent duplicate operations
  unique("unique_user_operation_run").on(table.user_id, table.operation_type, table.run_id)
]);

export const insertBillingTransactionSchema = createInsertSchema(billingTransactions).omit({
  id: true,
  created_at: true
});

export type BillingTransaction = typeof billingTransactions.$inferSelect;
export type InsertBillingTransaction = z.infer<typeof insertBillingTransactionSchema>;

// Credit Ledger Table - New simplified ledger approach from VOICE Scanner spec
export const creditLedger = pgTable("credit_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), // Match users.id pattern
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  delta: integer("delta").notNull(), // +100 when purchased, -2 when consumed, etc.
  reason: text("reason").notNull(), // "purchase:pro_150", "consume:deep", "signup:free", "refund", etc.
  jobId: varchar("job_id"), // To make consumption idempotent per scan
  extRef: varchar("ext_ref"), // Store Stripe event ID for webhook idempotency
  expiresAt: timestamp("expires_at"), // Purchases expire in 30 days; freebies can be null
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  index("credit_ledger_user_expires_idx").on(table.userId, table.expiresAt),
  unique("credit_ledger_user_job_unique").on(table.userId, table.jobId), // Prevents double-consume for same job
  unique("credit_ledger_ext_ref_unique").on(table.extRef) // Webhook idempotency
]);

export const insertCreditLedgerSchema = createInsertSchema(creditLedger).omit({
  id: true,
  createdAt: true
});

export type CreditLedger = typeof creditLedger.$inferSelect;
export type InsertCreditLedger = z.infer<typeof insertCreditLedgerSchema>;

// Promo Codes Table - For promotional code distribution and early access
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  creditAmount: integer("credit_amount").notNull(), // Number of credits to grant
  subscriptionType: subscriptionStatusEnum("subscription_type").default("none").notNull(), // Type of subscription to grant
  subscriptionDays: integer("subscription_days").default(30).notNull(), // How many days of subscription
  maxUses: integer("max_uses").default(1).notNull(), // How many times this code can be used
  currentUses: integer("current_uses").default(0).notNull(), // How many times it's been used
  expiresAt: timestamp("expires_at"), // When the code expires (null = never)
  isActive: boolean("is_active").default(true).notNull(), // Can be disabled by admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: varchar("created_by").references(() => users.id), // Who created this code
  notes: text("notes") // Optional description/purpose
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  currentUses: true,
  createdAt: true
});

export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;

// Promo Code Redemptions Table - Track who used which codes
export const promoRedemptions = pgTable("promo_redemptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  promoCodeId: integer("promo_code_id").notNull().references(() => promoCodes.id, { onDelete: "cascade" }),
  creditsGranted: integer("credits_granted").notNull(),
  subscriptionGranted: subscriptionStatusEnum("subscription_granted"),
  subscriptionDays: integer("subscription_days"),
  redeemedAt: timestamp("redeemed_at").defaultNow().notNull()
}, (table) => [
  // Prevent same user from using the same code multiple times
  unique("unique_user_promo_redemption").on(table.userId, table.promoCodeId)
]);

export const insertPromoRedemptionSchema = createInsertSchema(promoRedemptions).omit({
  id: true,
  redeemedAt: true
});

export type PromoRedemption = typeof promoRedemptions.$inferSelect;
export type InsertPromoRedemption = z.infer<typeof insertPromoRedemptionSchema>;

// Magic Link Tokens Table for passwordless authentication
export const magicTokens = pgTable("magic_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(), // JWT or signed random token (unlimited length)
  user_id: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(), // Email for magic link (can be pending user)
  expires_at: timestamp("expires_at").notNull(), // 30-minute expiration
  consumed_at: timestamp("consumed_at"), // Single-use tracking
  created_at: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  index("magic_tokens_token_idx").on(table.token),
  index("magic_tokens_email_expires_idx").on(table.email, table.expires_at),
  index("magic_tokens_expires_idx").on(table.expires_at) // For cleanup of expired tokens
]);

export const insertMagicTokenSchema = createInsertSchema(magicTokens).omit({
  id: true,
  created_at: true
});

export type MagicToken = typeof magicTokens.$inferSelect;
export type InsertMagicToken = z.infer<typeof insertMagicTokenSchema>;

// Projects Table - For AI Analysis feature
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  email: varchar("email", { length: 255 }), // Optional for backward compatibility
  jobId: varchar("job_id").notNull().unique(), // Links to credit consumption
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  index("projects_user_created_idx").on(table.userId, table.createdAt),
  index("projects_job_id_idx").on(table.jobId)
]);

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

// Analyses Table - For storing AI recommendations
export const analyses = pgTable("analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  recommendationsJson: jsonb("recommendations_json").notNull(), // AIRecommendationsV1 object
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  index("analyses_project_created_idx").on(table.projectId, table.createdAt)
]);

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

// Password Reset Tokens Table for password reset functionality
export const passwordResets = pgTable("password_resets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  index("password_resets_user_id_idx").on(table.userId),
  index("password_resets_expires_idx").on(table.expiresAt)
]);

export const insertPasswordResetSchema = createInsertSchema(passwordResets).omit({
  id: true,
  createdAt: true
});

export type PasswordReset = typeof passwordResets.$inferSelect;
export type InsertPasswordReset = z.infer<typeof insertPasswordResetSchema>;

// Free Scans Table - Track one free scan per email (using email hash)
export const freeScans = pgTable("free_scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailHash: text("email_hash").notNull().unique(), // HMAC-SHA256 hash of email
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  index("free_scans_email_hash_idx").on(table.emailHash),
  index("free_scans_created_at_idx").on(table.createdAt)
]);

export const insertFreeScanSchema = createInsertSchema(freeScans).omit({
  id: true,
  createdAt: true
});

export type FreeScan = typeof freeScans.$inferSelect;
export type InsertFreeScan = z.infer<typeof insertFreeScanSchema>;

// Relations - Enhanced to include credit ledger, magic tokens, and password resets
export const usersRelations = relations(users, ({ one, many }) => ({
  userCredits: one(userCredits), // Existing user credits relationship
  creditLedgers: many(creditLedger), // New ledger entries relationship
  magicTokens: many(magicTokens), // Magic link tokens relationship
  projects: many(projects), // AI analysis projects
  passwordResets: many(passwordResets), // Password reset tokens
}));

export const userCreditsRelations = relations(userCredits, ({ one }) => ({
  user: one(users, {
    fields: [userCredits.user_id],
    references: [users.id],
  }),
}));

export const creditLedgerRelations = relations(creditLedger, ({ one }) => ({
  user: one(users, {
    fields: [creditLedger.userId],
    references: [users.id],
  }),
}));

export const magicTokensRelations = relations(magicTokens, ({ one }) => ({
  user: one(users, {
    fields: [magicTokens.user_id],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  analyses: many(analyses),
}));

export const analysesRelations = relations(analyses, ({ one }) => ({
  project: one(projects, {
    fields: [analyses.projectId],
    references: [projects.id],
  }),
}));

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, {
    fields: [passwordResets.userId],
    references: [users.id],
  }),
}));
