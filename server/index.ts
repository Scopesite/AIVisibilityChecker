import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { config, isMagicLinkEnabled } from "./env";

// Boot check - fail fast on missing critical environment variables
// Always require SESSION_SECRET for basic app functionality
if (!process.env.SESSION_SECRET) {
  console.error(`❌ Missing env: SESSION_SECRET`);
  process.exit(1);
}

// Require FREE_SCAN_SALT for free scan email hashing
if (!process.env.FREE_SCAN_SALT) {
  console.error(`❌ Missing env: FREE_SCAN_SALT (required for free scan email hashing)`);
  process.exit(1);
}

// Only require magic link secrets when feature is enabled
if (config.FEATURE_MAGIC_LINK && isMagicLinkEnabled()) {
  const requiredSecrets = ["EMAIL_SENDER_KEY", "STRIPE_WEBHOOK_SECRET", "FEATURE_MAGIC_LINK"];
  requiredSecrets.forEach(envVar => {
    if (!process.env[envVar]) {
      console.error(`❌ Missing env: ${envVar} (required when FEATURE_MAGIC_LINK is enabled)`);
      process.exit(1);
    }
  });
}

const app = express();

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
  // 1) WEBHOOKS FIRST - Stripe needs raw body, mount before JSON parsing  
  if (config.FEATURE_MAGIC_LINK && isMagicLinkEnabled()) {
    log('🪝 Mounting Stripe webhook with raw body parsing (before JSON middleware)');
    const { default: webhookStripeRouter } = await import('./routes/webhook.stripe');
    app.use('/api/webhooks/stripe', webhookStripeRouter);
  }

  // 2) Mount bulletproof free scan route first
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
      res.status(500).json({ error: error.message });
    }
  });

  // 3) Register all main API routes  
  const server = await registerRoutes(app);

  // 3) Mount magic link auth routes (after JSON parsing is enabled)
  if (config.FEATURE_MAGIC_LINK && isMagicLinkEnabled()) {
    log('✅ FEATURE_MAGIC_LINK enabled - mounting magic link auth routes');
    
    const { default: authMagicRouter } = await import('./routes/auth.magic');
    app.use('/api/auth/magic', authMagicRouter);
    
    log('🔐 Magic link routes mounted: /api/auth/magic/* and /api/webhooks/stripe/*');
  } else if (config.FEATURE_MAGIC_LINK && !isMagicLinkEnabled()) {
    log('⚠️ FEATURE_MAGIC_LINK=true but missing required environment variables');
    log('⚠️ Magic link features disabled - check APP_BASE_URL, EMAIL_SENDER_KEY, STRIPE_WEBHOOK_SECRET');
  } else {
    log('ℹ️ FEATURE_MAGIC_LINK disabled - magic link routes not mounted');
  }

  // 3.5) Mount password auth routes if enabled
  if (process.env.FEATURE_PASSWORD_AUTH === 'true') {
    log('✅ FEATURE_PASSWORD_AUTH enabled - mounting password auth routes');
    
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
    
    log('🔐 Password auth routes mounted: /api/auth/register, /api/auth/login, etc.');
  } else {
    log('ℹ️ FEATURE_PASSWORD_AUTH disabled - password auth routes not mounted');
  }

  // 4) Explicit 404 for unknown API routes (before Vite static serving)
  app.use("/api", (req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  // 5) Error handler (so API errors aren't rendered as HTML)
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

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
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
