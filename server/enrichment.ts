/**
 * BuiltWith Free API Integration with 24h Caching
 * Technology stack detection and enrichment
 */

// Simple 24h in-memory cache (use Redis in production)
const cache = new Map<string, { data: any; expires: number }>();

// Rate limiting for BuiltWith API (1 request per second)
let lastApiCall = 0;

async function throttleBuiltWithRequest() {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  
  if (timeSinceLastCall < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastCall));
  }
  
  lastApiCall = Date.now();
}

export interface TechEnrichment {
  groups: { name: string; live: number; dead: number }[];
  categories: { name: string; live: number; dead: number }[];
  techGuess: string[];
  tips: string[];
  source: "builtwith" | "heuristics" | "none";
}

/**
 * Get technology enrichment data from BuiltWith API with fallback to heuristics
 */
export async function getTechEnrichment(domain: string, html?: string): Promise<TechEnrichment> {
  const cacheKey = `builtwith:${domain}`;
  const now = Date.now();
  
  // Check cache first (24h TTL)
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > now) {
    console.log(`🎯 BuiltWith cache hit for ${domain}`);
    return cached.data;
  }
  
  // Try BuiltWith API first
  const builtWithData = await getBuiltWithData(domain);
  
  // Only use BuiltWith data if it actually contains technology information
  const hasBuiltWithData = builtWithData.source === "builtwith" && 
    (builtWithData.groups.length > 0 || builtWithData.categories.length > 0 || builtWithData.techGuess.length > 0);
  
  if (hasBuiltWithData) {
    // Cache successful BuiltWith response for 24h
    cache.set(cacheKey, {
      data: builtWithData,
      expires: now + (24 * 60 * 60 * 1000) // 24 hours
    });
    console.log(`✅ BuiltWith API success for ${domain} with ${builtWithData.groups.length} groups`);
    return builtWithData;
  }
  
  // Fallback to heuristic detection when BuiltWith has no useful data
  console.log(`🔄 BuiltWith returned empty data for ${domain}, falling back to heuristics`);
  const heuristicData = await getHeuristicTechDetection(domain, html);
  
  // Cache heuristic results for shorter time (4h)
  cache.set(cacheKey, {
    data: heuristicData,
    expires: now + (4 * 60 * 60 * 1000) // 4 hours
  });
  
  console.log(`🔍 Heuristic fallback used for ${domain}`);
  return heuristicData;
}

/**
 * Call BuiltWith Free API with proper error handling
 */
async function getBuiltWithData(domain: string): Promise<TechEnrichment> {
  const apiKey = process.env.BUILTWITH_API_KEY;
  
  if (!apiKey) {
    console.log("⚠️ BuiltWith API key not configured");
    return { groups: [], categories: [], techGuess: [], tips: [], source: "none" };
  }
  
  try {
    await throttleBuiltWithRequest();
    
    const url = `https://api.builtwith.com/free1/api.json?KEY=${encodeURIComponent(apiKey)}&LOOKUP=${encodeURIComponent(domain)}`;
    
    const response = await fetch(url, {
      timeout: 12000,
      headers: {
        'User-Agent': 'VOICE-Scanner/1.0'
      }
    } as any);
    
    if (!response.ok) {
      console.error(`❌ BuiltWith API error: ${response.status} ${response.statusText}`);
      return { groups: [], categories: [], techGuess: [], tips: [], source: "none" };
    }
    
    const data = await response.json();
    console.log(`🔍 BuiltWith raw response for ${domain}:`, JSON.stringify(data).substring(0, 300) + '...');
    const enrichment = normalizeBuiltWithResponse(data);
    
    return {
      ...enrichment,
      tips: generateTechTips(enrichment.techGuess),
      source: "builtwith"
    };
    
  } catch (error) {
    console.error(`❌ BuiltWith API failed for ${domain}:`, error);
    return { groups: [], categories: [], techGuess: [], tips: [], source: "none" };
  }
}

/**
 * Normalize BuiltWith API response format
 */
function normalizeBuiltWithResponse(data: any): Omit<TechEnrichment, 'tips' | 'source'> {
  const groups: TechEnrichment['groups'] = [];
  const categories: TechEnrichment['categories'] = [];
  const techGuess: string[] = [];
  
  try {
    // BuiltWith Free API response format: { domain: "...", groups: [...] }
    if (!data || !Array.isArray(data.groups)) {
      console.log("⚠️ No groups in BuiltWith response", data ? Object.keys(data) : 'no data');
      return { groups, categories, techGuess };
    }
    
    console.log(`🔍 Processing ${data.groups.length} BuiltWith groups for ${data.domain}`);
    
    // Process Groups
    for (const group of data.groups) {
      const groupName = String(group.name || "").toLowerCase();
      if (groupName) {
        groups.push({
          name: groupName,
          live: parseInt(group.live || 0),
          dead: parseInt(group.dead || 0)
        });
        
        // Extract tech names for heuristic guessing based on group names
        if (groupName.includes('content') || groupName.includes('cms')) {
          techGuess.push('CMS');
        }
        if (groupName.includes('javascript') || groupName.includes('framework')) {
          techGuess.push('JavaScript Framework');
        }
        if (groupName.includes('analytics')) {
          techGuess.push('Analytics');
        }
        if (groupName.includes('payment')) {
          techGuess.push('E-commerce');
        }
        if (groupName.includes('hosting') || groupName.includes('cdn')) {
          techGuess.push('Hosting/CDN');
        }
        
        // Process Categories within each Group
        if (Array.isArray(group.categories)) {
          for (const category of group.categories) {
            const categoryName = String(category.name || "").toLowerCase();
            if (categoryName) {
              categories.push({
                name: categoryName,
                live: parseInt(category.live || 0),
                dead: parseInt(category.dead || 0)
              });
              
              // More specific tech detection from categories
              if (categoryName.includes('wordpress')) techGuess.push('WordPress');
              if (categoryName.includes('shopify')) techGuess.push('Shopify');
              if (categoryName.includes('react')) techGuess.push('React');
              if (categoryName.includes('google analytics')) techGuess.push('Google Analytics');
              if (categoryName.includes('stripe')) techGuess.push('Stripe');
              if (categoryName.includes('cloudflare')) techGuess.push('Cloudflare');
              if (categoryName.includes('jquery')) techGuess.push('jQuery');
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Error normalizing BuiltWith response:", error);
  }
  
  return { groups, categories, techGuess: Array.from(new Set(techGuess)) };
}

/**
 * Fallback heuristic technology detection from HTML
 */
async function getHeuristicTechDetection(domain: string, html?: string): Promise<TechEnrichment> {
  const techGuess: string[] = [];
  
  if (!html) {
    console.log(`⚠️ No HTML provided for heuristic detection of ${domain}`);
    return { groups: [], categories: [], techGuess, tips: [], source: "heuristics" };
  }
  
  const htmlLower = html.toLowerCase();
  
  // WordPress detection
  if (htmlLower.includes('wp-content') || htmlLower.includes('wp-includes') || htmlLower.includes('wordpress')) {
    techGuess.push('WordPress');
  }
  
  // React detection
  if (htmlLower.includes('react') || htmlLower.includes('__react') || htmlLower.includes('data-reactroot')) {
    techGuess.push('React');
  }
  
  // Shopify detection
  if (htmlLower.includes('shopify') || htmlLower.includes('cdn.shopify.com')) {
    techGuess.push('Shopify');
  }
  
  // Analytics detection
  if (htmlLower.includes('google-analytics') || htmlLower.includes('gtag') || htmlLower.includes('ga.js')) {
    techGuess.push('Google Analytics');
  }
  
  // jQuery detection
  if (htmlLower.includes('jquery') || htmlLower.includes('jquery.min.js')) {
    techGuess.push('jQuery');
  }
  
  // Bootstrap detection
  if (htmlLower.includes('bootstrap') || htmlLower.includes('cdn.jsdelivr.net/npm/bootstrap')) {
    techGuess.push('Bootstrap');
  }
  
  // Wix detection
  if (htmlLower.includes('wix.com') || htmlLower.includes('_wix') || domain.includes('wixsite.com')) {
    techGuess.push('Wix');
  }
  
  // Next.js detection
  if (htmlLower.includes('next.js') || htmlLower.includes('__next') || htmlLower.includes('_next/static')) {
    techGuess.push('Next.js');
  }
  
  const tips = generateTechTips(techGuess);
  
  return {
    groups: techGuess.map(tech => ({ name: tech.toLowerCase(), live: 1, dead: 0 })),
    categories: [],
    techGuess,
    tips,
    source: "heuristics"
  };
}

/**
 * Generate platform-specific optimization tips
 */
function generateTechTips(techStack: string[]): string[] {
  const tips: string[] = [];
  
  // WordPress-specific tips
  if (techStack.some(tech => tech.toLowerCase().includes('wordpress'))) {
    tips.push("Consider optimizing WordPress database queries and enable caching for better AI crawling performance");
    tips.push("Review JSON-LD schema - WordPress plugins often create duplicate structured data");
  }
  
  // Shopify-specific tips
  if (techStack.some(tech => tech.toLowerCase().includes('shopify'))) {
    tips.push("Defer non-critical Shopify app scripts to improve Core Web Vitals scores");
    tips.push("Optimize Shopify product schema markup for better AI product understanding");
  }
  
  // React/SPA tips
  if (techStack.some(tech => tech.toLowerCase().includes('react') || tech.toLowerCase().includes('next'))) {
    tips.push("Ensure server-side rendering (SSR) for critical content that AI crawlers need to access");
    tips.push("Implement proper meta tags and structured data for dynamic content");
  }
  
  // Analytics tips
  if (techStack.some(tech => tech.toLowerCase().includes('analytics'))) {
    tips.push("Review analytics script loading to prevent blocking critical content rendering");
  }
  
  // General performance tips
  if (techStack.length > 3) {
    tips.push("Consider reducing the number of third-party scripts to improve page load times");
  }
  
  // Wix-specific tips
  if (techStack.some(tech => tech.toLowerCase().includes('wix'))) {
    tips.push("Optimize Wix SEO settings and consider upgrading to remove Wix branding for better AI perception");
  }
  
  return tips.slice(0, 3); // Limit to 3 most relevant tips
}

/**
 * Clean expired cache entries (called periodically)
 */
export function cleanExpiredCache() {
  const now = Date.now();
  let cleaned = 0;
  
  Array.from(cache.entries()).forEach(([key, value]) => {
    if (value.expires <= now) {
      cache.delete(key);
      cleaned++;
    }
  });
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
  }
}

// Clean cache every hour
setInterval(cleanExpiredCache, 60 * 60 * 1000);