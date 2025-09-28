import express from 'express';
import { z } from 'zod';
import type { AuthenticatedUser } from '../types/auth.js';
import { isAiSummaryEnabled } from '../env.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
import { generateAIRecommendations } from '../services/openai.js';
import { consumeCredits, getBalance, SCAN_COST } from '../credits.js';
import { generateId } from '../utils.js';
import { storage } from '../storage.js';
import { runQuickAnalysis } from '../analysis/quickAnalysis.js';

const router = express.Router();

// Request validation schema
const AnalyseRequestSchema = z.object({
  url: z.string()
    .min(1, 'URL is required')
    .transform((url) => {
      // Add https:// if no protocol is provided
      if (!/^https?:\/\//i.test(url)) {
        return `https://${url}`;
      }
      return url;
    })
    .refine((url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }, 'Invalid URL format')
});

// POST /api/ai/analyse
router.post('/analyse', async (req, res) => {
  try {
    // Check if AI summary feature is enabled
    if (!isAiSummaryEnabled()) {
      return res.status(503).json({ 
        error: 'AI analysis feature is not available' 
      });
    }

    // Validate request body
    const validation = AnalyseRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        details: validation.error.errors 
      });
    }

    const { url } = validation.data;

    // Check authentication
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.user.claims.sub;
    const email = req.user.email;
    const jobId = generateId();

    // Check current balance
    const currentBalance = await getBalance(userId);
    if (currentBalance < SCAN_COST) {
      return res.status(402).json({ 
        error: 'Insufficient credits',
        required: SCAN_COST,
        available: currentBalance
      });
    }

    // Consume credits atomically
    const creditResult = await consumeCredits(userId, jobId);
    if (!creditResult.success) {
      return res.status(402).json({ 
        error: creditResult.error || 'Failed to consume credits'
      });
    }

    try {
      // Create project record
      const projectId = await storage.insertSchemaAnalysis({
        userId,
        url,
        email: email || req.user.email || 'unknown@example.com', // Fallback email
        jobId
      });

      // Run quick analysis to gather site signals
      const analysisResult = await runQuickAnalysis(url);
      
      if (!analysisResult.success) {
        return res.status(500).json({ 
          error: 'Failed to analyze website',
          details: analysisResult.error
        });
      }

      if (!analysisResult.success || !analysisResult.data) {
        return res.status(500).json({ 
          error: 'Failed to analyze website',
          details: analysisResult.error
        });
      }

      const siteData = analysisResult.data;

      // Prepare site signals for AI analysis
      const siteSignals = {
        title: siteData.title,
        metaDescription: siteData.metaDescription,
        h1: siteData.h1Tags || [],
        logo: siteData.logo,
        phone: siteData.phone,
        sameAs: siteData.socialLinks || [],
        hasOrganizationSchema: siteData.hasOrganization || false,
        hasWebSiteSchema: siteData.hasWebSite || false,
        hasLocalBusinessSchema: siteData.hasLocalBusiness || false,
        hasBreadcrumbSchema: siteData.hasBreadcrumb || false,
        existingSchemaTypes: siteData.schemaTypes || []
      };

      // Generate AI recommendations
      const aiResult = await generateAIRecommendations(url, siteSignals);
      
      if (!aiResult.success) {
        return res.status(502).json({ 
          error: 'Failed to generate AI recommendations',
          details: aiResult.error
        });
      }

      // Store analysis results
      await storage.insertSchemaAnalysis({
        projectId,
        recommendations: aiResult.recommendations!
      });

      // Return successful response
      return res.json({
        recommendations: aiResult.recommendations,
        cost: SCAN_COST,
        remainingCredits: creditResult.remainingBalance
      });

    } catch (analysisError) {
      console.error('Analysis error:', analysisError);
      return res.status(500).json({ 
        error: 'Analysis failed',
        details: analysisError instanceof Error ? analysisError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('AI analyse route error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

export default router;
