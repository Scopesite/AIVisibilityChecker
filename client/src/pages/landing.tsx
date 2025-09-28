import { Target, TrendingUp, Search, Eye, CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
// import aiVisibilityImage from '@assets/AISEOCHECKER_1759002967998.png';


export default function Landing() {
  const handleLogin = () => {
    // Navigate to the AI visibility checker page which will show login tabs for unauthenticated users
    window.location.href = "/ai-visibility-checker";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        {/* Header with Logo */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-8">
            <div className="text-5xl font-bold text-[#F39C12]">V.O.I.C.E™</div>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Visibility Optimization Intelligence for Conversational Engines
          </p>
        </div>

        {/* Value Proposition */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Get your FREE AI Visibility Score
          </h2>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Discover how visible your business is to AI chatbots like ChatGPT, Gemini, and Claude. 
            Most businesses are invisible - don't let yours be one of them.
          </p>

          {/* AI Visibility Placeholder */}
          <div className="mb-12 flex justify-center">
            <div className="max-w-md p-8 bg-gradient-to-br from-[#F39C12]/10 to-[#F39C12]/20 rounded-lg shadow-lg border border-[#F39C12]/20">
              <div className="text-center">
                <div className="text-6xl mb-4">🤖</div>
                <p className="text-lg font-semibold text-gray-700">
                  89% of businesses are not being recommended by AI chatbots
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Find out your AI visibility score
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
            data-testid="button-login"
          >
            <Target className="mr-2 h-5 w-5" />
            Start Your FREE Analysis
          </Button>

          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • Results in under 60 seconds
          </p>
          
          {/* Returning Users Message */}
          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-foreground">
              <span className="font-medium">Already visited before?</span> Just{" "}
              <Link href="/login">
                <span className="text-primary hover:text-primary/80 underline cursor-pointer font-medium" data-testid="link-login">
                  log-in here
                </span>
              </Link>
              {" "}or{" "}
              <Link href="/register">
                <span className="text-primary hover:text-primary/80 underline cursor-pointer font-medium" data-testid="link-register">
                  register
                </span>
              </Link>
              {" "}for unlimited credits
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          {/* AI Visibility Analysis */}
          <Card className="border-border/50 hover:border-primary/20 transition-colors duration-300">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-3">AI Visibility Analysis</h3>
              <p className="text-muted-foreground leading-relaxed">
                Comprehensive analysis of your website's visibility to ChatGPT, Gemini, Claude, and other AI systems
              </p>
            </CardContent>
          </Card>

          {/* Schema Markup Audit */}
          <Card className="border-border/50 hover:border-primary/20 transition-colors duration-300">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-3">Schema Markup Audit</h3>
              <p className="text-muted-foreground leading-relaxed">
                Professional evaluation of your structured data and SEO elements that AI systems rely on
              </p>
            </CardContent>
          </Card>

          {/* Actionable Recommendations */}
          <Card className="border-border/50 hover:border-primary/20 transition-colors duration-300">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-3">Expert Recommendations</h3>
              <p className="text-muted-foreground leading-relaxed">
                Specific, prioritized actions to make your business more visible to AI chatbots and assistants
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trust Indicators */}
        <div className="max-w-3xl mx-auto text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-primary mb-1">98%</div>
              <div className="text-sm text-muted-foreground">Accuracy Rate</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-primary mb-1">60s</div>
              <div className="text-sm text-muted-foreground">Analysis Time</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-primary mb-1">1000+</div>
              <div className="text-sm text-muted-foreground">Sites Analyzed</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-primary mb-1">Free</div>
              <div className="text-sm text-muted-foreground">First Check</div>
            </div>
          </div>

          {/* V.O.I.C.E™ Branding */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
            <div className="text-sm font-semibold text-primary mb-2">
              Powered by V.O.I.C.E™ AI Visibility Architecture
            </div>
            <p className="text-sm text-muted-foreground">
              The industry-leading framework for optimizing business visibility across AI platforms and chatbot ecosystems
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}