import fetch from 'node-fetch';

interface PageSpeedMetrics {
  performance_score: number;
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint  
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  speed_index: number;
  total_blocking_time: number;
  loading_experience: 'FAST' | 'AVERAGE' | 'SLOW';
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    score_display_mode: string;
  }>;
}

interface PageSpeedInsightsResponse {
  lighthouseResult: {
    categories: {
      performance: {
        score: number;
      };
    };
    audits: {
      'first-contentful-paint': { displayValue: string; numericValue: number };
      'largest-contentful-paint': { displayValue: string; numericValue: number };
      'first-input-delay': { displayValue: string; numericValue: number };
      'cumulative-layout-shift': { displayValue: string; numericValue: number };
      'speed-index': { displayValue: string; numericValue: number };
      'total-blocking-time': { displayValue: string; numericValue: number };
      [key: string]: any;
    };
  };
  loadingExperience: {
    overall_category: 'FAST' | 'AVERAGE' | 'SLOW';
  };
}

export async function getPageSpeedMetrics(url: string): Promise<PageSpeedMetrics | null> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️ No Google PageSpeed API key found, skipping real performance data');
    return null;
  }

  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&category=performance&strategy=mobile`;
    
    console.log('🚀 Fetching real PageSpeed data from Google...');
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.log(`❌ PageSpeed API error: ${response.status} - ${response.statusText}`);
      return null;
    }
    
    const data = await response.json() as PageSpeedInsightsResponse;
    
    const audits = data.lighthouseResult.audits;
    const performanceScore = Math.round(data.lighthouseResult.categories.performance.score * 100);
    
    // Extract opportunities for improvements
    const opportunities = Object.entries(audits)
      .filter(([_, audit]) => audit.score !== undefined && audit.score < 1 && audit.details)
      .slice(0, 5) // Top 5 opportunities
      .map(([id, audit]) => ({
        id,
        title: audit.title || '',
        description: audit.description || '',
        score_display_mode: audit.scoreDisplayMode || ''
      }));

    const metrics: PageSpeedMetrics = {
      performance_score: performanceScore,
      fcp: audits['first-contentful-paint']?.numericValue || 0,
      lcp: audits['largest-contentful-paint']?.numericValue || 0,
      fid: audits['first-input-delay']?.numericValue || 0,
      cls: audits['cumulative-layout-shift']?.numericValue || 0,
      speed_index: audits['speed-index']?.numericValue || 0,
      total_blocking_time: audits['total-blocking-time']?.numericValue || 0,
      loading_experience: data.loadingExperience?.overall_category || 'AVERAGE',
      opportunities
    };
    
    console.log(`✅ Real PageSpeed metrics: Performance ${performanceScore}/100, LCP ${Math.round(metrics.lcp)}ms`);
    return metrics;
    
  } catch (error) {
    console.log('❌ Error fetching PageSpeed data:', error);
    return null;
  }
}

// Fallback estimated metrics when PageSpeed API is unavailable
export function getEstimatedMetrics(url: string): PageSpeedMetrics {
  console.log('📊 Using estimated performance metrics (no API key)');
  
  // Basic estimates based on common website patterns
  const isWixSite = url.includes('wix.com') || url.includes('wixsite.com');
  const isWordPressSite = url.includes('wordpress.com') || url.includes('wp-content');
  
  let baseScore = 75;
  let baseLoad = 2500;
  
  if (isWixSite) {
    baseScore = 60; // Wix sites tend to be slower
    baseLoad = 3500;
  } else if (isWordPressSite) {
    baseScore = 65;
    baseLoad = 3000;
  }
  
  return {
    performance_score: baseScore,
    fcp: baseLoad * 0.6,
    lcp: baseLoad,
    fid: 80,
    cls: 0.1,
    speed_index: baseLoad * 0.8,
    total_blocking_time: 200,
    loading_experience: baseScore > 70 ? 'FAST' : 'AVERAGE',
    opportunities: [
      {
        id: 'estimated-optimization',
        title: 'Image optimization opportunities detected',
        description: 'Estimated based on common website patterns',
        score_display_mode: 'numeric'
      }
    ]
  };
}