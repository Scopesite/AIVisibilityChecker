// scoring.ts
// Define types locally since they're not exported from validator
type SdItem = {
  types: string[];
  errors: any[];
  warnings: any[];
  raw: any;
};

type SeoAnalysis = any; // Define as needed

const T = (s:string)=>s.toLowerCase();
const has = (it:SdItem[],...ts:string[]) => {
  if (!it || !Array.isArray(it) || !ts || ts.length === 0) return false;
  const targetTypes = ts.map(T);
  return it.some(i => i && i.types && Array.isArray(i.types) && i.types.map(T).some((t: string) => targetTypes.includes(t)));
};

export function scoreVisibility(items:SdItem[]){
  let score=0; const notes:string[]=[];
  
  // Basic AI-readable schemas (help AI assistants understand business basics)
  if (has(items,'WebSite')) { score+=3; notes.push('WebSite - AI can identify your site (+3)'); }
  if (has(items,'Organization','LocalBusiness')) { score+=12; notes.push('Organization/LocalBusiness - AI understands your business (+12)'); }
  if (has(items,'PostalAddress')) { score+=3; notes.push('Address - AI knows your location (+3)'); }
  if (has(items,'OpeningHoursSpecification')) { score+=5; notes.push('Hours - AI can tell customers when you\'re open (+5)'); }
  
  // Content schemas (high AI visibility value)
  if (has(items,'FAQPage')) { score+=18; notes.push('FAQ Page - ChatGPT can answer customer questions (+18)'); }
  if (has(items,'HowTo')) { score+=18; notes.push('How-To - AI assistants can guide customers (+18)'); }
  if (has(items,'Article','BlogPosting','NewsArticle')) { score+=15; notes.push('Content - AI understands your expertise (+15)'); }
  
  // Business schemas (critical for AI discovery)
  if (has(items,'Product','Service')) { score+=15; notes.push('Product/Service - AI can recommend your offerings (+15)'); }
  if (has(items,'Review','AggregateRating')) { score+=20; notes.push('Reviews - AI sees your reputation & ratings (+20)'); }
  if (has(items,'Event','Offer')) { score+=15; notes.push('Events/Offers - AI can suggest timely opportunities (+15)'); }
  
  // Advanced AI optimization (premium AI visibility)
  if (has(items,'SpeakableSpecification')) { score+=20; notes.push('Speakable - Optimized for voice AI assistants (+20)'); }
  if (has(items,'SoftwareApplication','WebApplication')) { score+=25; notes.push('Software/App - AI understands your technology (+25)'); }
  if (has(items,'Course','CreativeWork','ProfessionalService')) { score+=22; notes.push('Professional Services - AI recognizes your expertise (+22)'); }
  
  // Navigation schemas (help AI understand site structure)
  if (has(items,'BreadcrumbList')) { score+=12; notes.push('Breadcrumbs - AI can navigate your site structure (+12)'); }
  if (has(items,'SiteNavigationElement')) { score+=10; notes.push('Navigation - AI understands your site organization (+10)'); }
  if (has(items,'SearchAction')) { score+=8; notes.push('Search - AI can find content on your site (+8)'); }

  const err = items.reduce((a,i)=>a+(i.errors?.length || 0),0);
  const warn = items.reduce((a,i)=>a+(i.warnings?.length || 0),0);
  if (items.length>0 && err===0){ score+=15; notes.push('Clean schema - AI can read perfectly (+15)'); }
  else if (err>0){ const p=Math.min(30,err*5); score-=p; notes.push(`${err} schema errors - AI confused (-${p})`); }
  if (items.length>0 && warn===0){ score+=3; notes.push('Optimized schema - No AI reading issues (+3)'); }
  else if (warn>0){ const p=Math.min(10,Math.ceil(warn/3)*3); score-=p; notes.push(`${warn} schema warnings - AI may misunderstand (-${p})`); }

  score=Math.max(0,Math.min(100,score));
  
  // Adjusted thresholds for better lead qualification
  const band=score<=40?'red':score<=70?'amber':'green'; // Professional thresholds: red≤40, amber 41-70, green>70
  return { score, band, notes, err, warn };
}

// **COMPREHENSIVE AI SEO SCORING SYSTEM WITH 7-AREA ANALYSIS**

export function scorePerformance(seoData: SeoAnalysis): { score: number; notes: string[]; aiVisibilityImpact: string[] } {
  let score = 100;
  const notes: string[] = [];
  const aiVisibilityImpact: string[] = [];
  
  // **CRITICAL FIX: Add NaN guards and defaults for all data properties**
  const loadTime = Number(seoData.estimated_load_time) || 3.0; // Default 3s if undefined/NaN
  const blockingResources = Number(seoData.render_blocking_resources) || 3; // Default 3 if undefined/NaN
  const cssFiles = Number(seoData.css_files_count) || 5; // Default 5 if undefined/NaN
  const jsFiles = Number(seoData.js_files_count) || 8; // Default 8 if undefined/NaN
  
  // **CORE WEB VITALS SCORING**
  // Load time impact on AI crawlers
  if (loadTime <= 2.5) {
    score += 0; // Good baseline
    notes.push('Fast loading - Good user experience');
    aiVisibilityImpact.push('🤖 ChatGPT & Perplexity prefer fast sites for real-time data extraction');
  } else if (loadTime <= 4.0) {
    score -= 15;
    notes.push(`Moderate load time (${loadTime}s) - May impact user experience (-15)`);
    aiVisibilityImpact.push('⚠️ AI scrapers (GPTBot, ClaudeBot) may timeout on slow pages');
  } else {
    score -= 30;
    notes.push(`Slow loading (${loadTime}s) - Poor user experience (-30)`);
    aiVisibilityImpact.push('❌ Voice assistants (Siri, Alexa) skip slow-loading content for faster responses');
  }
  
  // Render-blocking resources impact
  if (blockingResources <= 2) {
    notes.push('Minimal render-blocking - Good performance');
  } else if (blockingResources <= 5) {
    score -= 10;
    notes.push(`${blockingResources} render-blocking resources - Affects page speed (-10)`);
    aiVisibilityImpact.push('🔄 Google AI needs fast First Contentful Paint to understand your content priority');
  } else {
    score -= 20;
    notes.push(`${blockingResources} render-blocking resources - Seriously impacts performance (-20)`);
    aiVisibilityImpact.push('🚫 Too many blocking resources prevent AI from quickly accessing your content');
  }
  
  // JavaScript and CSS optimization
  if (cssFiles <= 5 && jsFiles <= 8) {
    notes.push('Well-optimized resources');
  } else {
    const totalFiles = cssFiles + jsFiles;
    const penalty = Math.min(15, Math.floor(Math.max(0, totalFiles - 13) / 2) * 3);
    score -= penalty;
    if (penalty > 0) {
      notes.push(`${totalFiles} total resources - Consider bundling (-${penalty})`);
      aiVisibilityImpact.push('📦 AI assistants work better with optimized, bundled resources');
    }
  }
  
  // **CRITICAL FIX: Ensure score is always a valid number**
  const finalScore = Math.max(0, Math.min(100, Number(score) || 0));
  
  return { 
    score: finalScore, 
    notes,
    aiVisibilityImpact 
  };
}

export function scoreContentStructure(seoData: SeoAnalysis): { score: number; notes: string[]; aiVisibilityImpact: string[] } {
  let score = 100;
  const notes: string[] = [];
  const aiVisibilityImpact: string[] = [];
  
  // **CRITICAL FIX: Add NaN guards and defaults for all data properties**
  const headingHierarchy = Number(seoData.heading_hierarchy_score) || 70; // Default 70 if undefined/NaN
  const wordCount = Number(seoData.word_count) || 500; // Default 500 if undefined/NaN
  const readabilityScore = Number(seoData.readability_score) || 70; // Default 70 if undefined/NaN
  const paragraphCount = Number(seoData.paragraph_count) || 5; // Default 5 if undefined/NaN
  const contentDensity = Number(seoData.content_density) || 50; // Default 50 if undefined/NaN
  
  // **HEADING HIERARCHY ANALYSIS**
  if (headingHierarchy >= 90) {
    notes.push('Perfect heading structure - Clear content hierarchy');
    aiVisibilityImpact.push('✅ AI models use H1-H6 tags to create content summaries and outlines');
  } else if (headingHierarchy >= 70) {
    score -= 10;
    notes.push('Good heading structure with minor issues (-10)');
    aiVisibilityImpact.push('📋 ChatGPT & Gemini can still understand your content structure');
  } else {
    score -= 25;
    notes.push('Poor heading hierarchy - Confuses content structure (-25)');
    aiVisibilityImpact.push('❌ AI assistants struggle to summarize pages with broken heading hierarchy');
  }
  
  // **CONTENT DEPTH & THIN CONTENT ANALYSIS**
  if (wordCount >= 1000) {
    notes.push('Comprehensive content - Good depth for topic coverage');
    aiVisibilityImpact.push('📚 AI models prefer detailed content to provide accurate, comprehensive answers');
  } else if (wordCount >= 500) {
    score -= 5;
    notes.push('Moderate content length - Could expand for better coverage (-5)');
    aiVisibilityImpact.push('📄 Adequate content for basic AI understanding');
  } else if (wordCount >= 300) {
    score -= 15;
    notes.push('Thin content - May not provide enough value (-15)');
    aiVisibilityImpact.push('⚠️ AI assistants may skip thin pages in favor of more detailed sources');
  } else {
    score -= 30;
    notes.push('Very thin content - Insufficient for meaningful analysis (-30)');
    aiVisibilityImpact.push('🚫 AI models rarely reference pages with minimal content');
  }
  
  // **READABILITY FOR AI PROCESSING**
  if (readabilityScore >= 80) {
    notes.push('Excellent readability - Easy for users and AI to understand');
    aiVisibilityImpact.push('🎯 Clear, readable content helps AI provide accurate quotes and summaries');
  } else if (readabilityScore >= 60) {
    score -= 8;
    notes.push('Good readability with room for improvement (-8)');
  } else {
    score -= 15;
    notes.push('Poor readability - Complex sentences may confuse readers (-15)');
    aiVisibilityImpact.push('🔤 AI models struggle with overly complex or poorly structured text');
  }
  
  // **CONTENT STRUCTURE QUALITY**
  if (paragraphCount > 0 && contentDensity > 30 && contentDensity < 100) {
    notes.push('Well-structured paragraphs - Good content organization');
  } else if (contentDensity <= 20) {
    score -= 10;
    notes.push('Very short paragraphs - May appear fragmented (-10)');
  } else if (contentDensity > 150) {
    score -= 10;
    notes.push('Very long paragraphs - May be hard to read (-10)');
    aiVisibilityImpact.push('📝 AI models prefer well-structured paragraphs for context understanding');
  }
  
  // **CRITICAL FIX: Ensure score is always a valid number**
  const finalScore = Math.max(0, Math.min(100, Number(score) || 0));
  
  return { 
    score: finalScore, 
    notes,
    aiVisibilityImpact 
  };
}

export function scoreImageOptimization(seoData: SeoAnalysis): { score: number; notes: string[]; aiVisibilityImpact: string[] } {
  let score = 100;
  const notes: string[] = [];
  const aiVisibilityImpact: string[] = [];
  
  // **CRITICAL FIX: Add NaN guards and defaults for all data properties**
  const imagesTotal = Number(seoData.images_total) || 0;
  const imagesAltPercentage = Number(seoData.images_alt_percentage) || 80; // Default 80% if undefined/NaN
  const imagesWebpCount = Number(seoData.images_webp_count) || 0;
  const imagesLazyLoadingCount = Number(seoData.images_lazy_loading_count) || 0;
  const imagesLargeCount = Number(seoData.images_large_count) || 0;
  
  if (imagesTotal === 0) {
    notes.push('No images found');
    return { score: 80, notes, aiVisibilityImpact: ['📷 Adding relevant images with alt text helps AI understand your content better'] };
  }
  
  // **ALT TEXT COMPREHENSIVE ANALYSIS**
  if (imagesAltPercentage >= 95) {
    notes.push('Excellent image accessibility - Nearly all images have alt text');
    aiVisibilityImpact.push('🖼️ Perfect! AI assistants can describe and reference all your visual content');
  } else if (imagesAltPercentage >= 80) {
    score -= 10;
    notes.push(`Good alt text coverage (${imagesAltPercentage}%) - Minor gaps (-10)`);
    aiVisibilityImpact.push('✅ Most images are AI-readable, but complete coverage would be ideal');
  } else if (imagesAltPercentage >= 50) {
    score -= 20;
    notes.push(`Moderate alt text coverage (${imagesAltPercentage}%) - Needs improvement (-20)`);
    aiVisibilityImpact.push('⚠️ AI models can only understand half your images - missing context opportunities');
  } else {
    score -= 35;
    notes.push(`Poor alt text coverage (${imagesAltPercentage}%) - Major accessibility issue (-35)`);
    aiVisibilityImpact.push('❌ AI assistants cannot describe most of your images to users');
  }
  
  // **MODERN FORMAT OPTIMIZATION**
  const webpRatio = imagesTotal > 0 ? (imagesWebpCount / imagesTotal) * 100 : 0;
  if (webpRatio >= 70) {
    notes.push('Excellent use of modern image formats (WebP/AVIF)');
    aiVisibilityImpact.push('🚀 Fast-loading images help AI crawlers process your content more efficiently');
  } else if (webpRatio >= 30) {
    score -= 5;
    notes.push('Some modern image formats used - Could optimize more (-5)');
  } else if (imagesTotal > 5) {
    score -= 10;
    notes.push('Mostly legacy image formats - Consider WebP for better performance (-10)');
  }
  
  // **LAZY LOADING ANALYSIS**
  if (imagesLazyLoadingCount > imagesTotal * 0.8) {
    notes.push('Good use of lazy loading - Optimized for performance');
    aiVisibilityImpact.push('⚡ Lazy loading helps pages load faster for AI crawlers');
  } else if (imagesLargeCount > 3) {
    score -= 8;
    notes.push(`${imagesLargeCount} large images without optimization - May slow loading (-8)`);
    aiVisibilityImpact.push('🐌 Large images can timeout AI scrapers accessing your content');
  }
  
  // **CRITICAL FIX: Ensure score is always a valid number**
  const finalScore = Math.max(0, Math.min(100, Number(score) || 0));
  
  return { 
    score: finalScore, 
    notes,
    aiVisibilityImpact 
  };
}

export function scoreAccessibility(seoData: SeoAnalysis): { score: number; notes: string[]; aiVisibilityImpact: string[] } {
  // **CRITICAL FIX: Add NaN guards and defaults for all data properties**
  const accessibilityScore = Number(seoData.accessibility_score) || 80; // Default 80 if undefined/NaN
  const semanticHtmlScore = Number(seoData.semantic_html_score) || 70; // Default 70 if undefined/NaN
  const missingAriaLabels = Number(seoData.missing_aria_labels) || 2; // Default 2 if undefined/NaN
  
  let score = accessibilityScore;
  const notes: string[] = [];
  const aiVisibilityImpact: string[] = [];
  
  // **WCAG COMPLIANCE SCORING**
  if (accessibilityScore >= 90) {
    notes.push('Excellent accessibility - WCAG AA compliant');
    aiVisibilityImpact.push('♿ Accessible sites provide cleaner data for AI assistants to process');
  } else if (accessibilityScore >= 75) {
    notes.push('Good accessibility with minor issues');
    aiVisibilityImpact.push('✅ Most accessibility features help AI understand your content structure');
  } else if (accessibilityScore >= 60) {
    notes.push('Moderate accessibility - Needs improvement');
    aiVisibilityImpact.push('⚠️ Accessibility issues can make it harder for AI to extract clean data');
  } else {
    notes.push('Poor accessibility - Major issues found');
    aiVisibilityImpact.push('❌ Poor accessibility creates barriers for both users and AI assistants');
  }
  
  // **SEMANTIC HTML ANALYSIS**
  if (semanticHtmlScore >= 80) {
    notes.push('Excellent semantic HTML structure');
    aiVisibilityImpact.push('🏗️ Semantic markup helps AI models understand content hierarchy and purpose');
  } else if (semanticHtmlScore >= 50) {
    score -= 5;
    notes.push('Good semantic structure with room for improvement (-5)');
  } else {
    score -= 15;
    notes.push('Poor semantic HTML - Too many generic div/span elements (-15)');
    aiVisibilityImpact.push('🔧 AI assistants work better with proper semantic HTML elements');
  }
  
  // **ARIA LABELS & SCREEN READER SUPPORT**
  if (missingAriaLabels === 0) {
    notes.push('Perfect ARIA labeling - All interactive elements labeled');
  } else if (missingAriaLabels <= 3) {
    score -= 5;
    notes.push(`${missingAriaLabels} interactive elements missing ARIA labels (-5)`);
  } else {
    score -= 12;
    notes.push(`${missingAriaLabels} interactive elements missing ARIA labels (-12)`);
    aiVisibilityImpact.push('🏷️ Missing ARIA labels make it harder for AI to understand interactive elements');
  }
  
  // **CRITICAL FIX: Ensure score is always a valid number**
  const finalScore = Math.max(0, Math.min(100, Number(score) || 0));
  
  return { 
    score: finalScore, 
    notes,
    aiVisibilityImpact 
  };
}

export function scoreSeoElements(seoData: SeoAnalysis): { score: number; notes: string[]; aiVisibilityImpact: string[] } {
  let score = 0;
  const notes: string[] = [];
  const aiVisibilityImpact: string[] = [];
  
  // **META TAGS & BASIC SEO**
  // Meta title analysis - helps AI understand page content
  if (seoData.meta_title && seoData.meta_title.length > 0) {
    if (seoData.meta_title_length >= 30 && seoData.meta_title_length <= 60) {
      score += 8;
      notes.push('Clear title - AI understands your page purpose (+8)');
      aiVisibilityImpact.push('🎯 Perfect title length helps AI assistants accurately describe your page');
    } else if (seoData.meta_title_length > 0) {
      score += 4;
      notes.push('Page title present - AI can identify content (+4)');
    }
  } else {
    score -= 5;
    notes.push('Missing title - AI confused about page content (-5)');
    aiVisibilityImpact.push('❌ No title makes it impossible for AI to understand your page purpose');
  }
  
  // Meta description analysis - helps AI summarize your content  
  if (seoData.meta_description && seoData.meta_description.length > 0) {
    if (seoData.meta_description_length >= 120 && seoData.meta_description_length <= 160) {
      score += 7;
      notes.push('Perfect summary - AI can describe your business clearly (+7)');
      aiVisibilityImpact.push('📝 Ideal meta description helps AI provide accurate page summaries');
    } else if (seoData.meta_description_length > 0) {
      score += 4;
      notes.push('Page summary present - AI has context (+4)');
    }
  } else {
    score -= 3;
    notes.push('No summary - AI must guess what you do (-3)');
    aiVisibilityImpact.push('🤷 Missing description forces AI to guess your page content');
  }
  
  // H1 analysis - primary signal for AI understanding
  if (seoData.h1_count === 1) {
    score += 6;
    notes.push('Clear main heading - AI knows your primary message (+6)');
    aiVisibilityImpact.push('📌 Single H1 helps AI identify your main topic clearly');
  } else if (seoData.h1_count > 1) {
    score += 2;
    notes.push(`Multiple headings - AI may be confused: ${seoData.h1_count} (+2)`);
    aiVisibilityImpact.push('⚠️ Multiple H1s can confuse AI about your page focus');
  } else {
    score -= 4;
    notes.push('No main heading - AI cannot identify key message (-4)');
    aiVisibilityImpact.push('❌ No H1 makes it hard for AI to understand your main topic');
  }
  
  // **SOCIAL MEDIA & SHARING OPTIMIZATION**
  let ogScore = 0;
  if (seoData.og_title) ogScore += 2;
  if (seoData.og_description) ogScore += 2;
  if (seoData.og_image) ogScore += 2;
  if (seoData.og_type) ogScore += 2;
  score += ogScore;
  if (ogScore > 0) {
    notes.push(`Social sharing data - AI understands context (+${ogScore})`);
    aiVisibilityImpact.push('📱 Open Graph helps AI understand how to present your content');
  }
  
  if (seoData.twitter_card) {
    score += 4;
    notes.push('Twitter Card - More AI-readable content (+4)');
  }
  
  // **CRAWLABILITY & INDEXABILITY**
  if (seoData.robots_txt_status === 'found') {
    score += 2;
    notes.push('Robot instructions - AI knows what to crawl (+2)');
    aiVisibilityImpact.push('🤖 Robots.txt guides AI crawlers (GPTBot, ClaudeBot, PerplexityBot)');
  }
  
  if (seoData.sitemap_status === 'found') {
    score += 3;
    notes.push('Site map - AI can discover all content (+3)');
    aiVisibilityImpact.push('🗺️ Sitemap helps AI find all your valuable content');
  }
  
  // Critical AI blocking issues
  if (seoData.robots_meta && seoData.robots_meta.includes('noindex')) {
    score -= 10;
    notes.push('Blocking AI crawlers - Major visibility issue (-10)');
    aiVisibilityImpact.push('🚫 CRITICAL: You\'re blocking AI assistants from accessing this page');
  }
  
  return { 
    score: Math.max(0, Math.min(100, score)), 
    notes,
    aiVisibilityImpact 
  };
}

export function scoreComprehensiveVisibility(schemaItems: SdItem[], seoData: SeoAnalysis): {
  schemaScore: number;
  seoScore: number;
  performanceScore: number;
  contentScore: number;
  imageScore: number;
  accessibilityScore: number;
  totalScore: number;
  band: string;
  notes: string[];
  aiVisibilityInsights: string[];
  err: number;
  warn: number;
} {
  // **COMPREHENSIVE AI SEO AUDIT SCORING - 7 ANALYSIS AREAS**
  
  // 1. Schema/Structured Data Analysis (25% weight - primary AI visibility)
  const schemaResult = scoreVisibility(schemaItems);
  const weightedSchemaScore = Math.round(schemaResult.score * 0.25);
  
  // 2. Performance/Core Web Vitals Analysis (20% weight)
  const performanceResult = scorePerformance(seoData);
  const weightedPerformanceScore = Math.round(performanceResult.score * 0.20);
  
  // 3. Content Structure Analysis (20% weight)
  const contentResult = scoreContentStructure(seoData);
  const weightedContentScore = Math.round(contentResult.score * 0.20);
  
  // 4. Image Optimization Analysis (15% weight)
  const imageResult = scoreImageOptimization(seoData);
  const weightedImageScore = Math.round(imageResult.score * 0.15);
  
  // 5. Accessibility Analysis (10% weight)
  const accessibilityResult = scoreAccessibility(seoData);
  const weightedAccessibilityScore = Math.round(accessibilityResult.score * 0.10);
  
  // 6. Basic SEO Elements Analysis (10% weight)
  const seoResult = scoreSeoElements(seoData);
  const weightedSeoScore = Math.round(seoResult.score * 0.10);
  
  // Combine all weighted scores
  const totalScore = Math.min(100, 
    weightedSchemaScore + 
    weightedPerformanceScore + 
    weightedContentScore + 
    weightedImageScore + 
    weightedAccessibilityScore + 
    weightedSeoScore
  );
  
  // Determine performance band based on comprehensive score
  const band = totalScore <= 40 ? 'red' : totalScore <= 70 ? 'amber' : 'green';
  
  // **COMPREHENSIVE AI VISIBILITY INSIGHTS**
  const aiVisibilityInsights = [
    '🤖 **AI Assistant Impact Analysis:**',
    '',
    '**ChatGPT & GPT Models:**',
    ...schemaResult.notes.filter(note => note.includes('ChatGPT')),
    ...performanceResult.aiVisibilityImpact.filter(impact => impact.includes('ChatGPT')),
    '',
    '**Perplexity AI:**',
    ...performanceResult.aiVisibilityImpact.filter(impact => impact.includes('Perplexity')),
    ...contentResult.aiVisibilityImpact.filter(impact => impact.includes('Perplexity')),
    '',
    '**Voice Assistants (Siri, Alexa, Google):**',
    ...performanceResult.aiVisibilityImpact.filter(impact => impact.includes('Siri') || impact.includes('Alexa')),
    ...accessibilityResult.aiVisibilityImpact.filter(impact => impact.includes('voice') || impact.includes('Voice')),
    '',
    '**AI Web Crawlers (GPTBot, ClaudeBot, PerplexityBot):**',
    ...seoResult.aiVisibilityImpact.filter(impact => impact.includes('GPTBot') || impact.includes('ClaudeBot') || impact.includes('crawl')),
    '',
    '**Google AI & Gemini:**',
    ...contentResult.aiVisibilityImpact.filter(impact => impact.includes('Google') || impact.includes('Gemini')),
  ].filter(insight => insight.length > 0); // Remove empty strings
  
  // **DETAILED SCORING BREAKDOWN**
  const notes = [
    `🎯 **COMPREHENSIVE AI VISIBILITY SCORE: ${totalScore}/100 (${band.toUpperCase()})**`,
    '',
    `📊 **7-Area Analysis Breakdown:**`,
    `🔗 Schema/Structured Data: ${schemaResult.score}/100 (25% weight = ${weightedSchemaScore} points)`,
    `⚡ Performance/Core Web Vitals: ${performanceResult.score}/100 (20% weight = ${weightedPerformanceScore} points)`,
    `📝 Content Structure: ${contentResult.score}/100 (20% weight = ${weightedContentScore} points)`,
    `🖼️ Image Optimization: ${imageResult.score}/100 (15% weight = ${weightedImageScore} points)`,
    `♿ Accessibility (WCAG): ${accessibilityResult.score}/100 (10% weight = ${weightedAccessibilityScore} points)`,
    `🔍 Basic SEO Elements: ${seoResult.score}/100 (10% weight = ${weightedSeoScore} points)`,
    '',
    '--- 🔗 STRUCTURED DATA ANALYSIS ---',
    ...schemaResult.notes,
    '',
    '--- ⚡ PERFORMANCE ANALYSIS ---',
    ...performanceResult.notes,
    '',
    '--- 📝 CONTENT STRUCTURE ANALYSIS ---',
    ...contentResult.notes,
    '',
    '--- 🖼️ IMAGE OPTIMIZATION ANALYSIS ---',
    ...imageResult.notes,
    '',
    '--- ♿ ACCESSIBILITY ANALYSIS ---',
    ...accessibilityResult.notes,
    '',
    '--- 🔍 BASIC SEO ANALYSIS ---',
    ...seoResult.notes,
    '',
    '🎯 **KEY AI VISIBILITY RECOMMENDATIONS:**',
    band === 'red' ? '❌ CRITICAL: Your site is nearly invisible to AI assistants. Immediate action needed.' :
    band === 'amber' ? '⚠️ MODERATE: Some AI visibility, but missing key opportunities for AI discovery.' :
    '✅ EXCELLENT: Your site is well-optimized for AI assistant discovery and citation.',
    '',
    totalScore < 30 ? '🚨 Priority: Fix structured data and basic SEO to appear in AI responses' :
    totalScore < 60 ? '📈 Focus: Improve performance and content structure for better AI understanding' :
    '🚀 Optimize: Fine-tune advanced features like SpeakableSpecification for voice AI'
  ];
  
  return {
    schemaScore: schemaResult.score,
    seoScore: seoResult.score,
    performanceScore: performanceResult.score,
    contentScore: contentResult.score,
    imageScore: imageResult.score,
    accessibilityScore: accessibilityResult.score,
    totalScore,
    band,
    notes,
    aiVisibilityInsights,
    err: schemaResult.err,
    warn: schemaResult.warn
  };
}

// **PROFESSIONAL-GRADE OVERALL SCORE AGGREGATOR**
// Required function with updated band thresholds for professional presentation
export function computeOverallScore(schemaItems: SdItem[], seoData: SeoAnalysis): {
  overallScore: number;
  band: 'red' | 'amber' | 'green';
  areaBreakdown: {
    schema: { score: number; weightedScore: number; weight: number };
    performance: { score: number; weightedScore: number; weight: number };
    content: { score: number; weightedScore: number; weight: number };
    images: { score: number; weightedScore: number; weight: number };
    accessibility: { score: number; weightedScore: number; weight: number };
    technicalSeo: { score: number; weightedScore: number; weight: number };
  };
  aiCommentary: {
    schema: string[];
    performance: string[];
    content: string[];
    images: string[];
    accessibility: string[];
    technicalSeo: string[];
    overall: string[];
  };
  totalWeightedScore: number;
} {
  // Use existing comprehensive scoring logic
  const result = scoreComprehensiveVisibility(schemaItems, seoData);
  
  // Apply professional-grade band thresholds: red (≤40), amber (41-70), green (>70)
  const band: 'red' | 'amber' | 'green' = 
    result.totalScore <= 40 ? 'red' : 
    result.totalScore <= 70 ? 'amber' : 
    'green';

  // Calculate individual area scores with proper weights
  const schemaResult = scoreVisibility(schemaItems);
  const performanceResult = scorePerformance(seoData);
  const contentResult = scoreContentStructure(seoData);
  const imageResult = scoreImageOptimization(seoData);
  const accessibilityResult = scoreAccessibility(seoData);
  const seoResult = scoreSeoElements(seoData);
  
  // **CRITICAL FIX: Professional breakdown with NaN guards**
  const areaBreakdown = {
    schema: { 
      score: Number(schemaResult.score) || 0, 
      weightedScore: Math.round((Number(schemaResult.score) || 0) * 0.25), 
      weight: 25 
    },
    performance: { 
      score: Number(performanceResult.score) || 0, 
      weightedScore: Math.round((Number(performanceResult.score) || 0) * 0.20), 
      weight: 20 
    },
    content: { 
      score: Number(contentResult.score) || 0, 
      weightedScore: Math.round((Number(contentResult.score) || 0) * 0.20), 
      weight: 20 
    },
    images: { 
      score: Number(imageResult.score) || 0, 
      weightedScore: Math.round((Number(imageResult.score) || 0) * 0.15), 
      weight: 15 
    },
    accessibility: { 
      score: Number(accessibilityResult.score) || 0, 
      weightedScore: Math.round((Number(accessibilityResult.score) || 0) * 0.10), 
      weight: 10 
    },
    technicalSeo: { 
      score: Number(seoResult.score) || 0, 
      weightedScore: Math.round((Number(seoResult.score) || 0) * 0.10), 
      weight: 10 
    }
  };

  // Extract AI commentary for each area
  const aiCommentary = {
    schema: schemaResult.notes,
    performance: performanceResult.aiVisibilityImpact,
    content: contentResult.aiVisibilityImpact,
    images: imageResult.aiVisibilityImpact,
    accessibility: accessibilityResult.aiVisibilityImpact,
    technicalSeo: seoResult.aiVisibilityImpact,
    overall: result.aiVisibilityInsights
  };

  // **CRITICAL FIX: Ensure final scores are always valid numbers**
  const safeOverallScore = Number(result.totalScore) || 0;
  const safeTotalWeightedScore = Number(result.totalScore) || 0;
  
  return {
    overallScore: Math.max(0, Math.min(100, safeOverallScore)),
    band,
    areaBreakdown,
    aiCommentary,
    totalWeightedScore: Math.max(0, Math.min(100, safeTotalWeightedScore))
  };
}