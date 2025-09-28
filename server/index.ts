import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { config, isMagicLinkEnabled } from "./env";

// Enhanced logging for debugging
const debugLog = (message: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
};

debugLog("🚀 Starting AI Visibility Checker server...");

// Boot check - fail fast on missing critical environment variables
// Always require SESSION_SECRET for basic app functionality
if (!process.env.SESSION_SECRET) {
  debugLog(`❌ Missing env: SESSION_SECRET`);
  process.exit(1);
}

// Require FREE_SCAN_SALT for free scan email hashing
if (!process.env.FREE_SCAN_SALT) {
  debugLog(`❌ Missing env: FREE_SCAN_SALT (required for free scan email hashing)`);
  process.exit(1);
}

// Only require magic link secrets when feature is enabled
if (config.FEATURE_MAGIC_LINK && isMagicLinkEnabled()) {
  const requiredSecrets = ["EMAIL_SENDER_KEY", "STRIPE_WEBHOOK_SECRET", "FEATURE_MAGIC_LINK"];
  requiredSecrets.forEach(envVar => {
    if (!process.env[envVar]) {
      debugLog(`❌ Missing env: ${envVar} (required when FEATURE_MAGIC_LINK is enabled)`);
      process.exit(1);
    }
  });
}

debugLog("✅ Environment variables validated");

const app = express();

// Health check endpoint - FIRST route to ensure it's always available
app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    database: process.env.DATABASE_URL ? 'configured' : 'missing',
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
    stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing'
  };
  
  debugLog(`Health check requested: ${JSON.stringify(health)}`);
  res.json(health);
});

debugLog("✅ Health check endpoint mounted at /api/health");

// Enable CORS for all routes  
app.use(cors());

// Normal JSON/URL encoding parsers (except for webhooks which need raw body)
app.use((req, res, next) => {
  // Skip JSON parsing for Stripe webhooks - they need raw body
  if (req.path.startsWith('/api/webhooks/stripe')) {
    return next();
  }
  express.json()(req, res, next);
});
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    debugLog("🔧 Setting up routes and middleware...");

    // 1) WEBHOOKS FIRST - Stripe needs raw body, mount before JSON parsing  
    if (config.FEATURE_MAGIC_LINK && isMagicLinkEnabled()) {
      debugLog('🪝 Mounting Stripe webhook with raw body parsing (before JSON middleware)');
      const { default: webhookStripeRouter } = await import('./routes/webhook.stripe');
      app.use('/api/webhooks/stripe', webhookStripeRouter);
    }

    // 2) Mount bulletproof free scan route first
    debugLog('📡 Mounting free scan route...');
    const { default: freeScanRouter } = await import('./routes/scan-free');
    app.use('/api', freeScanRouter);

    // 2.5) Mount diagnostic route for production debugging
    app.get('/api/diag/site-signals', async (req, res) => {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'url parameter required' });
      }
      
      try {
        const { collectSEO } = await import('./lib/seoCollector');
        const result = await collectSEO(url);
        res.json({ 
          url: result.url,
          signals: {
            title: result.meta.title,
            description: result.meta.description,
            h1: result.headings.h1,
            schema: result.schema,
            score: result.aiVisibilityScore
          }
        });
      } catch (error: any) {
        debugLog(`❌ Diagnostic route error: ${error.message}`);
        res.status(500).json({ error: error.message });
      }
    });

    // 3) Register all main API routes  
    debugLog('🛤️ Registering main API routes...');
    const server = await registerRoutes(app);
    debugLog('✅ Main API routes registered');

    // 3) Mount magic link auth routes (after JSON parsing is enabled)
    if (config.FEATURE_MAGIC_LINK && isMagicLinkEnabled()) {
      debugLog('✅ FEATURE_MAGIC_LINK enabled - mounting magic link auth routes');
      
      const { default: authMagicRouter } = await import('./routes/auth.magic');
      app.use('/api/auth/magic', authMagicRouter);
      
      debugLog('🔐 Magic link routes mounted: /api/auth/magic/* and /api/webhooks/stripe/*');
    } else if (config.FEATURE_MAGIC_LINK && !isMagicLinkEnabled()) {
      debugLog('⚠️ FEATURE_MAGIC_LINK=true but missing required environment variables');
      debugLog('⚠️ Magic link features disabled - check APP_BASE_URL, EMAIL_SENDER_KEY, STRIPE_WEBHOOK_SECRET');
    } else {
      debugLog('ℹ️ FEATURE_MAGIC_LINK disabled - magic link routes not mounted');
    }

    // 3.5) Mount password auth routes if enabled
    if (process.env.FEATURE_PASSWORD_AUTH === 'true') {
      debugLog('✅ FEATURE_PASSWORD_AUTH enabled - mounting password auth routes');
      
      // Set up secure sessions for password authentication
      const { getSession } = await import('./replitAuth');
      app.set("trust proxy", 1);
      app.use(getSession());
      
      // Initialize Passport for sessions
      const passport = (await import('./auth/local')).default;
      app.use(passport.initialize());
      app.use(passport.session());
      
      const passwordRouter = (await import('./auth/passwordRoutes')).default;
      app.use('/api/auth', passwordRouter);
      
      debugLog('🔐 Password auth routes mounted: /api/auth/register, /api/auth/login, etc.');
    } else {
      debugLog('ℹ️ FEATURE_PASSWORD_AUTH disabled - password auth routes not mounted');
    }

    // 4) Explicit 404 for unknown API routes (before Vite static serving)
    app.use("/api", (req, res) => {
      debugLog(`❌ 404 API endpoint not found: ${req.method} ${req.path}`);
      res.status(404).json({ error: "API endpoint not found" });
    });

    // 5) Error handler (so API errors aren't rendered as HTML)
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      debugLog(`❌ Error handler triggered: ${status} - ${message} for ${req.path}`);

      // Return JSON for API routes, let default handler manage others
      if (req.path.startsWith("/api") || req.path.startsWith("/webhooks")) {
        return res.status(status).json({ error: message });
      }
      
      // For non-API routes, use default error handling
      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      debugLog('🔧 Setting up Vite development server...');
      await setupVite(app, server);
    } else {
      debugLog('📦 Setting up static file serving for production...');
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    
    debugLog(`🚀 Starting server on port ${port}...`);
    
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      debugLog(`✅ Server successfully started and listening on port ${port}`);
      debugLog(`🌐 Health check available at: http://localhost:${port}/api/health`);
      log(`serving on port ${port}`);
    });

  } catch (error: any) {
    debugLog(`❌ Fatal error during server startup: ${error.message}`);
    debugLog(`❌ Stack trace: ${error.stack}`);
    process.exit(1);
  }
})();

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  debugLog(`❌ Uncaught Exception: ${error.message}`);
  debugLog(`❌ Stack trace: ${error.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  debugLog(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

debugLog("🎯 Server initialization script loaded successfully");
