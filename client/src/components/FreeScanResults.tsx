import React from "react";
import { CheckCircle, Target, ExternalLink, TrendingUp, Crown, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FreeScanResult {
  aiVisibilityScore?: number;
  seoScore?: number;
  totalScore?: number;
  score?: number;
  website_url?: string;
  recommendations?: string[];
  band?: string;
  zone?: 'RED' | 'AMBER' | 'GREEN';
  zone_color?: string;
  // Support nested analysis from free scan API
  analysis?: {
    aiVisibilityScore?: number;
    ai?: {
      prioritised_actions?: Array<{
        task: string;
        impact: string;
        effort: string;
        where: string[];
      }>;
    };
  };
}

interface FreeScanResultsProps {
  scanResult: FreeScanResult;
}

// Simple Score Meter for Free Scan Results
function SimpleScoreMeter({ score }: { score: number }) {
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
  
  const rotation = ((score / 100) * 180) - 90; // -90deg to 90deg range

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
              ${getScoreColor(score)} 0deg,
              ${getScoreColor(score)} ${(score / 100) * 180}deg,
              transparent ${(score / 100) * 180}deg,
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
        <div className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: getScoreColor(score) }}>
          {Math.round(score)}
        </div>
        <div className="text-sm sm:text-lg font-semibold mb-1" style={{ color: getScoreColor(score) }}>
          {getScoreBand(score)}
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">AI Chatbot Visibility Score</div>
      </div>
    </div>
  );
}

export default function FreeScanResults({ scanResult }: FreeScanResultsProps) {
  // Extract the score from various possible fields, including nested analysis
  const score = scanResult.totalScore || scanResult.aiVisibilityScore || scanResult.score || 
               (scanResult as any)?.analysis?.aiVisibilityScore || 0;
  
  const getLeadQualificationMessage = (score: number) => {
    if (score <= 30) {
      return {
        title: "Critical AI Visibility Gap",
        message: "Your business is invisible to ChatGPT and AI assistants. You're missing out on potential customers who use AI to find businesses like yours.",
        cta: "Get your FREE strategy session to become visible on AI platforms"
      };
    } else if (score <= 65) {
      return {
        title: "Partially Visible to AI Assistants", 
        message: "You're making progress, but AI chatbots still struggle to understand your business. There's significant room for improvement.",
        cta: "Get your FREE consultation to maximize AI chatbot visibility"
      };
    } else {
      return {
        title: "AI Assistant Ready Business",
        message: "Great start! ChatGPT and other AI assistants can find your business, but there's still room to optimize for better visibility.",
        cta: "Book your FREE strategy call to dominate AI search results"
      };
    }
  };

  const leadMessage = getLeadQualificationMessage(score);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Score Display */}
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
              Free analysis complete for <strong className="text-foreground">{scanResult.website_url}</strong>
            </p>
          </div>
          
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="relative">
              <SimpleScoreMeter score={score} />
              {/* Subtle glow effect around score meter */}
              <div className="absolute inset-0 -m-4 rounded-full opacity-20 blur-xl bg-gradient-to-r from-primary/30 to-accent/30"></div>
            </div>
          </div>

          {/* Lead Qualification Message */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="p-4 sm:p-6 bg-gradient-to-br from-muted/20 via-muted/15 to-muted/10 rounded-xl border border-border/50 relative overflow-hidden">
              {/* Subtle accent line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 to-accent/50"></div>
              
              <h3 className="text-lg sm:text-xl font-bold mb-3">
                {leadMessage.title}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
                {leadMessage.message}
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
        </CardContent>
      </Card>

      {/* Basic Recommendations (if available) */}
      {((scanResult.recommendations && scanResult.recommendations.length > 0) || 
        ((scanResult as any)?.analysis?.ai?.prioritised_actions && 
         (scanResult as any).analysis.ai.prioritised_actions.length > 0)) && (
        <Card className="bg-card border border-border shadow-lg">
          <CardContent className="p-4 sm:p-5">
            <h3 className="font-bold mb-4 flex items-center text-sm sm:text-base">
              <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center mr-3 border border-primary/20">
                <Target className="w-4 h-4 text-primary" />
              </div>
              Quick Wins to Improve Your Score
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {(() => {
                // Use recommendations from either legacy format or new analysis format
                const recommendations = scanResult.recommendations || 
                  ((scanResult as any)?.analysis?.ai?.prioritised_actions?.map((action: any) => 
                    `${action.task}: ${action.impact} impact, ${action.effort} effort`
                  )) || [];
                
                return recommendations.slice(0, 3).map((rec: string, index: number) => {
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
                });
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade to Full Analysis CTA */}
      <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-amber-500/20 border-2 border-amber-500/30 mb-4">
            <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold flex items-center justify-center space-x-2">
            <span>Want the Complete Analysis?</span>
          </CardTitle>
          <CardDescription className="text-base sm:text-lg">
            This free scan shows your basic AI visibility score. Get the full professional analysis with detailed recommendations, technical SEO audit, and step-by-step action plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-amber-100/20 border border-amber-200/50 rounded-lg">
              <h4 className="font-semibold text-amber-700 mb-2">What You Get:</h4>
              <ul className="text-sm text-amber-600 space-y-1">
                <li>• Complete 7-area SEO analysis</li>
                <li>• Schema markup recommendations</li>
                <li>• Technical SEO audit</li>
                <li>• Performance optimization tips</li>
              </ul>
            </div>
            <div className="p-4 bg-amber-100/20 border border-amber-200/50 rounded-lg">
              <h4 className="font-semibold text-amber-700 mb-2">Plus Advanced Features:</h4>
              <ul className="text-sm text-amber-600 space-y-1">
                <li>• AI crawler access analysis</li>
                <li>• Open Graph optimization</li>
                <li>• Image alt text audit</li>
                <li>• Detailed action plan</li>
              </ul>
            </div>
          </div>
          
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold px-6 py-4 h-auto w-full text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            data-testid="button-upgrade-full-analysis"
            asChild
          >
            <a href="/register" className="flex items-center justify-center">
              <Crown className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Upgrade to Full Professional Analysis</span>
              <span className="sm:hidden">Get Full Analysis</span>
            </a>
          </Button>
          
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-4">
            Requires account registration • Full analysis uses 1 credit • Professional insights included
          </p>
        </CardContent>
      </Card>

      {/* Additional Credit Purchase CTA */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4 sm:p-6 text-center">
          <h3 className="text-lg sm:text-xl font-bold mb-3 text-blue-900 dark:text-blue-100">
            Ready for More AI Analysis?
          </h3>
          <p className="text-sm sm:text-base text-blue-700 dark:text-blue-200 mb-4">
            Purchase credits now and get detailed AI analysis for unlimited websites. Start with our Starter Pack for just £29.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Button 
              size="lg" 
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-200 dark:hover:bg-blue-900/20"
              data-testid="button-starter-pack-free-scan"
              asChild
            >
              <a href="/credits" className="flex items-center justify-center">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Starter Pack - £29</span>
              </a>
            </Button>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
              data-testid="button-pro-pack-free-scan"
              asChild
            >
              <a href="/credits" className="flex items-center justify-center">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Pro Pack - £99</span>
              </a>
            </Button>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
            50 credits (Starter) • 250 credits (Pro) • No subscription required
          </p>
        </CardContent>
      </Card>
    </div>
  );
}