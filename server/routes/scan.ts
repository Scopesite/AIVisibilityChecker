import { Router } from 'express';
import { collectSEO } from '../lib/seoCollector';
import { generateAIRecommendations } from '../services/openai';
import { getBalance, consumeCredits } from '../credits';
import type { ScanResultV1 } from '../types/scan';
import { isAuthenticated } from '../replitAuth';

const router = Router();
// Use existing storage instance

router.post('/scan', async (req, res, next) => {
  try {
    const { url, email } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Check if user is authenticated (paid scan) or this is a free scan
    const user = req.user as any;
    const isAuthenticated = req.isAuthenticated() || !!user?.claims;
    
    if (isAuthenticated) {
      // PAID SCAN: User is logged in - use credits
      const userId = user?.claims?.sub || user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userCredits = await getBalance(userId);
      if (userCredits < 1) {
        return res.status(402).json({ error: 'Insufficient credits' });
      }

      // Deduct credit
      const jobId = `scan_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const creditResult = await consumeCredits(userId, jobId);
      if (!creditResult.success) {
        return res.status(402).json({ error: creditResult.error || 'Failed to deduct credits' });
      }
      
      console.log(`💳 PAID SCAN: User ${userId} used 1 credit for ${url}`);
    } else {
      // FREE SCAN: No authentication required, but need email
      if (!email) {
        return res.status(400).json({ error: 'Email is required for free scans' });
      }
      
      console.log(`🆓 FREE SCAN: ${email} scanning ${url}`);
    }

    // Collect comprehensive SEO analysis
    console.log('🔍 Starting comprehensive SEO analysis for:', url);
    const seo = await collectSEO(url);
    console.log('✅ SEO analysis complete. Score:', seo.aiVisibilityScore, 'Band:', seo.aiVisibilityBand);

    // Generate AI recommendations using rich SEO data
    console.log('🤖 Generating AI recommendations with comprehensive data...');
    const aiResult = await generateAIRecommendations(url, {
      title: seo.meta.title.text,
      metaDescription: seo.meta.description.text,
      h1: seo.headings.h1,
      logo: seo.businessInfo.logo,
      phone: seo.businessInfo.phone,
      sameAs: seo.social.sameAs,
      hasOrganizationSchema: seo.schema.hasOrganization,
      hasWebSiteSchema: seo.schema.hasWebSite,
      hasLocalBusinessSchema: seo.schema.hasLocalBusiness,
      hasBreadcrumbSchema: seo.schema.hasBreadcrumb,
      existingSchemaTypes: seo.schema.types,
      // Pass rich analysis data to AI
      email: seo.businessInfo.email,
      address: seo.businessInfo.address,
      businessType: seo.businessInfo.businessType,
      aiVisibilityScore: seo.aiVisibilityScore,
      seoScore: seo.seoScore,
      issues: seo.issues,
    });

    if (!aiResult.success) {
      console.error('❌ AI recommendations failed:', aiResult.error);
      
      // Return 502 for AI parsing/validation errors, 500 for other failures
      const is502Error = aiResult.error?.includes('AI returned invalid JSON') ||
                         aiResult.error?.includes('AI response does not match expected format');
      
      const statusCode = is502Error ? 502 : 500;
      return res.status(statusCode).json({ error: aiResult.error });
    }

    console.log('✅ AI recommendations generated successfully');

    // Get remaining credits (only for paid scans)
    let remainingCredits = 0;
    let scanCost = 0;
    
    if (isAuthenticated) {
      // For paid scans, we need to get the actual remaining credits
      const userId = user?.claims?.sub || user?.id;
      remainingCredits = await getBalance(userId);
      scanCost = 1;
    }

    // Combine results - using 'analysis' key to match frontend expectations
    const result: ScanResultV1 = {
      cost: scanCost,
      remainingCredits,
      analysis: seo,
      ai: aiResult.recommendations!,
    };

    console.log('🎉 Combined scan complete - returning comprehensive analysis');
    return res.json(result);

  } catch (error) {
    console.error('❌ Scan endpoint error:', error);
    next(error);
  }
});

export default router;