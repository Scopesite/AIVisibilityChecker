import crypto from "crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { collectSEO } from "../lib/seoCollector";
import { generateAIRecommendations } from "../services/openai";
import { validateUrl } from "../urlSecurity";
import type { ScanResultV1 } from "../types/scan";
import { z } from "zod";

// Simple URL normalization function (add https if missing)
function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

const router = Router();

const emailHash = (email: string) =>
  crypto.createHmac("sha256", process.env.FREE_SCAN_SALT!)
        .update(email.trim().toLowerCase()).digest("hex");

// Rate limiting: 3 requests per 15 minutes per IP (all requests count)
const freeScanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: {
    error: "Too many free scans from this IP. Please try again in 15 minutes."
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  // Count ALL requests (successful and failed) to prevent abuse
  skipSuccessfulRequests: false
});

// Email-based rate limiting storage (in-memory for simplicity)
const emailCooldowns = new Map<string, number>();
const EMAIL_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between scans per email

function checkEmailCooldown(emailHash: string): boolean {
  const lastScan = emailCooldowns.get(emailHash);
  if (lastScan && Date.now() - lastScan < EMAIL_COOLDOWN_MS) {
    return false; // Still in cooldown
  }
  return true;
}

function setEmailCooldown(emailHash: string): void {
  emailCooldowns.set(emailHash, Date.now());
  
  // Cleanup old entries (keep memory usage reasonable)
  if (emailCooldowns.size > 10000) {
    const cutoff = Date.now() - EMAIL_COOLDOWN_MS * 2;
    for (const [hash, timestamp] of emailCooldowns.entries()) {
      if (timestamp < cutoff) {
        emailCooldowns.delete(hash);
      }
    }
  }
}

// Global concurrency limiter to prevent resource exhaustion
let activeScanCount = 0;
const MAX_CONCURRENT_SCANS = 5;

function checkGlobalConcurrency(): boolean {
  return activeScanCount < MAX_CONCURRENT_SCANS;
}

function incrementScanCount(): void {
  activeScanCount++;
}

function decrementScanCount(): void {
  activeScanCount = Math.max(0, activeScanCount - 1);
}

// Request body validation
const FreeScanRequestSchema = z.object({
  email: z.string().email().min(1).max(254),
  url: z.string().optional(),
  website_url: z.string().optional(),
  consent: z.boolean().optional()
}).refine(data => data.url || data.website_url, {
  message: "Either 'url' or 'website_url' must be provided"
});

router.post("/scan/free", freeScanLimiter, async (req, res) => {
  const start = Date.now();
  
  // Increment scan counter and ensure cleanup
  incrementScanCount();
  
  try {
    // Validate request body
    const parseResult = FreeScanRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid request format",
        details: parseResult.error.issues
      });
    }

    const { email, url, website_url } = parseResult.data;
    const scanUrl = url || website_url; // Support both field names
    
    // Check global concurrency limit
    if (activeScanCount > MAX_CONCURRENT_SCANS) {
      return res.status(503).json({
        error: "Service temporarily overloaded. Please try again in a moment."
      });
    }

    // One scan per email
    const ehash = emailHash(email);
    console.log(`🆓 FREE SCAN: ****@**** scanning ${scanUrl} (hash: ${ehash.substring(0, 8)}...)`);

    // Check email-based cooldown (prevent same email from spamming)
    if (!checkEmailCooldown(ehash)) {
      return res.status(429).json({
        error: "Please wait 5 minutes between scans for the same email address."
      });
    }

    // Normalize URL (add https if missing) and validate for security (prevent SSRF attacks)
    let normalizedUrl;
    try {
      normalizedUrl = normalizeUrl(scanUrl);
      await validateUrl(normalizedUrl);
    } catch (error: any) {
      console.error(`❌ URL security check failed: ${error.message}`);
      return res.status(400).json({ 
        error: "Invalid URL provided. Please ensure it's a valid public website." 
      });
    }

    // Note: For now, we allow multiple free scans. In production, uncomment this:
    // const exists = await storage.checkFreeEmailUsed(ehash);
    // if (exists) return res.status(409).json({ error: "Free scan already used for this email" });

    // Crawl with bulletproof error handling
    let seo;
    try {
      seo = await collectSEO(normalizedUrl);
      console.log(`✅ SEO analysis complete. Score: ${seo.aiVisibilityScore} Band: ${seo.aiVisibilityBand}`);
    } catch (error: any) {
      console.error(`❌ SEO collection failed for ${scanUrl}:`, error.message);
      return res.status(500).json({ 
        error: "Failed to analyze website. Please check the URL and try again." 
      });
    }

    // Map to safe defaults (prevent .map on undefined errors)
    const siteSignals = {
      title: seo?.meta?.title?.text || "",
      metaDescription: seo?.meta?.description?.text || "",
      h1: Array.isArray(seo?.headings?.h1) ? seo.headings.h1.slice(0, 5) : [],
      h2: Array.isArray(seo?.headings?.h2) ? seo.headings.h2.slice(0, 8) : [],
      sameAs: Array.isArray(seo?.social?.sameAs) ? seo.social.sameAs : [],
      schemaTypesPresent: Array.isArray(seo?.schema?.types) ? seo.schema.types : [],
      canonical: seo?.indexability?.canonical || null
    };

    // AI with safety net - continue even if AI fails
    let ai = null;
    try {
      console.log(`🤖 Generating AI recommendations with bulletproof handling...`);
      const aiResult = await generateAIRecommendations(normalizedUrl, {
        title: siteSignals.title,
        metaDescription: siteSignals.metaDescription,
        h1: siteSignals.h1,
        logo: seo?.businessInfo?.logo,
        phone: seo?.businessInfo?.phone,
        sameAs: siteSignals.sameAs,
        hasOrganizationSchema: seo?.schema?.hasOrganization,
        hasWebSiteSchema: seo?.schema?.hasWebSite,
        hasLocalBusinessSchema: seo?.schema?.hasLocalBusiness,
        hasBreadcrumbSchema: seo?.schema?.hasBreadcrumb,
        existingSchemaTypes: siteSignals.schemaTypesPresent,
        email: seo?.businessInfo?.email,
        address: seo?.businessInfo?.address,
        businessType: seo?.businessInfo?.businessType,
        aiVisibilityScore: seo?.aiVisibilityScore,
        seoScore: seo?.seoScore,
        issues: seo?.issues,
      });
      
      if (aiResult.success) {
        ai = aiResult.recommendations;
        console.log(`✅ AI recommendations generated successfully`);
      } else {
        console.error(`⚠️ AI recommendations failed: ${aiResult.error}`);
        // Continue without AI - user still gets SEO value
      }
    } catch (e: any) {
      console.error("❌ AI step failed:", String(e));
      // Continue - return SEO so user still gets value
    }

    // Set email cooldown to prevent rapid-fire requests
    setEmailCooldown(ehash);

    const result: ScanResultV1 = {
      cost: 0,
      remainingCredits: 0,
      analysis: seo,
      ai: ai || {
        version: "1.0",
        summary: "SEO analysis completed successfully. AI recommendations temporarily unavailable.",
        prioritised_actions: [],
        schema_recommendations: [],
        notes: ["Please try again later for AI-powered recommendations."]
      },
    };

    console.log(`🎉 Free scan complete in ${Date.now() - start}ms`);
    return res.json(result);

  } catch (err: any) {
    console.error("❌ Free scan crashed:", { err: String(err), stack: err.stack });
    return res.status(500).json({ error: "Scan failed. Please try again." });
  } finally {
    // Always decrement scan counter
    decrementScanCount();
  }
});

export default router;