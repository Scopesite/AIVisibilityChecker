import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { CheckCircle, Target, Loader2, AlertTriangle, LogOut, Sparkles, Unlock, History, CreditCard } from "lucide-react";
import voiceLogo from '@assets/Untitled (350 x 250 px)_1758732653247.png';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ComprehensiveAnalysisResults from "@/components/ComprehensiveAnalysisResults";
import FreeScanResults from "@/components/FreeScanResults";
import { useCredits } from "@/hooks/useCredits";
import { useAIAnalysis } from "@/hooks/useAIAnalysis";
import useScanController from "@/hooks/useScanController";
import { useAuth } from "@/hooks/useAuth";

// Form schema for authenticated users (URL only)
const authenticatedFormSchema = z.object({
  website_url: z.string()
    .min(1, "Website URL is required")
    .transform((url) => {
      // Add https:// if no protocol is provided
      if (!/^https?:\/\//i.test(url)) {
        return `https://${url}`;
      }
      return url;
    })
    .refine((url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }, "Please enter a valid website URL"),
  consent: z.boolean().refine(val => val === true, "Consent is required")
});

// Form schema for unauthenticated users (URL + email)
const unauthenticatedFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  website_url: z.string()
    .min(1, "Website URL is required")
    .transform((url) => {
      // Add https:// if no protocol is provided
      if (!/^https?:\/\//i.test(url)) {
        return `https://${url}`;
      }
      return url;
    })
    .refine((url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }, "Please enter a valid website URL"),
  consent: z.boolean().refine(val => val === true, "Consent is required")
});

type AuthenticatedFormData = z.infer<typeof authenticatedFormSchema>;
type UnauthenticatedFormData = z.infer<typeof unauthenticatedFormSchema>;

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export default function AIVisibilityChecker() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { toast } = useToast();
  
  // Check authentication status using the updated hook
  const { user, isLoading: isLoadingUser, isAuthenticated } = useAuth();
  
  // Credit system integration
  const { availableCredits, scanCost, canAffordScan, getInsufficientCreditsMessage } = useCredits();
  
  // AI analysis hook (now returns comprehensive scan results)
  const { startAnalysis, scanResult, analysisResult, isAnalyzing, analysisError, clearResults } = useAIAnalysis();
  
  // Scan controller for free scans (unauthenticated users)
  const scanController = useScanController();

  // Form setup - different schemas based on auth status
  const authenticatedForm = useForm<AuthenticatedFormData>({
    resolver: zodResolver(authenticatedFormSchema),
    defaultValues: {
      website_url: "",
      consent: false,
    },
  });

  const unauthenticatedForm = useForm<UnauthenticatedFormData>({
    resolver: zodResolver(unauthenticatedFormSchema),
    defaultValues: {
      email: "",
      website_url: "",
      consent: false,
    },
  });

  // Handle initial loading
  useEffect(() => {
    setIsInitialLoading(false);
  }, []);

  // Form submission for authenticated users
  const onAuthenticatedSubmit = async (data: AuthenticatedFormData) => {
    if (!canAffordScan()) {
      const message = getInsufficientCreditsMessage();
      toast({
        title: "Insufficient Credits",
        description: `${message} Click here to purchase credits.`,
        variant: "destructive",
        action: (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => window.location.href = '/credits'}
          >
            Buy Credits
          </Button>
        )
      });
      return;
    }

    try {
      clearResults();
      await startAnalysis(data.website_url);
      toast({
        title: "Analysis Started",
        description: "AI is analyzing your website for optimization opportunities.",
      });
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to start analysis",
        variant: "destructive",
      });
    }
  };

  // Form submission for unauthenticated users - first free scan
  const onUnauthenticatedSubmit = async (data: UnauthenticatedFormData) => {
    try {
      clearResults();
      await scanController.startFreeScan(data.email, data.website_url);
      toast({
        title: "Analysis Started",
        description: "AI is analyzing your website for optimization opportunities.",
      });
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to start analysis",
        variant: "destructive",
      });
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Use the correct logout endpoint (GET /api/logout)
      window.location.href = '/api/logout';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };


  // Loading screen
  if (isInitialLoading || isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#2C3E50' }}>
        <div className="text-center">
          {/* V.O.I.C.E Logo */}
          <div className="mb-8">
            <div className="relative inline-flex items-center justify-center">
              {/* Concentric circles logo */}
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-4" style={{ borderColor: '#F39C12' }}></div>
                <div className="absolute inset-2 rounded-full border-3" style={{ borderColor: '#F39C12', opacity: 0.7 }}></div>
                <div className="absolute inset-4 rounded-full border-2" style={{ borderColor: '#F39C12', opacity: 0.5 }}></div>
                <div className="absolute inset-6 rounded-full" style={{ backgroundColor: '#F39C12', opacity: 0.3 }}></div>
              </div>
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-2">
            AI Visibility Checker
          </h1>
          
          {/* Gold underline */}
          <div className="w-32 h-1 mx-auto mb-8" style={{ backgroundColor: '#F39C12' }}></div>
          
          {/* Loading text */}
          <div className="text-white text-lg font-medium mb-8">
            Initializing AI visibility...
          </div>
          
          {/* Powered by text */}
          <div className="text-gray-400 text-sm">
            Powered by Google's Structured Data Testing Tool
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Page Title Section */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={voiceLogo} 
                alt="V.O.I.C.E™ AI Visibility Architecture" 
                className="h-8 w-auto"
              />
              <div>
                <h1 className="text-lg font-bold">AI Action Plan Generator</h1>
                <p className="text-sm text-muted-foreground">Powered by V.O.I.C.E™ methodology</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Get Your AI Visibility Action Plan
          </h2>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Discover exactly how to make your business visible to ChatGPT, Google AI, and other AI assistants. 
            Get personalized recommendations and ready-to-use JSON-LD schema markup.
          </p>
        </div>

        {/* Analysis Form or Login */}
        {isAuthenticated ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Website Analysis</CardTitle>
              <CardDescription>
                Enter your website URL to get AI-powered recommendations (1 credit)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...authenticatedForm}>
                <form onSubmit={authenticatedForm.handleSubmit(onAuthenticatedSubmit)} className="space-y-4">
                  <FormField
                    control={authenticatedForm.control}
                    name="website_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com" 
                            data-testid="input-website-url"
                            {...field} 
                            disabled={isAnalyzing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={authenticatedForm.control}
                    name="consent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isAnalyzing}
                            data-testid="checkbox-consent"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm">
                            I consent to website analysis and receiving recommendations
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {/* Credit Cost Display */}
                  <div className="flex items-center justify-between text-sm p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span>Scan Cost: {scanCost} credit{scanCost !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground">Your Balance:</span>
                      <Badge variant={availableCredits >= scanCost ? "default" : "destructive"} className="font-mono">
                        {availableCredits}
                      </Badge>
                      {availableCredits < scanCost && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          asChild
                          className="h-6 px-2 text-xs"
                        >
                          <a href="/credits">Buy More</a>
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isAnalyzing || !canAffordScan()}
                    data-testid="button-analyze-website"
                  >
                    {isAnalyzing ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing Website...
                      </div>
                    ) : (
                      `Analyze Website (${scanCost} Credit)`
                    )}
                  </Button>
                  
                  {!canAffordScan() && (
                    <p className="text-sm text-destructive text-center">
                      {getInsufficientCreditsMessage()}
                    </p>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Get Your FREE AI Visibility Analysis</CardTitle>
              <CardDescription>
                Enter your email and website URL to get your first analysis free
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...unauthenticatedForm}>
                <form onSubmit={unauthenticatedForm.handleSubmit(onUnauthenticatedSubmit)} className="space-y-4">
                  <FormField
                    control={unauthenticatedForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="your@email.com" 
                            data-testid="input-email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={unauthenticatedForm.control}
                    name="website_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com" 
                            data-testid="input-website-url-unauth"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={unauthenticatedForm.control}
                    name="consent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-consent-unauth"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm">
                            I consent to website analysis and receiving recommendations
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={scanController.status === 'running'}
                    data-testid="button-start-free-analysis"
                  >
                    {scanController.status === 'running' ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing Website...
                      </div>
                    ) : (
                      'Start Your FREE Analysis'
                    )}
                  </Button>
                  
                  <p className="text-sm text-muted-foreground text-center">
                    No account required for your first free scan
                  </p>
                </form>
              </Form>
              
              <div className="mt-6 pt-6 border-t">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Already visited before? Just{" "}
                    <Link href="/login" className="text-primary hover:underline">
                      log-in here
                    </Link>{" "}
                    or{" "}
                    <Link href="/register" className="text-primary hover:underline">
                      register
                    </Link>{" "}
                    for unlimited credits
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis Error */}
        {analysisError && (
          <Card className="mb-8 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <p className="font-medium">Analysis Failed</p>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {analysisError.message || "An error occurred during analysis"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Free Scan Error */}
        {scanController.error && (
          <Card className="mb-8 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <p className="font-medium">Free Analysis Failed</p>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {scanController.error.includes('already used') 
                  ? 'This email has already been used for a free scan. Please create an account for unlimited analyses.' 
                  : scanController.error}
              </p>
              {scanController.error.includes('already used') && (
                <div className="flex gap-2 mt-4">
                  <Button size="sm" asChild>
                    <Link href="/register">Create Free Account</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {scanResult && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <h3 className="text-2xl font-bold">Your Complete Analysis</h3>
              <Badge variant="secondary" className="ml-2">
                {scanResult.remainingCredits} credits remaining
              </Badge>
            </div>
            <ComprehensiveAnalysisResults scanResult={scanResult} />
          </div>
        )}

        {/* Free Scan Results */}
        {scanController.result && !isAuthenticated && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <h3 className="text-2xl font-bold">Your Free Analysis Complete</h3>
              <Badge variant="secondary" className="ml-2">
                Free Scan
              </Badge>
            </div>
            <FreeScanResults scanResult={scanController.result} />
          </div>
        )}

        {/* Post-Free-Scan CTA to Create Account */}
        {scanController.result && !isAuthenticated && (
          <div className="mb-8">
            <Card className="border-2 border-[#F39C12] bg-gradient-to-br from-orange-50 to-amber-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="bg-[#F39C12] rounded-full p-3">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Love Your Free Analysis?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create an account to unlock powerful features and get unlimited AI visibility scans
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                      <Unlock className="h-5 w-5 text-[#F39C12]" />
                      <div className="text-left">
                        <div className="font-semibold text-sm">Unlimited Scans</div>
                        <div className="text-xs text-gray-600">Analyze as many websites as you need</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                      <History className="h-5 w-5 text-[#F39C12]" />
                      <div className="text-left">
                        <div className="font-semibold text-sm">Save Results</div>
                        <div className="text-xs text-gray-600">Access your analysis history anytime</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                      <Target className="h-5 w-5 text-[#F39C12]" />
                      <div className="text-left">
                        <div className="font-semibold text-sm">Priority Support</div>
                        <div className="text-xs text-gray-600">Get help when you need it most</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      asChild 
                      className="w-full sm:w-auto"
                      style={{ backgroundColor: '#F39C12', borderColor: '#F39C12' }}
                    >
                      <Link href="/register" data-testid="cta-register-button">
                        Create Free Account
                      </Link>
                    </Button>
                    <Button 
                      asChild
                      variant="outline" 
                      className="w-full sm:w-auto border-[#F39C12] text-[#F39C12] hover:bg-[#F39C12] hover:text-white"
                    >
                      <Link href="/login" data-testid="cta-login-button">
                        Already Have Account?
                      </Link>
                    </Button>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-4">
                    Join thousands of users optimizing their AI visibility
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>About AI Visibility Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">What We Analyze</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Schema markup and structured data</li>
                  <li>• Meta tags and content optimization</li>
                  <li>• AI crawler accessibility</li>
                  <li>• Business information completeness</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">What You Get</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Prioritized action plan</li>
                  <li>• Ready-to-paste JSON-LD schema</li>
                  <li>• AI visibility recommendations</li>
                  <li>• Implementation guidance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
