import fetch from "node-fetch";
import * as cheerio from 'cheerio';
import { validateUrl, SSRFError } from "../urlSecurity";

export interface MetaTag {
  name: string;
  property: string;
  content: string;
  present: boolean;
  suggested?: string;
  critical: boolean;
}

export interface MetaTagsAnalysis {
  url: string;
  openGraph: {
    title: MetaTag;
    description: MetaTag;
    image: MetaTag;
    url: MetaTag;
    type: MetaTag;
    siteName: MetaTag;
  };
  twitter: {
    card: MetaTag;
    title: MetaTag;
    description: MetaTag;
    image: MetaTag;
    site: MetaTag;
    creator: MetaTag;
  };
  canonical: MetaTag;
  basic: {
    title: string;
    description: string;
    h1: string[];
    images: string[];
    siteName: string;
  };
  suggestions: {
    html: string[];
    missing: string[];
  };
}

export async function analyzeMetaTags(url: string): Promise<MetaTagsAnalysis> {
  console.log(`🔍 Meta Tags Analysis for: ${url}`);
  
  try {
    // Fetch the HTML content
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    return parseMetaTags(html, url);
    
  } catch (error) {
    console.warn(`Failed to fetch meta tags from ${url}:`, error);
    // Return empty analysis on error
    return createEmptyAnalysis(url);
  }
}

function parseMetaTags(html: string, url: string): MetaTagsAnalysis {
  const $ = cheerio.load(html);
  
  // Extract basic page data
  const title = $('title').text().trim() || '';
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
  const h1Elements = $('h1').map((_, el) => $(el).text().trim()).get().filter(text => text.length > 0);
  const images = $('img[src]').map((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      return src.startsWith('http') ? src : new URL(src, url).toString();
    }
    return '';
  }).get().filter(src => src.length > 0);
  
  // Try to determine site name from various sources
  const siteName = $('meta[property="og:site_name"]').attr('content') ||
                   $('meta[name="application-name"]').attr('content') ||
                   $('meta[name="apple-mobile-web-app-title"]').attr('content') ||
                   title.split(' | ').pop() ||
                   title.split(' - ').pop() ||
                   new URL(url).hostname.replace('www.', '');
  
  // Extract existing Open Graph tags
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || '';
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || '';
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim() || '';
  const ogUrl = $('meta[property="og:url"]').attr('content')?.trim() || '';
  const ogType = $('meta[property="og:type"]').attr('content')?.trim() || '';
  const ogSiteName = $('meta[property="og:site_name"]').attr('content')?.trim() || '';
  
  // Extract existing Twitter Card tags
  const twitterCard = $('meta[name="twitter:card"]').attr('content')?.trim() || '';
  const twitterTitle = $('meta[name="twitter:title"]').attr('content')?.trim() || '';
  const twitterDescription = $('meta[name="twitter:description"]').attr('content')?.trim() || '';
  const twitterImage = $('meta[name="twitter:image"]').attr('content')?.trim() || '';
  const twitterSite = $('meta[name="twitter:site"]').attr('content')?.trim() || '';
  const twitterCreator = $('meta[name="twitter:creator"]').attr('content')?.trim() || '';
  
  // Extract existing canonical tag
  const canonicalHref = $('link[rel="canonical"]').attr('href')?.trim() || '';
  
  // Generate suggestions based on available content
  const suggestedTitle = ogTitle || title || h1Elements[0] || 'Page Title';
  const suggestedDescription = ogDescription || metaDescription || 
    (h1Elements.length > 1 ? h1Elements.slice(1).join(' - ') : 'Page description') || 
    'Discover our content and services';
  const suggestedImage = ogImage || images[0] || '';
  const suggestedUrl = ogUrl || url;
  
  // Generate canonical URL suggestion (normalize the final resolved URL)
  const suggestedCanonical = canonicalHref || normalizeUrl(url);
  
  // Build analysis object
  const analysis: MetaTagsAnalysis = {
    url,
    openGraph: {
      title: {
        name: 'og:title',
        property: 'og:title',
        content: ogTitle,
        present: !!ogTitle,
        suggested: suggestedTitle,
        critical: true
      },
      description: {
        name: 'og:description',
        property: 'og:description', 
        content: ogDescription,
        present: !!ogDescription,
        suggested: suggestedDescription,
        critical: true
      },
      image: {
        name: 'og:image',
        property: 'og:image',
        content: ogImage,
        present: !!ogImage,
        suggested: suggestedImage,
        critical: true
      },
      url: {
        name: 'og:url',
        property: 'og:url',
        content: ogUrl,
        present: !!ogUrl,
        suggested: suggestedUrl,
        critical: true
      },
      type: {
        name: 'og:type',
        property: 'og:type',
        content: ogType,
        present: !!ogType,
        suggested: 'website',
        critical: false
      },
      siteName: {
        name: 'og:site_name',
        property: 'og:site_name',
        content: ogSiteName,
        present: !!ogSiteName,
        suggested: siteName,
        critical: false
      }
    },
    twitter: {
      card: {
        name: 'twitter:card',
        property: 'twitter:card',
        content: twitterCard,
        present: !!twitterCard,
        suggested: 'summary_large_image',
        critical: true
      },
      title: {
        name: 'twitter:title',
        property: 'twitter:title',
        content: twitterTitle,
        present: !!twitterTitle,
        suggested: suggestedTitle,
        critical: true
      },
      description: {
        name: 'twitter:description',
        property: 'twitter:description',
        content: twitterDescription,
        present: !!twitterDescription,
        suggested: suggestedDescription,
        critical: true
      },
      image: {
        name: 'twitter:image',
        property: 'twitter:image',
        content: twitterImage,
        present: !!twitterImage,
        suggested: suggestedImage,
        critical: true
      },
      site: {
        name: 'twitter:site',
        property: 'twitter:site',
        content: twitterSite,
        present: !!twitterSite,
        suggested: '',
        critical: false
      },
      creator: {
        name: 'twitter:creator',
        property: 'twitter:creator',
        content: twitterCreator,
        present: !!twitterCreator,
        suggested: '',
        critical: false
      }
    },
    canonical: {
      name: 'canonical',
      property: 'canonical',
      content: canonicalHref,
      present: !!canonicalHref,
      suggested: suggestedCanonical,
      critical: true
    },
    basic: {
      title,
      description: metaDescription,
      h1: h1Elements,
      images,
      siteName
    },
    suggestions: {
      html: [],
      missing: []
    }
  };
  
  // Generate HTML suggestions and missing tags list
  const htmlSuggestions: string[] = [];
  const missingTags: string[] = [];
  
  // Open Graph suggestions
  Object.entries(analysis.openGraph).forEach(([key, tag]) => {
    if (!tag.present && tag.suggested) {
      const htmlTag = `<meta property="${tag.property}" content="${escapeHtml(tag.suggested)}" />`;
      htmlSuggestions.push(htmlTag);
      missingTags.push(tag.property);
    }
  });
  
  // Twitter Card suggestions
  Object.entries(analysis.twitter).forEach(([key, tag]) => {
    if (!tag.present && tag.suggested) {
      const htmlTag = `<meta name="${tag.name}" content="${escapeHtml(tag.suggested)}" />`;
      htmlSuggestions.push(htmlTag);
      missingTags.push(tag.name);
    }
  });
  
  // Canonical tag suggestion
  if (!analysis.canonical.present && analysis.canonical.suggested) {
    const htmlTag = `<link rel="canonical" href="${escapeHtml(analysis.canonical.suggested)}" />`;
    htmlSuggestions.push(htmlTag);
    missingTags.push('canonical');
  }
  
  analysis.suggestions.html = htmlSuggestions;
  analysis.suggestions.missing = missingTags;
  
  console.log(`📊 Meta Tags Analysis complete: ${missingTags.length} missing critical tags`);
  
  return analysis;
}

function createEmptyAnalysis(url: string): MetaTagsAnalysis {
  return {
    url,
    openGraph: {
      title: { name: 'og:title', property: 'og:title', content: '', present: false, suggested: 'Page Title', critical: true },
      description: { name: 'og:description', property: 'og:description', content: '', present: false, suggested: 'Page description', critical: true },
      image: { name: 'og:image', property: 'og:image', content: '', present: false, suggested: '', critical: true },
      url: { name: 'og:url', property: 'og:url', content: '', present: false, suggested: url, critical: true },
      type: { name: 'og:type', property: 'og:type', content: '', present: false, suggested: 'website', critical: false },
      siteName: { name: 'og:site_name', property: 'og:site_name', content: '', present: false, suggested: new URL(url).hostname, critical: false }
    },
    twitter: {
      card: { name: 'twitter:card', property: 'twitter:card', content: '', present: false, suggested: 'summary_large_image', critical: true },
      title: { name: 'twitter:title', property: 'twitter:title', content: '', present: false, suggested: 'Page Title', critical: true },
      description: { name: 'twitter:description', property: 'twitter:description', content: '', present: false, suggested: 'Page description', critical: true },
      image: { name: 'twitter:image', property: 'twitter:image', content: '', present: false, suggested: '', critical: true },
      site: { name: 'twitter:site', property: 'twitter:site', content: '', present: false, suggested: '', critical: false },
      creator: { name: 'twitter:creator', property: 'twitter:creator', content: '', present: false, suggested: '', critical: false }
    },
    basic: {
      title: '',
      description: '',
      h1: [],
      images: [],
      siteName: new URL(url).hostname
    },
    canonical: { name: 'canonical', property: 'canonical', content: '', present: false, suggested: normalizeUrl(url), critical: true },
    suggestions: {
      html: [],
      missing: ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'canonical']
    }
  };
}

function escapeHtml(text: string): string {
  const div = cheerio.load('<div>').root();
  return div.text(text).html() || '';
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove trailing slash unless it's the root path
    const pathname = urlObj.pathname === '/' ? '/' : urlObj.pathname.replace(/\/$/, '');
    // Normalize to https if possible (most modern sites prefer https)
    const protocol = urlObj.protocol === 'http:' && urlObj.hostname !== 'localhost' ? 'https:' : urlObj.protocol;
    return `${protocol}//${urlObj.hostname}${pathname}${urlObj.search}`;
  } catch (error) {
    return url;
  }
}