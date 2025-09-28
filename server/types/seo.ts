// types/seo.ts
export type SEOAnalysisV2 = {
  url: string;
  fetchedAt: string;
  http: { status: number; finalUrl: string; redirected: boolean; https: boolean };
  indexability: { robotsTxtFound: boolean; robotsMeta: string[]; canonical: string | null; noindex: boolean; };
  meta: { title: { text: string; length: number }; description: { text: string; length: number } };
  headings: { h1: string[]; h2: string[] };
  links: { internal: number; external: number; nofollow: number };
  images: { total: number; missingAlt: number };
  social: { openGraphCount: number; twitterCount: number; sameAs: string[] };
  schema: { blocks: number; types: string[]; hasOrganization: boolean; hasWebSite: boolean; hasLocalBusiness: boolean; hasBreadcrumb: boolean; };
  sitemaps: { found: string[] };
  performance: { totalBytesKB: number; reqCount: number }; // simple proxy; we can upgrade later
  issues: string[]; // human-readable flags (e.g., "Missing meta description", "Multiple H1s")
  
  // Enhanced analysis from original system
  aiVisibilityScore: number;
  aiVisibilityBand: 'excellent' | 'good' | 'moderate' | 'poor';
  aiVisibilityNotes: string[];
  seoScore: number;
  seoNotes: string[];
  seoImpact: string[];
  
  // Detailed business data for AI
  businessInfo: {
    phone?: string;
    email?: string;
    address?: string;
    hours?: string;
    logo?: string;
    businessType?: string;
  };
};