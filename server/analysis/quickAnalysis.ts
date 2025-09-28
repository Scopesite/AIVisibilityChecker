import { chromium } from 'playwright';
import { runSchemaChecks } from '../checks/schema.js';

interface QuickAnalysisResult {
  title?: string;
  metaDescription?: string;
  h1Tags?: string[];
  logo?: string;
  phone?: string;
  socialLinks?: string[];
  hasOrganization?: boolean;
  hasWebSite?: boolean;
  hasLocalBusiness?: boolean;
  hasBreadcrumb?: boolean;
  schemaTypes?: string[];
}

export async function runQuickAnalysis(url: string): Promise<{
  success: boolean;
  data?: QuickAnalysisResult;
  error?: string;
}> {
  let browser;
  
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; VOICEBot/1.0; +https://scopesite.co.uk/voice-scanner)'
    });
    
    const page = await context.newPage();
    
    // Set timeout for page load
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // Extract basic page information
    const pageData = await page.evaluate(() => {
      // Get title
      const title = document.title || '';
      
      // Get meta description
      const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      
      // Get H1 tags
      const h1Elements = Array.from(document.querySelectorAll('h1'));
      const h1Tags = h1Elements.map(h1 => h1.textContent?.trim()).filter(Boolean);
      
      // Look for logo
      let logo = '';
      const logoSelectors = [
        'img[alt*="logo" i]',
        'img[class*="logo" i]',
        'img[id*="logo" i]',
        '.logo img',
        '#logo img',
        'header img:first-of-type'
      ];
      
      for (const selector of logoSelectors) {
        const logoEl = document.querySelector(selector) as HTMLImageElement;
        if (logoEl?.src) {
          logo = logoEl.src;
          break;
        }
      }
      
      // Look for phone number
      let phone = '';
      const phoneSelectors = [
        'a[href^="tel:"]',
        '[class*="phone" i]',
        '[id*="phone" i]'
      ];
      
      for (const selector of phoneSelectors) {
        const phoneEl = document.querySelector(selector);
        if (phoneEl) {
          const phoneText = phoneEl.textContent?.trim() || phoneEl.getAttribute('href')?.replace('tel:', '') || '';
          if (phoneText.match(/[\d\s\-\+\(\)]{10,}/)) {
            phone = phoneText;
            break;
          }
        }
      }
      
      // Look for social media links
      const socialLinks: string[] = [];
      const socialSelectors = [
        'a[href*="facebook.com"]',
        'a[href*="twitter.com"]',
        'a[href*="linkedin.com"]',
        'a[href*="instagram.com"]',
        'a[href*="youtube.com"]'
      ];
      
      socialSelectors.forEach(selector => {
        const links = Array.from(document.querySelectorAll(selector));
        links.forEach(link => {
          const href = (link as HTMLAnchorElement).href;
          if (href && !socialLinks.includes(href)) {
            socialLinks.push(href);
          }
        });
      });
      
      return {
        title,
        metaDescription: metaDesc,
        h1Tags,
        logo,
        phone,
        socialLinks
      };
    });

    // Run schema analysis
    const schemaResult = await runSchemaChecks(page);
    
    await browser.close();

    const result: QuickAnalysisResult = {
      ...pageData,
      h1Tags: pageData.h1Tags.filter((tag): tag is string => Boolean(tag)), // Remove undefined values
      hasOrganization: schemaResult.hasOrganization,
      hasWebSite: schemaResult.hasWebSite,
      hasLocalBusiness: schemaResult.hasLocalBusiness,
      hasBreadcrumb: schemaResult.hasBreadcrumb,
      schemaTypes: schemaResult.types
    };

    return {
      success: true,
      data: result
    };

  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    
    console.error('Quick analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown analysis error'
    };
  }
}
