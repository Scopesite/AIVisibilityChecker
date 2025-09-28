import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useCredits } from './useCredits';

// Updated comprehensive analysis types matching the new scan endpoint
interface AIRecommendationsV1 {
  version: "1.0";
  summary: string;
  prioritised_actions: {
    task: string;
    impact: "high" | "med" | "low";
    effort: "low" | "med" | "high";
    where?: string[];
  }[];
  schema_recommendations: {
    type: string;
    where: string[];
    jsonld: Record<string, any>;
    htmlCode?: string;
  }[];
  notes?: string[];
}

interface SEOAnalysisV2 {
  url: string;
  finalUrl: string;
  aiVisibilityScore: number;
  seoScore: number;
  aiVisibilityBand: string;
  meta: {
    title: { text: string; length: number; isOptimal: boolean; };
    description: { text: string; length: number; isOptimal: boolean; };
  };
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  businessInfo: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    logo?: string;
    businessType?: string;
  };
  social: {
    sameAs: string[];
  };
  schema: {
    types: string[];
    hasOrganization: boolean;
    hasWebSite: boolean;
    hasLocalBusiness: boolean;
    hasBreadcrumb: boolean;
  };
  issues: string[];
}

interface ScanResultV1 {
  cost: number;
  remainingCredits: number;
  analysis: SEOAnalysisV2;
  ai: AIRecommendationsV1;
}

interface ScanRequest {
  url: string;
}

export function useAIAnalysis() {
  const { refetchBalance } = useCredits();
  const [scanResult, setScanResult] = useState<ScanResultV1 | null>(null);

  const scanMutation = useMutation({
    mutationFn: async (data: ScanRequest): Promise<ScanResultV1> => {
      const response = await apiRequest('POST', '/api/scan', data);

      if (!response.ok) {
        // Handle 502 responses with better error messaging
        if (response.status === 502) {
          throw new Error('Our AI returned a malformed response. We\'ve logged it and adjusted—please try again.');
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('Comprehensive Analysis Success - Full response:', data);
      console.log('SEO Analysis:', data.analysis);
      console.log('AI Recommendations:', data.ai);
      setScanResult(data);
      // Refresh credit balance after successful analysis
      refetchBalance();
    },
  });

  const startAnalysis = async (url: string) => {
    setScanResult(null);
    return scanMutation.mutateAsync({ url });
  };

  const clearResults = () => {
    setScanResult(null);
  };

  return {
    startAnalysis,
    clearResults,
    scanResult, // Now returns full scan result with both SEO analysis and AI recommendations
    analysisResult: scanResult?.ai || null, // For backward compatibility
    isAnalyzing: scanMutation.isPending,
    analysisError: scanMutation.error,
    isSuccess: scanMutation.isSuccess,
    isError: scanMutation.isError,
  };
}
