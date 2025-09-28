// Environment validation for VOICE AI Visibility Checker
// Validates required environment variables and provides typed config

export interface Config {
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL: string;
  SESSION_SECRET: string;
  
  // Feature flags
  FEATURE_MAGIC_LINK: boolean;
  FEATURE_AI_SUMMARY: boolean;

  // AI Configuration
  OPENAI_API_KEY?: string;
  AI_MODEL?: string;
  
  // Magic Link & Authentication
  APP_BASE_URL?: string;
  EMAIL_SENDER_KEY?: string;
  
  // Stripe configuration
  STRIPE_PUBLIC_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  
  // Existing integrations (for reference)
  REPLIT_DOMAINS?: string;
  ISSUER_URL?: string;
  REPL_ID?: string;
  EMAIL_API_KEY?: string;
  GOOGLE_PAGESPEED_API_KEY?: string;
}

// Validate environment variables and return typed config
export function validateEnv(): Config {
  const env = process.env;
  const isProduction = env.NODE_ENV === 'production';
  const featureMagicLink = env.FEATURE_MAGIC_LINK === 'true';
  const featureAiSummary = env.FEATURE_AI_SUMMARY === 'true';

  // Always required variables
  const required = [
    'DATABASE_URL',
    'SESSION_SECRET'
  ];

  const missing = required.filter(key => !env[key]);
  if (missing.length > 0) {
    const action = isProduction ? 'FATAL' : 'WARN';
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    
    if (isProduction) {
      throw new Error(`${action}: ${message}`);
    } else {
      console.warn(`⚠️ ${action}: ${message}`);
    }
  }

  // Magic Link feature requirements
  if (featureMagicLink) {
    const magicLinkRequired = [
      'APP_BASE_URL',
      'EMAIL_SENDER_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ];

    const magicLinkMissing = magicLinkRequired.filter(key => !env[key]);
    if (magicLinkMissing.length > 0) {
      const action = isProduction ? 'FATAL' : 'WARN';
      const message = `FEATURE_MAGIC_LINK=true requires: ${magicLinkMissing.join(', ')}`;
      
      if (isProduction) {
        throw new Error(`${action}: ${message}`);
      } else {
        console.warn(`⚠️ ${action}: ${message}`);
        console.warn('⚠️ Magic Link features will be disabled');
      }
    } else {
      // Only log success when all required variables are actually present
      console.log('✅ FEATURE_MAGIC_LINK enabled with all required environment variables');
    }
  }

  // AI Summary feature requirements
  if (featureAiSummary) {
    if (!env.OPENAI_API_KEY) {
      const action = isProduction ? 'FATAL' : 'WARN';
      const message = 'FEATURE_AI_SUMMARY=true requires OPENAI_API_KEY';
      
      if (isProduction) {
        throw new Error(`${action}: ${message}`);
      } else {
        console.warn(`⚠️ ${action}: ${message}`);
        console.warn('⚠️ AI Summary feature will be disabled');
      }
    } else {
      console.log('✅ FEATURE_AI_SUMMARY enabled with OPENAI_API_KEY');
    }
  }

  return {
    NODE_ENV: (env.NODE_ENV as Config['NODE_ENV']) || 'development',
    DATABASE_URL: env.DATABASE_URL!,
    SESSION_SECRET: env.SESSION_SECRET!,
    
    // Feature flags
    FEATURE_MAGIC_LINK: false, // DISABLED: Complete removal of magic link auth per project requirements
    FEATURE_AI_SUMMARY: featureAiSummary,

    // AI Configuration
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    AI_MODEL: env.AI_MODEL,
    
    // Magic Link & Authentication
    APP_BASE_URL: env.APP_BASE_URL,
    EMAIL_SENDER_KEY: env.EMAIL_SENDER_KEY,
    
    // Stripe configuration
    STRIPE_PUBLIC_KEY: env.STRIPE_PUBLIC_KEY,
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
    
    // Existing integrations
    REPLIT_DOMAINS: env.REPLIT_DOMAINS,
    ISSUER_URL: env.ISSUER_URL,
    REPL_ID: env.REPL_ID,
    EMAIL_API_KEY: env.EMAIL_API_KEY,
    GOOGLE_PAGESPEED_API_KEY: env.GOOGLE_PAGESPEED_API_KEY,
  };
}

// Export the validated config
export const config = validateEnv();

// Helper function to check if magic link features are available
export function isMagicLinkEnabled(): boolean {
  return config.FEATURE_MAGIC_LINK && 
         !!config.APP_BASE_URL && 
         !!config.EMAIL_SENDER_KEY && 
         !!config.STRIPE_WEBHOOK_SECRET;
}

// AI Summary Feature
export const isAiSummaryEnabled = () => config.FEATURE_AI_SUMMARY && !!config.OPENAI_API_KEY;
export const getAiModel = () => config.AI_MODEL || 'gpt-4o-mini';

