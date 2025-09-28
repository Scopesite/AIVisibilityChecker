import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Target, ExternalLink, Loader2, AlertTriangle, TrendingUp, Search, Eye, Crown, CreditCard, Zap, LogOut } from "lucide-react";
import voiceLogo from '@assets/Untitled (350 x 250 px)_1758732653247.png';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { submissionSchema, type SubmissionData } from "@shared/schema";
import StarterPackPayment from "@/components/StarterPackPayment";
import ProSubscriptionPayment from "@/components/ProSubscriptionPayment";
import ScanProgress from "@/components/ScanProgress";
import CreditMeter from "@/components/CreditMeter";
import TechStackSignals from "@/components/TechStackSignals";
import { H1EvidenceDialog } from "@/components/evidence/H1EvidenceDialog";
import { AiCrawlerAccess } from "@/components/panels/AiCrawlerAccess";
import { OpenGraphTwitter } from "@/components/panels/OpenGraphTwitter";
import { useScanController } from "@/hooks/useScanController";
import { useCredits, type ScanType } from "@/hooks/useCredits";
import BuyCreditsCTA from "@/components/BuyCreditsCTA";

interface ApiResponse {
  ok: boolean;
  message?: string;
  error?: string;
  relay?: any;
}

interface ScoreResponse {
  kind?: string;
  run_id?: string;
  email?: string;
  website_url?: string;
  final_url?: string;
  score?: number;
  band?: string;
  zone_color?: string;
  found_schemas?: string;
  recommendations?: string[];
  checked_at?: string;
  message?: string;
  ok?: boolean;
  
  // **NEW: Professional-grade comprehensive analysis fields**
  h1_evidence?: Array<{ text: string; selector: string; hidden?: boolean }>;
  overall_score?: number;
  area_breakdown?: {
    schema: { score: number; weightedScore: number; weight: number };
    performance: { score: number; weightedScore: number; weight: number };
    content: { score: number; weightedScore: number; weight: number };
    images: { score: number; weightedScore: number; weight: number };
    accessibility: { score: number; weightedScore: number; weight: number };
    technicalSeo: { score: number; weightedScore: number; weight: number };
  };
  ai_commentary?: {
    schema: string[];
    performance: string[];
    content: string[];
    images: string[];
    accessibility: string[];
    technicalSeo: string[];
    overall: string[];
  };
  
  // Enhanced performance metrics
  estimated_load_time?: number;
  render_blocking_resources?: number;
  performance_note?: string;
  
  // Comprehensive SEO Analysis Fields
  meta_title?: string;
  meta_title_length?: number;
  meta_description?: string;
  meta_description_length?: number;
  canonical_url?: string;
  h1_tags?: string;
  h1_count?: number;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_type?: string;
  twitter_card?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
  robots_meta?: string;
  robots_txt_status?: 'found' | 'not_found' | 'error';
  sitemap_status?: 'found' | 'not_found' | 'error';
  sitemap_url?: string;
  favicon_status?: 'found' | 'not_found' | 'error';
  favicon_type?: string;
  images_total?: number;
  images_with_alt?: number;
  images_alt_percentage?: number;
  internal_links_count?: number;
  external_links_count?: number;
  lang_attribute?: string;
  has_hreflang?: boolean;
  viewport_meta?: string;
  charset_meta?: string;
  
  // Score Breakdown
  schema_score?: number;
  seo_score?: number;
  total_score?: number;
  
  // Schema types from backend
  schema_types?: string;
  zone?: 'RED' | 'AMBER' | 'GREEN';
  recommendation_1?: string;
  recommendation_2?: string;
  recommendation_3?: string;
  recommendation_4?: string;
}

// Mock data removed - now using only real API integration

// Demo Gauge for showing 89% UK businesses invisible statistic
function DemoInvisibilityGauge() {
  const [displayScore, setDisplayScore] = useState(0);
  
  useEffect(() => {
    // Animate to 89% after mount
    const timer = setTimeout(() => {
      setDisplayScore(89);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  // Define colors for invisibility gauge
  const invisibleColor = "hsl(45, 93%, 58%)"; // Scopesite gold for high invisibility (branded)
  const visibleColor = "hsl(142, 76%, 36%)"; // Green for visibility (good)
  
  // Calculate the needle rotation to point LEFT into the red area
  // Negative rotation makes needle point to the left side (red zone)
  const rotation = -45; // Points left at -45° (clearly in red area)

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="relative w-32 h-16 overflow-hidden sm:w-40 sm:h-20">
        {/* Meter Background */}
        <div className="absolute inset-0 rounded-t-full bg-muted/20 border-2 border-border/30"></div>
        
        {/* Full Gauge Background - 90% red, 10% gold */}
        <div 
          className="absolute inset-0 rounded-t-full transition-all duration-2000 ease-out"
          style={{
            background: `conic-gradient(
              from 180deg at 50% 50%,
              hsl(0, 84%, 60%) 0deg,
              hsl(0, 84%, 60%) 170deg,
              hsl(45, 93%, 58%) 170deg,
              hsl(45, 93%, 58%) 180deg
            )`
          }}
        ></div>
        
        {/* Score Needle - Points to the 89% mark in the red area */}
        <div className="absolute bottom-0 left-1/2 w-0.5 bg-white origin-bottom transform -translate-x-1/2 transition-transform duration-2000 ease-out shadow-lg rounded-full"
          style={{ 
            transform: `translateX(-50%) rotate(${rotation}deg)`,
            height: '60px'
          }}
        ></div>
        
        {/* Center Circle */}
        <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-card border-2 border-foreground rounded-full transform -translate-x-1/2 translate-y-1"></div>
      </div>
      
      {/* Gauge Display */}
      <div className="text-center">
        <div className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: invisibleColor }}>
          {Math.round(displayScore)}%
        </div>
        <div className="text-xs sm:text-sm font-semibold" style={{ color: invisibleColor }}>
          Invisible to AI Chatbots
        </div>
        <div className="text-xs text-muted-foreground mt-1">UK Businesses</div>
        
        {/* V.O.I.C.E™ Branding */}
        <div className="mt-3 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
          <div className="text-xs font-semibold text-primary">V.O.I.C.E™ AI Visibility Architecture</div>
        </div>
      </div>
    </div>
  );
}

// Iframe-Optimized Score Meter Component
function ScoreMeter({ score, animated = false }: { score: number; animated?: boolean }) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  
  useEffect(() => {
    if (animated && score > 0) {
      // Defer score animation to idle time for better performance
      const deferAnimation = () => {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(() => {
            setTimeout(() => {
              setDisplayScore(score);
            }, 200); // Reduced from 500ms for faster feedback
          });
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(() => {
            setDisplayScore(score);
          }, 300);
        }
      };
      deferAnimation();
    }
  }, [score, animated]);
  
  const getScoreColor = (score: number) => {
    if (score <= 30) return "hsl(45, 93%, 58%)"; // Scopesite gold for low scores
    if (score <= 65) return "hsl(45, 93%, 58%)"; // Scopesite gold for medium scores  
    return "hsl(142, 76%, 36%)"; // Green for high scores
  };
  
  const getScoreBand = (score: number) => {
    if (score <= 30) return "Invisible to AI Chatbots";
    if (score <= 65) return "Partially Visible to AI";
    return "Highly Visible to AI Assistants";
  };
  
  const rotation = ((displayScore / 100) * 180) - 90; // -90deg to 90deg range

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="relative w-40 h-20 overflow-hidden sm:w-48 sm:h-24">
        {/* Meter Background */}
        <div className="absolute inset-0 score-meter rounded-t-full opacity-30"></div>
        
        {/* Meter Foreground - Active portion */}
        <div 
          className="absolute inset-0 rounded-t-full transition-all duration-1000 ease-out"
          style={{
            background: `conic-gradient(
              from 180deg at 50% 50%,
              ${getScoreColor(displayScore)} 0deg,
              ${getScoreColor(displayScore)} ${(displayScore / 100) * 180}deg,
              transparent ${(displayScore / 100) * 180}deg,
              transparent 180deg
            )`
          }}
        ></div>
        
        {/* Score Needle */}
        <div className="absolute bottom-0 left-1/2 w-1 bg-white origin-bottom transform -translate-x-1/2 transition-transform duration-1000 ease-out shadow-lg rounded-full"
          style={{ 
            transform: `translateX(-50%) rotate(${rotation}deg)`,
            height: '80px'
          }}
        ></div>
        
        {/* Center Circle */}
        <div className="absolute bottom-0 left-1/2 w-3 h-3 bg-card border-2 border-foreground rounded-full transform -translate-x-1/2 translate-y-1.5"></div>
      </div>
      
      {/* Compact Score Display */}
      <div className="text-center">
        <div className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: getScoreColor(displayScore) }}>
          {Math.round(displayScore)}
        </div>
        <div className="text-sm sm:text-lg font-semibold mb-1" style={{ color: getScoreColor(displayScore) }}>
          {getScoreBand(displayScore)}
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">AI Chatbot Visibility Score</div>
      </div>
    </div>
  );
}

export default function AIVisibilityChecker() {
  const [result, setResult] = useState<ScoreResponse | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<'starter' | 'pro' | null>(null);
  const [h1EvidenceOpen, setH1EvidenceOpen] = useState(false);
  const { toast } = useToast();
  
  // Query for working meta data that powers Open Graph section  
  const { data: metaData } = useQuery({
    queryKey: ['meta-tags', result?.website_url],
    queryFn: async () => {
      if (!result?.website_url) return null;
      const response = await fetch(`/api/scan/meta?url=${encodeURIComponent(result.website_url)}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!result?.website_url
  });
  
  // New progressive loader system
  const scanController = useScanController();

  // Credit system integration
  const credits = useCredits();
  const scanType: ScanType = 'basic'; // Default to basic scan for now

  const form = useForm<SubmissionData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      email: "",
      website_url: "",
      consent: false,
    },
  });

  // Handle initial loading for iframe - set immediately for instant interactivity
  useEffect(() => {
    // Set isInitialLoading to false immediately for instant interactivity
    setIsInitialLoading(false);
    
    // Defer non-critical animations via requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        // Non-critical animations can be initialized here if needed
      }, { timeout: 1000 });
    }
  }, []);

  // Automatic payment verification when user returns from Stripe (run once only)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    const packageType = urlParams.get('package');

    if (paymentStatus === 'success' && sessionId) {
      console.log('🔍 Detected successful payment, verifying...', { sessionId, packageType });
      
      // Clean up URL parameters IMMEDIATELY to prevent loops
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Automatically verify the payment and grant credits
      apiRequest('POST', '/api/credits/verify-and-grant', { session_id: sessionId })
        .then(res => res.json())
        .then((response: any) => {
          if (response.credits_granted > 0) {
            toast({
              title: "Payment Successful! 🎉",
              description: `${response.credits_granted} credits added to your account. New balance: ${response.new_balance} credits.`,
              duration: 8000,
            });
            
            // Refresh credits display
            credits.refetchBalance();
          } else {
            console.warn('Payment verified but no credits granted:', response);
          }
        })
        .catch((error) => {
          console.error('Payment verification failed:', error);
          toast({
            title: "Payment Verification Failed",
            description: "Your payment was processed but we couldn't verify it automatically. Please contact support.",
            variant: "destructive",
            duration: 10000,
          });
        });
    } else if (paymentStatus === 'cancel') {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. You can try again anytime.",
        variant: "destructive",
        duration: 5000,
      });
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []); // Empty dependency array - run only once on mount

  // Handle scan completion and errors with progressive loader
  const handleScanComplete = (scanResult: any) => {
    if (scanResult?.result) {
      const realResult = scanResult.result;
      console.log("📊 Progressive scan completed:", realResult);
      
      // Refresh credit balance after successful scan
      credits.refetchBalance();
      
      // Format the result for display
      const formattedResult: ScoreResponse = {
        kind: "score",
        run_id: realResult.run_id,
        website_url: realResult.website_url,
        score: realResult.total_score || realResult.score,
        band: realResult.zone === 'GREEN' ? 'Highly Visible to AI Assistants' : 
              realResult.zone === 'AMBER' ? 'Partially Visible to AI' : 
              'Invisible to AI Chatbots',
        zone_color: realResult.zone === 'GREEN' ? '#16a34a' : 
                   realResult.zone === 'AMBER' ? '#f59e0b' : 'hsl(45, 93%, 58%)',
        found_schemas: realResult.schema_types || '',
        recommendations: [
          realResult.recommendation_1,
          realResult.recommendation_2, 
          realResult.recommendation_3,
          realResult.recommendation_4
        ].filter(Boolean),
        checked_at: realResult.checked_at || new Date().toISOString(),
        ok: true,
        
        // Pass through all comprehensive SEO analysis fields
        meta_title: realResult.meta_title,
        meta_title_length: realResult.meta_title_length,
        meta_description: realResult.meta_description,
        meta_description_length: realResult.meta_description_length,
        canonical_url: realResult.canonical_url,
        h1_tags: realResult.h1_tags,
        h1_count: realResult.h1_count,
        h1_evidence: realResult.h1_evidence,
        og_title: realResult.og_title,
        og_description: realResult.og_description,
        og_image: realResult.og_image,
        og_type: realResult.og_type,
        twitter_card: realResult.twitter_card,
        twitter_title: realResult.twitter_title,
        twitter_description: realResult.twitter_description,
        twitter_image: realResult.twitter_image,
        robots_meta: realResult.robots_meta,
        robots_txt_status: realResult.robots_txt_status,
        sitemap_status: realResult.sitemap_status,
        sitemap_url: realResult.sitemap_url,
        favicon_status: realResult.favicon_status,
        favicon_type: realResult.favicon_type,
        images_total: realResult.images_total,
        images_with_alt: realResult.images_with_alt,
        images_alt_percentage: realResult.images_alt_percentage,
        internal_links_count: realResult.internal_links_count,
        external_links_count: realResult.external_links_count,
        lang_attribute: realResult.lang_attribute,
        has_hreflang: realResult.has_hreflang,
        viewport_meta: realResult.viewport_meta,
        charset_meta: realResult.charset_meta,
        
        // Score breakdown for transparency
        schema_score: realResult.schema_score,
        seo_score: realResult.seo_score,
        total_score: realResult.total_score,
        
        // Backend-specific fields
        schema_types: realResult.schema_types,
        zone: realResult.zone,
        recommendation_1: realResult.recommendation_1,
        recommendation_2: realResult.recommendation_2,
        recommendation_3: realResult.recommendation_3,
        recommendation_4: realResult.recommendation_4
      };
      
      console.log("📊 Comprehensive analysis formatted for frontend:", formattedResult);
      setResult(formattedResult);
      
      toast({
        title: "Analysis Complete!",
        description: "Your AI visibility report is ready. Check your email for detailed results.",
      });
    }
  };

  const handleScanError = (error: string) => {
    console.log("❌ Progressive scan error:", error);
    
    // Check if it's a daily limit error
    const isDailyLimit = error.includes("payment_required") || 
                        error.includes("Daily limit reached") ||
                        error.includes("No credits remaining");
    
    if (isDailyLimit) {
      setShowPaywall(true);
      toast({
        title: "Free Check Used",
        description: "Choose a payment option below to continue checking your websites.",
        variant: "default",
      });
    } else {
      toast({
        title: "Analysis Failed",
        description: error || "Failed to analyze your website. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Connect scan controller events
  useEffect(() => {
    if (scanController.status === 'complete' && scanController.result) {
      handleScanComplete(scanController);
    } else if (scanController.status === 'error' && scanController.error) {
      handleScanError(scanController.error);
    }
  }, [scanController.status, scanController.result, scanController.error]);

  const onSubmit = async (data: SubmissionData) => {
    setResult(null);
    
    // Pre-check credits before starting scan
    if (!credits.canAffordScan(scanType)) {
      const message = credits.getInsufficientCreditsMessage(scanType);
      toast({
        title: "Insufficient Credits",
        description: message,
        variant: "destructive",
      });
      setShowPaywall(true);
      return;
    }
    
    try {
      await scanController.startScan(data.email, data.website_url, scanType);
      toast({
        title: "Analysis Started",
        description: "We're analyzing your website now. You'll see real-time progress below.",
      });
    } catch (error: any) {
      handleScanError(error.message || "Failed to start analysis");
    }
  };

  const getLeadQualificationMessage = (score: number) => {
    if (score <= 30) {
      return {
        title: "Critical AI Visibility Gap",
        message: "Your business is invisible to ChatGPT and AI assistants. Schema markup is your key to AI discoverability.",
        cta: "Book your FREE strategy session to get visible on AI platforms"
      };
    } else if (score <= 65) {
      return {
        title: "Partially Visible to AI Assistants", 
        message: "You're making progress, but AI chatbots still struggle to understand your business. Schema markup needs optimization.",
        cta: "Get your FREE consultation to maximize AI chatbot visibility"
      };
    } else {
      return {
        title: "AI Assistant Ready Business",
        message: "Excellent! ChatGPT, Google AI, and Perplexity can find and understand your business. Ready for advanced AI optimization?",
        cta: "Book your FREE strategy call to dominate AI search results"
      };
    }
  };

  // Loading screen for iframe initialization
  if (isInitialLoading) {
    return (
      <div className="bg-background text-foreground min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <div className="relative flex justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-4">
                <Target className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
              </div>
              {/* Animated loading ring - Fixed positioning */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-transparent border-t-primary animate-spin"></div>
            </div>
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold mb-3 text-foreground">AI Chatbot Visibility Checker</h2>
          <div className="w-24 h-1 consultation-gradient mx-auto rounded-full mb-4"></div>
          
          <div className="text-primary font-semibold text-sm sm:text-base">
            <span className="hidden sm:inline">Loading ChatGPT & AI assistant visibility tool</span>
            <span className="sm:hidden">Loading AI tool...</span>
          </div>
          
          <p className="text-xs sm:text-sm text-muted-foreground mt-3 max-w-md mx-auto">
            Analyzing how ChatGPT, Google AI, and Perplexity see your business
          </p>
          
          {/* Subtle brand accent */}
          <div className="mt-6 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <div className="w-2 h-2 bg-primary rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Payment success handlers
  const handleStarterPackSuccess = () => {
    setShowPaywall(false);
    setSelectedPaymentOption(null);
    toast({
      title: "Payment Successful!",
      description: "5 additional checks added to your account. You can now continue checking websites.",
    });
  };

  const handleProSubscriptionSuccess = () => {
    setShowPaywall(false);
    setSelectedPaymentOption(null);
    toast({
      title: "Subscription Activated!",
      description: "Welcome to V.O.I.C.E™ Pro! You now have unlimited AI visibility checks.",
    });
  };

  const handlePaymentCancel = () => {
    setSelectedPaymentOption(null);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Header with Credit Meter and Logout Button */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        <CreditMeter className="hidden sm:flex" showRefresh={true} />
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleLogout}
          className="flex items-center space-x-2"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
      
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {showPaywall ? (
          // PAYWALL - Show payment options when daily limit reached
          <div className="space-y-6">
            {/* Paywall Header */}
            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl sm:text-3xl font-bold flex items-center justify-center space-x-2">
                  <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600" />
                  <span>Unlock More AI Visibility Checks</span>
                </CardTitle>
                <CardDescription className="text-base sm:text-lg">
                  You've used your free daily check. Choose a plan below to continue optimizing your AI visibility.
                </CardDescription>
              </CardHeader>
            </Card>

            {selectedPaymentOption ? (
              // Show selected payment component
              <div className="flex justify-center">
                {selectedPaymentOption === 'starter' ? (
                  <StarterPackPayment 
                    onSuccess={handleStarterPackSuccess}
                    onCancel={handlePaymentCancel}
                  />
                ) : (
                  <ProSubscriptionPayment 
                    onSuccess={handleProSubscriptionSuccess}
                    onCancel={handlePaymentCancel}
                  />
                )}
              </div>
            ) : (
              // Show payment option selection
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Starter Pack Option */}
                <Card className="relative hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 cursor-pointer"
                      onClick={() => setSelectedPaymentOption('starter')}
                      data-testid="card-select-starter">
                  <CardHeader className="text-center pb-4">
                    <div className="space-y-2">
                      <CardTitle className="text-xl font-bold">Starter Pack</CardTitle>
                      <CardDescription>Perfect for small businesses</CardDescription>
                      <div className="flex items-center justify-center space-x-2 py-2">
                        <div className="text-3xl font-bold text-primary">£5.00</div>
                        <Badge variant="secondary">One-time</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">5 additional website checks</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Complete AI visibility analysis</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Detailed recommendations</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">No recurring charges</span>
                      </div>
                      <Button className="w-full mt-4" data-testid="button-choose-starter">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Choose Starter Pack
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Pro Subscription Option */}
                <Card className="relative hover:shadow-lg transition-all duration-300 border-2 border-amber-200 hover:border-amber-300 cursor-pointer bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20"
                      onClick={() => setSelectedPaymentOption('pro')}
                      data-testid="card-select-pro">
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
                    <Crown className="w-3 h-3 mr-1" />
                    Recommended
                  </Badge>
                  <CardHeader className="text-center pb-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-center space-x-2">
                        <Crown className="h-5 w-5 text-amber-600" />
                        <CardTitle className="text-xl font-bold">V.O.I.C.E™ Pro</CardTitle>
                      </div>
                      <CardDescription>For growing businesses</CardDescription>
                      <div className="flex items-center justify-center space-x-2 py-2">
                        <div className="text-3xl font-bold text-amber-600">£20.00</div>
                        <div className="text-sm text-muted-foreground">/month</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium">100 checks per month</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Complete AI visibility analysis</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Advanced SEO recommendations</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Priority customer support</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Cancel anytime</span>
                      </div>
                      <Button className="w-full mt-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white" data-testid="button-choose-pro">
                        <Crown className="mr-2 h-4 w-4" />
                        Choose Pro Plan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Back to form option */}
            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowPaywall(false);
                  setSelectedPaymentOption(null);
                }}
                data-testid="button-back-to-form"
              >
                ← Back to Form
              </Button>
            </div>
          </div>
        ) : !result ? (
          <>
            {/* Enhanced Hero Section */}
            <Card className="bg-card border border-border shadow-xl overflow-hidden relative">
              {/* Subtle brand accent */}
              <div className="absolute top-0 left-0 right-0 h-1 consultation-gradient"></div>
              
              <CardContent className="p-4 sm:p-6">
                {/* Enhanced Hero Section */}
                <div className="text-center mb-6 sm:mb-8">
                  <div className="mb-4">
                    <div className="mb-4">
                      <img 
                        src={voiceLogo} 
                        alt="V.O.I.C.E™ AI Visibility Architecture - ChatGPT & AI Assistant Optimization" 
                        className="w-48 h-auto sm:w-64 mx-auto max-w-full"
                        data-testid="img-voice-logo"
                      />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                      AI Visibility Checker
                    </h1>
                    <div className="w-24 h-1 consultation-gradient mx-auto rounded-full mb-4"></div>
                  </div>
                  
                  <p className="text-muted-foreground leading-relaxed text-base sm:text-lg mb-4">
                    <strong className="text-foreground">The truth:</strong> If ChatGPT, Google AI, and Perplexity can't find your business, you're losing customers to competitors.
                  </p>
                  
                  {/* Enhanced visibility gauge */}
                  <div className="mt-6 p-6 bg-gradient-to-r from-card/50 to-card/30 border border-border rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-destructive/50 via-primary/50 to-accent/50"></div>
                    
                    <DemoInvisibilityGauge />
                    
                    <div className="text-center mt-4">
                      <p className="text-[hsl(45,93%,58%)] font-semibold text-sm sm:text-base mb-1">
                        Is your business invisible to AI assistants?
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Get your visibility score for ChatGPT, Google AI, and Perplexity
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enhanced Form */}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6" data-testid="form-ai-visibility">
                    <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                      {/* Email Field */}
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Email Address <span className="text-[hsl(45,93%,58%)]">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="you@yourbusiness.co.uk" 
                                type="email"
                                className="h-12 sm:h-14 text-base border-2 transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                data-testid="input-email"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Get your AI chatbot visibility report instantly
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Website URL Field */}
                      <FormField
                        control={form.control}
                        name="website_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Website URL <span className="text-[hsl(45,93%,58%)]">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="yourbusiness.co.uk" 
                                className="h-12 sm:h-14 text-base border-2 transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                data-testid="input-website-url"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Discover how ChatGPT and AI assistants see your business
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Consent Checkbox */}
                    <FormField
                      control={form.control}
                      name="consent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 bg-gradient-to-r from-muted/20 to-muted/10 rounded-lg border border-border/50 transition-all duration-200 hover:border-primary/30">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-consent"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">
                              <span className="font-medium">Analysis & Results Agreement</span>
                              <span className="text-[hsl(45,93%,58%)]">*</span>
                            </FormLabel>
                            <FormDescription className="text-muted-foreground">
                              I agree to receive my AI chatbot visibility analysis showing how ChatGPT, Google AI, and Perplexity see my business. 
                              No spam, no BS - just actionable AI optimization insights. Unsubscribe anytime.
                            </FormDescription>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Enhanced Submit Button with Credit Gating */}
                    <div className="pt-2">
                      {/* Show insufficient credits CTA if needed */}
                      {!credits.isLoadingBalance && !credits.canAffordScan(scanType) && !credits.canUseFreeScan && (
                        <div className="mb-3">
                          <BuyCreditsCTA
                            creditsNeeded={credits.getCreditShortfall(scanType)}
                            currentBalance={credits.creditBalance}
                            onPurchaseStart={() => {
                              toast({
                                title: "Redirecting to Checkout",
                                description: "Taking you to secure payment...",
                              });
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Show free scan message if applicable */}
                      {!credits.isLoadingBalance && credits.canUseFreeScan && (
                        <div className="mb-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg" data-testid="free-scan-available">
                          <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Using your monthly free scan
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        type="submit" 
                        className="w-full h-14 sm:h-16 text-base sm:text-lg font-bold consultation-gradient shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-primary/20"
                        disabled={
                          scanController.status === 'running' || 
                          credits.isLoadingBalance || 
                          (!credits.canAffordScan(scanType) && !credits.canUseFreeScan)
                        }
                        data-testid="button-submit"
                      >
                      {credits.isLoadingBalance ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          <span className="hidden sm:inline">Loading Credit Balance...</span>
                          <span className="sm:hidden">Loading Credits...</span>
                        </>
                      ) : scanController.status === 'running' ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          <span className="hidden sm:inline">Analyzing Your Schema Markup...</span>
                          <span className="sm:hidden">Analyzing Website...</span>
                        </>
                      ) : !credits.canAffordScan(scanType) && !credits.canUseFreeScan ? (
                        <>
                          <CreditCard className="mr-2 h-5 w-5" />
                          <span className="hidden sm:inline">Need {credits.getCreditRequirement(scanType)} Credits to Analyze</span>
                          <span className="sm:hidden">Need {credits.getCreditRequirement(scanType)} Credits</span>
                        </>
                      ) : credits.canUseFreeScan ? (
                        <>
                          <Zap className="mr-2 h-5 w-5" />
                          <span className="hidden sm:inline">Get Your FREE AI Visibility Score</span>
                          <span className="sm:hidden">Get FREE Score</span>
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-5 w-5" />
                          <span className="hidden sm:inline">Analyze Website (1 Credit)</span>
                          <span className="sm:hidden">Analyze Website</span>
                        </>
                      )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Enhanced Trust Indicators */}
            <div className="mt-6 sm:mt-8">
              <div className="text-center mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trusted by UK Businesses</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center group">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform duration-200 border border-primary/20">
                    <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-semibold">Real Schema Analysis</p>
                  <p className="text-xs text-muted-foreground/70 mt-1" style={{ animation: 'none', transform: 'none' }}>Google SDTT powered</p>
                </div>
                
                <div className="text-center group">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-chart-2/20 to-chart-2/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform duration-200 border border-chart-2/20">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-chart-2" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-semibold">Instant Results</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Email + dashboard</p>
                </div>
                
                <div className="text-center group">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform duration-200 border border-accent/20">
                    <Target className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-semibold">Military Precision</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">No fluff, just results</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Enhanced Results Section */
          <div className="space-y-6 sm:space-y-8">
            {/* Enhanced Score Display */}
            <Card className="bg-card border border-border shadow-xl overflow-hidden relative">
              {/* Brand accent for results */}
              <div className="absolute top-0 left-0 right-0 h-1 consultation-gradient"></div>
              
              <CardContent className="p-4 sm:p-6">
                <div className="text-center mb-6 sm:mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 border-2 border-primary/20 mb-4">
                    <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">Your AI Visibility Score</h2>
                  <div className="w-24 h-1 consultation-gradient mx-auto rounded-full mb-3"></div>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Analysis complete for <strong className="text-foreground">{result.website_url}</strong>
                  </p>
                </div>
                
                <div className="flex justify-center mb-6 sm:mb-8">
                  <div className="relative">
                    <ScoreMeter score={result.total_score || result.score || 0} animated={true} />
                    {/* Subtle glow effect around score meter */}
                    <div className="absolute inset-0 -m-4 rounded-full opacity-20 blur-xl bg-gradient-to-r from-primary/30 to-accent/30"></div>
                  </div>
                </div>

                {/* NEW: Score Breakdown for Transparency */}
                {(result.schema_score !== undefined || result.seo_score !== undefined) && (
                  <div className="mb-6 sm:mb-8">
                    <Card className="bg-gradient-to-r from-card/50 to-card/30 border border-border/50">
                      <CardContent className="p-4 sm:p-5">
                        <h3 className="font-bold mb-4 flex items-center text-sm sm:text-base text-center justify-center">
                          <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                          Score Breakdown
                        </h3>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                            <div className="text-2xl font-bold text-primary mb-1">{result.schema_score || 0}</div>
                            <div className="text-xs text-primary/80">Schema Markup</div>
                            <div className="text-xs text-muted-foreground mt-1">Structured Data</div>
                          </div>
                          <div className="text-center p-3 bg-gradient-to-br from-chart-2/10 to-chart-2/5 rounded-lg border border-chart-2/20">
                            <div className="text-2xl font-bold text-chart-2 mb-1">{result.seo_score || 0}</div>
                            <div className="text-xs text-chart-2/80">SEO Elements</div>
                            <div className="text-xs text-muted-foreground mt-1">Meta, H1, Images</div>
                          </div>
                          <div className="text-center p-3 bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg border border-accent/20">
                            <div className="text-2xl font-bold text-accent mb-1">{result.total_score || result.score || 0}</div>
                            <div className="text-xs text-accent/80">Total Score</div>
                            <div className="text-xs text-muted-foreground mt-1">Combined Analysis</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Progressive Loading Modal */}
                <ScanProgress
                  isOpen={scanController.status === 'running'}
                  status={scanController.status}
                  onCancel={scanController.cancelScan}
                  onClose={scanController.resetScan}
                  websiteUrl={form.getValues().website_url}
                  error={scanController.error || undefined}
                  data-testid="modal-scan-progress"
                />

                {/* Enhanced Lead Qualification */}
                {result.score !== undefined && (
                  <div className="text-center mb-6 sm:mb-8">
                    <div className="p-4 sm:p-6 bg-gradient-to-br from-muted/20 via-muted/15 to-muted/10 rounded-xl border border-border/50 relative overflow-hidden">
                      {/* Subtle accent line */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 to-accent/50"></div>
                      
                      <h3 className="text-lg sm:text-xl font-bold mb-3">
                        {getLeadQualificationMessage(result.score).title}
                      </h3>
                      <p className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
                        {getLeadQualificationMessage(result.score).message}
                      </p>
                      
                      {/* Enhanced Consultation CTA */}
                      <Button 
                        size="lg" 
                        className="consultation-gradient font-bold px-6 py-4 h-auto w-full text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-primary/20"
                        data-testid="button-consultation"
                        asChild
                      >
                        <a 
                          href="https://www.scopesite.co.uk/strategy-meeting-uk-web-design"
                          target="_parent"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center"
                        >
                          <span className="hidden sm:inline">Book FREE Strategy Session</span>
                          <span className="sm:hidden">Book FREE Strategy Call</span>
                          <ExternalLink className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* **NEW: PROFESSIONAL 7-AREA AI SEO ANALYSIS** */}
            {result.area_breakdown && (
              <Card className="bg-card border border-border shadow-lg hover-lift">
                <CardContent className="p-4 sm:p-6">
                  <div className="text-center mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold mb-2">Professional AI SEO Audit</h2>
                    <p className="text-sm text-muted-foreground">7-Area Comprehensive Analysis</p>
                  </div>

                  {/* Overall Score Display */}
                  <div className="text-center mb-8 p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/20">
                    <div className="text-4xl font-bold mb-2" style={{ 
                      color: (result.overall_score || result.score || 0) <= 40 ? 'hsl(0, 84%, 60%)' : 
                             (result.overall_score || result.score || 0) <= 70 ? 'hsl(45, 93%, 58%)' : 'hsl(142, 76%, 36%)'
                    }}>
                      {result.overall_score || result.score || 0}/100
                    </div>
                    <div className="text-sm font-semibold mb-1">
                      {(result.overall_score || result.score || 0) <= 40 ? 'Critical Issues Found' :
                       (result.overall_score || result.score || 0) <= 70 ? 'Good with Room for Improvement' :
                       'Excellent AI Visibility'}
                    </div>
                    <div className="text-xs text-muted-foreground">Overall AI Visibility Score</div>
                  </div>

                  {/* 7-Area Breakdown Grid */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {/* 1. Schema/Structured Data (25% weight) */}
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-300">Schema Data</h4>
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                          25% weight
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold mb-1 text-blue-700 dark:text-blue-300">
                        {result.area_breakdown.schema.score}/100
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                        Contributes {result.area_breakdown.schema.weightedScore} points
                      </div>
                      <div className="text-xs text-muted-foreground">
                        AI Assistant Recognition
                      </div>
                    </div>

                    {/* 2. Performance/Core Web Vitals (20% weight) */}
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm text-green-700 dark:text-green-300">Performance</h4>
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                          20% weight
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold mb-1 text-green-700 dark:text-green-300">
                        {result.area_breakdown.performance.score}/100
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 mb-2">
                        Contributes {result.area_breakdown.performance.weightedScore} points
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {result.performance_note || 'Core Web Vitals & Speed'}
                      </div>
                    </div>

                    {/* 3. Content Structure (20% weight) */}
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm text-purple-700 dark:text-purple-300">Content</h4>
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                          20% weight
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold mb-1 text-purple-700 dark:text-purple-300">
                        {result.area_breakdown.content.score}/100
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-400 mb-2">
                        Contributes {result.area_breakdown.content.weightedScore} points
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Heading Hierarchy & Quality
                      </div>
                    </div>

                    {/* 4. Image Optimization (15% weight) */}
                    <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm text-orange-700 dark:text-orange-300">Images</h4>
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                          15% weight
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold mb-1 text-orange-700 dark:text-orange-300">
                        {result.area_breakdown.images.score}/100
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-400 mb-2">
                        Contributes {result.area_breakdown.images.weightedScore} points
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Alt Text & Optimization
                      </div>
                    </div>

                    {/* 5. Accessibility (10% weight) */}
                    <div className="p-4 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/20 dark:to-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm text-teal-700 dark:text-teal-300">Accessibility</h4>
                        <Badge variant="secondary" className="text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                          10% weight
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold mb-1 text-teal-700 dark:text-teal-300">
                        {result.area_breakdown.accessibility.score}/100
                      </div>
                      <div className="text-xs text-teal-600 dark:text-teal-400 mb-2">
                        Contributes {result.area_breakdown.accessibility.weightedScore} points
                      </div>
                      <div className="text-xs text-muted-foreground">
                        WCAG Compliance
                      </div>
                    </div>

                    {/* 6. Technical SEO (10% weight) */}
                    <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm text-red-700 dark:text-red-300">Technical SEO</h4>
                        <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                          10% weight
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold mb-1 text-red-700 dark:text-red-300">
                        {result.area_breakdown.technicalSeo.score}/100
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400 mb-2">
                        Contributes {result.area_breakdown.technicalSeo.weightedScore} points
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Crawlability & Meta Tags
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* **AI COMMENTARY SECTIONS** */}
            {result.ai_commentary && (
              <div className="space-y-4">
                {/* Schema Analysis with AI Commentary */}
                <Card className="bg-card border border-border shadow-lg">
                  <CardContent className="p-4 sm:p-5">
                    <h3 className="font-bold mb-4 flex items-center text-sm sm:text-base">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-lg flex items-center justify-center mr-3 border border-blue-500/20">
                        <Search className="w-4 h-4 text-blue-600" />
                      </div>
                      Structured Data Analysis
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {result.area_breakdown?.schema.score || 0}/100
                      </Badge>
                    </h3>
                    
                    {result.ai_commentary.schema.length > 0 ? (
                      <div className="space-y-2">
                        {result.ai_commentary.schema.slice(0, 4).map((comment, index) => (
                          <div key={index} className="text-sm p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <span className="text-blue-700 dark:text-blue-300">{comment}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No schema data found - missing key AI visibility opportunities</p>
                    )}
                  </CardContent>
                </Card>

                {/* Performance Analysis with AI Commentary */}
                <Card className="bg-card border border-border shadow-lg">
                  <CardContent className="p-4 sm:p-5">
                    <h3 className="font-bold mb-4 flex items-center text-sm sm:text-base">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-lg flex items-center justify-center mr-3 border border-green-500/20">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                      Performance & Core Web Vitals
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {result.area_breakdown?.performance.score || 0}/100
                      </Badge>
                    </h3>
                    
                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <div className="text-sm font-medium text-green-700 dark:text-green-300">Load Time</div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {result.estimated_load_time ? `${result.estimated_load_time}s` : 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground">{result.performance_note}</div>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <div className="text-sm font-medium text-green-700 dark:text-green-300">Blocking Resources</div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {result.render_blocking_resources || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Resources affecting speed</div>
                      </div>
                    </div>
                    
                    {result.ai_commentary.performance.length > 0 && (
                      <div className="space-y-2">
                        {result.ai_commentary.performance.slice(0, 3).map((comment, index) => (
                          <div key={index} className="text-sm p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                            <span className="text-green-700 dark:text-green-300">{comment}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Content Structure Analysis */}
                <Card className="bg-card border border-border shadow-lg">
                  <CardContent className="p-4 sm:p-5">
                    <h3 className="font-bold mb-4 flex items-center text-sm sm:text-base">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-lg flex items-center justify-center mr-3 border border-purple-500/20">
                        <Eye className="w-4 h-4 text-purple-600" />
                      </div>
                      Content Structure & Hierarchy
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {result.area_breakdown?.content.score || 0}/100
                      </Badge>
                    </h3>
                    
                    {/* Heading Analysis */}
                    <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <div className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Heading Structure</div>
                      <div className="text-xs text-muted-foreground">
                        H1 Tags: {result.h1_count || 0} | Total headings found in page structure
                      </div>
                    </div>
                    
                    {result.ai_commentary.content.length > 0 && (
                      <div className="space-y-2">
                        {result.ai_commentary.content.slice(0, 3).map((comment, index) => (
                          <div key={index} className="text-sm p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <span className="text-purple-700 dark:text-purple-300">{comment}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Legacy Comprehensive SEO Analysis */}
            <Card className="bg-card border border-border shadow-lg hover-lift">
              <CardContent className="p-4 sm:p-5">
                <h3 className="font-bold mb-4 flex items-center text-sm sm:text-base">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center mr-3 border border-primary/20">
                    <Search className="w-4 h-4 text-primary" />
                  </div>
                  Technical SEO Details
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {/* Meta Tags Analysis */}
                  <div className="p-4 bg-gradient-to-r from-muted/10 to-muted/5 rounded-xl border border-border/50">
                    <h4 className="font-semibold mb-3 text-sm flex items-center">
                      <Eye className="w-4 h-4 mr-2 text-chart-1" />
                      Meta Tags
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Title Length:</span>
                        <span className={`font-medium ${
                          (result.meta_title_length || 0) >= 30 && (result.meta_title_length || 0) <= 60 
                            ? 'text-chart-2' : 'text-[hsl(45,93%,58%)]'
                        }`}>
                          {result.meta_title_length || 0} chars
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Description Length:</span>
                        <span className={`font-medium ${
                          (result.meta_description_length || 0) >= 120 && (result.meta_description_length || 0) <= 160 
                            ? 'text-chart-2' : 'text-[hsl(45,93%,58%)]'
                        }`}>
                          {result.meta_description_length || 0} chars
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Open Graph:</span>
                        <span className={`font-medium ${
                          result.og_title && result.og_description ? 'text-chart-2' : 'text-[hsl(45,93%,58%)]'
                        }`}>
                          {result.og_title && result.og_description ? 'Configured' : 'Missing'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Twitter Cards:</span>
                        <span className={`font-medium ${
                          result.twitter_card ? 'text-chart-2' : 'text-[hsl(45,93%,58%)]'
                        }`}>
                          {result.twitter_card ? 'Configured' : 'Missing'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Technical SEO Analysis */}
                  <div className="p-4 bg-gradient-to-r from-muted/10 to-muted/5 rounded-xl border border-border/50">
                    <h4 className="font-semibold mb-3 text-sm flex items-center">
                      <Target className="w-4 h-4 mr-2 text-chart-3" />
                      Technical SEO
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">H1 Tags:</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${
                            (result.h1_count || 0) === 1 ? 'text-chart-2' : 'text-[hsl(45,93%,58%)]'
                          }`}>
                            {result.h1_count || 0} {(result.h1_count || 0) === 1 ? '(Perfect)' : '(Fix needed)'}
                          </span>
                          {(result.h1_count || 0) !== 1 && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-6 text-xs px-2"
                              onClick={() => setH1EvidenceOpen(true)}
                              data-testid="button-h1-evidence"
                            >
                              View evidence
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Robots.txt:</span>
                        <span className={`font-medium ${
                          result.robots_txt_status === 'found' ? 'text-chart-2' : 'text-[hsl(45,93%,58%)]'
                        }`}>
                          {result.robots_txt_status === 'found' ? 'Found' : 'Missing'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sitemap:</span>
                        <span className={`font-medium ${
                          result.sitemap_status === 'found' ? 'text-chart-2' : 'text-[hsl(45,93%,58%)]'
                        }`}>
                          {result.sitemap_status === 'found' ? 'Found' : 'Missing'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Favicon:</span>
                        <span className={`font-medium ${
                          result.favicon_status === 'found' ? 'text-chart-2' : 'text-[hsl(45,93%,58%)]'
                        }`}>
                          {result.favicon_status === 'found' ? 'Found' : 'Missing'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Image Optimization */}
                  <div className="p-4 bg-gradient-to-r from-muted/10 to-muted/5 rounded-xl border border-border/50">
                    <h4 className="font-semibold mb-3 text-sm flex items-center">
                      <Eye className="w-4 h-4 mr-2 text-chart-4" />
                      Image Optimization
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Images:</span>
                        <span className="font-medium">{result.images_total || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">With Alt Text:</span>
                        <span className="font-medium">{result.images_with_alt || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Coverage:</span>
                        <span className={`font-medium ${
                          (result.images_alt_percentage || 0) >= 90 ? 'text-chart-2' :
                          (result.images_alt_percentage || 0) >= 70 ? 'text-yellow-600' : 'text-[hsl(45,93%,58%)]'
                        }`}>
                          {result.images_alt_percentage || 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Link Analysis */}
                  <div className="p-4 bg-gradient-to-r from-muted/10 to-muted/5 rounded-xl border border-border/50">
                    <h4 className="font-semibold mb-3 text-sm flex items-center">
                      <ExternalLink className="w-4 h-4 mr-2 text-chart-5" />
                      Link Analysis
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Internal Links:</span>
                        <span className="font-medium">{result.internal_links_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">External Links:</span>
                        <span className="font-medium">{result.external_links_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Language Attr:</span>
                        <span className={`font-medium ${
                          result.lang_attribute ? 'text-chart-2' : 'text-[hsl(45,93%,58%)]'
                        }`}>
                          {result.lang_attribute ? 'Set' : 'Missing'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hreflang:</span>
                        <span className={`font-medium ${
                          result.has_hreflang ? 'text-chart-2' : 'text-muted-foreground'
                        }`}>
                          {result.has_hreflang ? 'Present' : 'Not Set'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Crawler Access Panel */}
            {result.website_url && (
              <AiCrawlerAccess origin={result.website_url} />
            )}

            {/* Open Graph & Twitter Cards Panel */}
            {result.website_url && (
              <OpenGraphTwitter url={result.website_url} />
            )}

            {/* Enhanced Found Schemas */}
            {result.found_schemas && (
              <Card className="bg-card border border-border shadow-lg hover-lift">
                <CardContent className="p-4 sm:p-5">
                  <h3 className="font-bold mb-4 flex items-center text-sm sm:text-base">
                    <div className="w-8 h-8 bg-gradient-to-br from-chart-2/20 to-chart-2/10 rounded-lg flex items-center justify-center mr-3 border border-chart-2/20">
                      <CheckCircle className="w-4 h-4 text-chart-2" />
                    </div>
                    Schema Markup Detected
                  </h3>
                  <div className="p-4 bg-gradient-to-r from-chart-2/15 to-chart-2/5 rounded-xl border border-chart-2/20">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {result.found_schemas.split(', ').filter(Boolean).map((schema, index) => (
                        <Badge 
                          key={index}
                          variant="secondary" 
                          className="text-xs bg-chart-2/20 text-chart-2 border-chart-2/30 hover:bg-chart-2/30"
                          data-testid={`schema-chip-${schema.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {schema.trim()}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-chart-2/70 text-xs">These structured data schemas help AI systems understand your business</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tech Stack Fingerprint - BuiltWith Integration */}
            {(result.final_url || result.website_url) && (
              <TechStackSignals 
                domain={result.final_url || result.website_url || ""} 
                className="hover-lift"
              />
            )}

            {/* Enhanced Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <Card className="bg-card border border-border shadow-lg hover-lift">
                <CardContent className="p-4 sm:p-5">
                  <h3 className="font-bold mb-4 flex items-center text-sm sm:text-base">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center mr-3 border border-primary/20">
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                    Action Plan to Boost Your Score
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    {result.recommendations.slice(0, 4).map((rec, index) => {
                      const [title, description] = rec.split(':');
                      return (
                        <div key={index} className="group p-4 bg-gradient-to-r from-muted/15 to-muted/5 rounded-xl border border-border/50 transition-all duration-200 hover:border-primary/30 hover:shadow-md">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center mt-0.5">
                              <span className="text-primary font-bold text-xs">{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-primary mb-2 text-sm sm:text-base group-hover:text-primary/80 transition-colors">{title?.trim()}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description?.trim()}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Final CTA */}
            <div className="text-center">
              <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 border border-primary/30 shadow-xl overflow-hidden relative">
                {/* Accent elements */}
                <div className="absolute top-0 left-0 right-0 h-1 consultation-gradient"></div>
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/5 rounded-full blur-xl"></div>
                <div className="absolute -bottom-8 -left-8 w-16 h-16 bg-accent/5 rounded-full blur-lg"></div>
                
                <CardContent className="p-4 sm:p-6 relative">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/20 border-2 border-primary/30 mb-4">
                      <Target className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold mb-3">Ready to Dominate AI Assistant Results?</h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
                      Your AI chatbot visibility analysis is in your inbox. Now let's make your business <strong className="text-foreground">visible to ChatGPT, Google AI, and Perplexity</strong>.
                    </p>
                  </div>
                  
                  <div className="space-y-3 sm:space-y-4">
                    <Button 
                      size="lg" 
                      className="consultation-gradient font-bold px-6 py-4 h-auto w-full text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-primary/20"
                      asChild
                    >
                      <a 
                        href="https://www.scopesite.co.uk/strategy-meeting-uk-web-design"
                        target="_parent"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center"
                      >
                        <span className="hidden sm:inline">Book FREE 30-Min Strategy Call</span>
                        <span className="sm:hidden">Book FREE Strategy Call</span>
                        <ExternalLink className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                      </a>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setResult(null);
                        form.reset();
                      }}
                      className="w-full h-12 border-2 transition-all duration-200 hover:border-primary/50 hover:bg-primary/5"
                      size="sm"
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Analyze Another Website
                    </Button>
                  </div>
                  
                  {/* Trust badge */}
                  <div className="mt-6 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 mr-1 text-chart-2" />
                      Veteran-owned • BULL$#!T Free Analysis • Results Guaranteed
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* H1 Evidence Dialog */}
        {result && (
          <H1EvidenceDialog
            open={h1EvidenceOpen}
            onOpenChange={setH1EvidenceOpen}
            h1s={result.h1_evidence || []}
          />
        )}
        
      </main>

      {/* Compact Footer */}
      <footer className="border-t border-border bg-card/30 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="text-center text-xs text-muted-foreground">
            <p><strong>Scopesite - AI Chatbot Visibility Specialists | ChatGPT & Perplexity Optimization</strong></p>
          </div>
        </div>
      </footer>
    </div>
  );
}