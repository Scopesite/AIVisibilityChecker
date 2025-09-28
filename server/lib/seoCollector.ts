import * as cheerio from "cheerio";
import { URL } from "url";
import type { SEOAnalysisV2 } from "../types/seo";
import { scoreVisibility, scoreSeoElements } from "../scoring";
import { analyzeSchemas, extractSchemaTypes } from "../utils/schema-utils";
import { secureUrlFetch } from "../urlSecurity";

// Map scorer band values to UI-compatible labels
function mapBandToUILabel(band: 'red' | 'amber' | 'green'): 'excellent' | 'good' | 'moderate' | 'poor' {
  switch (band) {
    case 'green': return 'excellent';
    case 'amber': return 'moderate';
    case 'red': return 'poor';
    default: return 'poor';
  }
}

function normalizeUrl(url: string): string {
  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

export async function collectSEO(url: string): Promise<SEOAnalysisV2> {
  const normalizedUrl = normalizeUrl(url);
  console.log(`🔍 Starting SEO collection for: ${normalizedUrl} (original: ${url})`);
  
  const res = await secureUrlFetch(normalizedUrl, { 
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 15000, // 15 second timeout
    maxSize: 2 * 1024 * 1024 // 2MB max response size
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const status = res.status;
  const finalUrl = res.url || url;
  const https = finalUrl.startsWith("https://");
  
  // **META ANALYSIS**
  const titleText = $("title").first().text().trim();
  const metaDesc = $('meta[name="description"]').attr("content")?.trim() ?? "";
  
  // **HEADING ANALYSIS** 
  const h1 = $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h2 = $("h2").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  
  // **LINK ANALYSIS**
  const anchors = $("a[href]");
  const internal = anchors.filter((_, a) => {
    const href = $(a).attr("href");
    return Boolean(href && (href.startsWith("/") || href.includes(new URL(finalUrl).hostname)));
  }).length;
  const external = anchors.length - internal;
  const nofollow = $('a[rel~="nofollow"]').length;
  
  // **IMAGE ANALYSIS**
  const imgs = $("img");
  const missingAlt = imgs.filter((_, i) => !$(i).attr("alt")?.trim()).length;
  
  // **SOCIAL MEDIA ANALYSIS**
  const og = $('meta[property^="og:"]').length;
  const tw = $('meta[name^="twitter:"]').length;
  const sameAs = $('a[href^="https://"]').map((_, a) => $(a).attr("href")!).get()
    .filter(u => /(facebook|instagram|linkedin|twitter|x\.com|youtube|tiktok|pinterest|threads)/i.test(u))
    .slice(0, 10);

  // **SCHEMA ANALYSIS - ENHANCED**
  const ldBlocks = $('script[type="application/ld+json"]').map((_, s) => {
    try {
      const content = $(s).text().trim();
      if (!content) return null;
      return JSON.parse(content);
    } catch {
      return null;
    }
  }).get().filter(Boolean);

  const schemaAnalysis = analyzeSchemas(ldBlocks);
  const types = schemaAnalysis.types;
  
  // **BUSINESS INFO EXTRACTION**
  const businessInfo = extractBusinessInfo($, ldBlocks);
  
  // **INDEXABILITY ANALYSIS**
  const robotsMeta = $('meta[name="robots"]').attr("content")?.split(",").map(s=>s.trim()) ?? [];
  const canonical = $('link[rel="canonical"]').attr("href") ?? null;
  
  // **PERFORMANCE PROXY**
  const bytes = Buffer.byteLength(html, "utf8") / 1024;
  const reqCount = $("link,script,img").length + 1;

  // **ISSUES DETECTION**
  const issues: string[] = [];
  if (!titleText) issues.push("Missing title");
  if (!metaDesc) issues.push("Missing meta description");
  if (h1.length === 0) issues.push("No H1 found");
  if (h1.length > 1) issues.push(`Multiple H1s: ${h1.length}`);
  if (missingAlt > 0) issues.push(`Images missing alt: ${missingAlt}`);
  if (robotsMeta.includes("noindex")) issues.push("Page marked noindex");
  if (!canonical) issues.push("Missing canonical");
  if (og === 0) issues.push("Missing Open Graph tags");
  if (types.length === 0) issues.push("No structured data found");

  // **ENHANCED SCORING USING ORIGINAL SYSTEM**
  // Create SdItem format for original scoring system
  const sdItems = ldBlocks.map(block => ({
    types: extractRawTypes(block),
    errors: [], // We'll assume no errors for now
    warnings: [],
    raw: block
  }));

  const visibilityScore = scoreVisibility(sdItems);
  
  // Create SEO data format for original scoring
  const seoData = {
    meta_title: titleText,
    meta_title_length: titleText.length,
    meta_description: metaDesc,
    meta_description_length: metaDesc.length,
    h1_count: h1.length,
    h1_text: h1.join(", "),
    h2_count: h2.length,
    og_title: $('meta[property="og:title"]').attr("content") ?? null,
    og_description: $('meta[property="og:description"]').attr("content") ?? null,
    og_image: $('meta[property="og:image"]').attr("content") ?? null,
    twitter_card: $('meta[name="twitter:card"]').attr("content") ?? null,
    twitter_title: $('meta[name="twitter:title"]').attr("content") ?? null,
    twitter_description: $('meta[name="twitter:description"]').attr("content") ?? null,
    twitter_image: $('meta[name="twitter:image"]').attr("content") ?? null,
    canonical_url: canonical,
    robots_meta: robotsMeta.join(", "),
    images_total: imgs.length,
    images_missing_alt: missingAlt,
    internal_links: internal,
    external_links: external,
    nofollow_links: nofollow,
    estimated_load_time: bytes > 1000 ? 4.0 : bytes > 500 ? 3.0 : 2.0, // Simple estimate
    render_blocking_resources: $('script').length,
    css_files_count: $('link[rel="stylesheet"]').length,
    js_files_count: $('script[src]').length,
  };

  const seoScore = scoreSeoElements(seoData);

  return {
    url: finalUrl,
    fetchedAt: new Date().toISOString(),
    http: { status, finalUrl, redirected: finalUrl !== url, https },
    indexability: { robotsTxtFound: false, robotsMeta, canonical, noindex: robotsMeta.includes("noindex") },
    meta: { 
      title: { text: titleText, length: titleText.length }, 
      description: { text: metaDesc, length: metaDesc.length } 
    },
    headings: { h1, h2 },
    links: { internal, external, nofollow },
    images: { total: imgs.length, missingAlt },
    social: { openGraphCount: og, twitterCount: tw, sameAs },
    schema: { 
      blocks: ldBlocks.length, 
      types,
      hasOrganization: schemaAnalysis.hasOrganization,
      hasWebSite: schemaAnalysis.hasWebSite,
      hasLocalBusiness: types.includes('LocalBusiness'),
      hasBreadcrumb: schemaAnalysis.hasBreadcrumb,
    },
    sitemaps: { found: [] }, // TODO: Add sitemap detection
    performance: { totalBytesKB: Math.round(bytes), reqCount },
    issues,
    
    // Enhanced analysis from original system
    aiVisibilityScore: visibilityScore.score,
    aiVisibilityBand: mapBandToUILabel(visibilityScore.band),
    aiVisibilityNotes: visibilityScore.notes,
    seoScore: seoScore.score,
    seoNotes: seoScore.notes,
    seoImpact: seoScore.aiVisibilityImpact,
    
    // Business data for AI
    businessInfo,
  };
}

function extractRawTypes(jsonLd: any): string[] {
  if (!jsonLd || !jsonLd['@type']) return [];
  const types = Array.isArray(jsonLd['@type']) ? jsonLd['@type'] : [jsonLd['@type']];
  return types.filter((t: any) => typeof t === 'string');
}

function extractBusinessInfo($: cheerio.CheerioAPI, ldBlocks: any[]): SEOAnalysisV2['businessInfo'] {
  const info: SEOAnalysisV2['businessInfo'] = {};
  
  // Extract from JSON-LD
  for (const block of ldBlocks) {
    if (block['@type'] === 'Organization' || block['@type'] === 'LocalBusiness') {
      if (block.telephone) info.phone = block.telephone;
      if (block.email) info.email = block.email;
      if (block.address) {
        info.address = typeof block.address === 'string' ? block.address : 
          block.address.streetAddress || JSON.stringify(block.address);
      }
      if (block.openingHours) info.hours = JSON.stringify(block.openingHours);
      if (block.logo) info.logo = block.logo.url || block.logo;
      if (block['@type']) info.businessType = block['@type'];
    }
  }
  
  // Extract from HTML fallback
  if (!info.phone) {
    const phoneText = $('body').text().match(/(\+?[\d\s\-\(\)]{10,})/)?.[0];
    if (phoneText) info.phone = phoneText.trim();
  }
  
  if (!info.email) {
    const emailMatch = $('body').text().match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[0];
    if (emailMatch) info.email = emailMatch;
  }
  
  if (!info.logo) {
    const logo = $('img[alt*="logo" i], img[class*="logo" i]').first().attr('src');
    if (logo) info.logo = logo;
  }
  
  return info;
}