import { useState } from "react";
import { Check, Crown, Zap, Building, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Import pricing data and types from server
type PlanKey = "starter" | "solo" | "pro" | "studio" | "agency";

const PRICING: Record<PlanKey, {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  credits: number;
  pencePerCredit: number;
}> = {
  starter: {
    name: "Starter",
    monthlyPrice: 12,
    annualPrice: 120,
    credits: 20,
    pencePerCredit: 60
  },
  solo: {
    name: "Solo", 
    monthlyPrice: 25,
    annualPrice: 250,
    credits: 60,
    pencePerCredit: 42
  },
  pro: {
    name: "Pro",
    monthlyPrice: 49,
    annualPrice: 490,
    credits: 150,
    pencePerCredit: 33
  },
  studio: {
    name: "Studio",
    monthlyPrice: 99,
    annualPrice: 990,
    credits: 400,
    pencePerCredit: 25
  },
  agency: {
    name: "Agency",
    monthlyPrice: 199,
    annualPrice: 1990,
    credits: 1000,
    pencePerCredit: 20
  }
};

// Plan features and recommendations
const planFeatures: Record<PlanKey, {
  icon: React.ReactNode;
  description: string;
  features: string[];
  recommended?: boolean;
  badge?: string;
}> = {
  starter: {
    icon: <Zap className="h-5 w-5" />,
    description: "Perfect for testing and small projects",
    features: [
      "20 AI visibility scans",
      "Basic scoring analysis", 
      "Email reports",
      "Community support"
    ]
  },
  solo: {
    icon: <Crown className="h-5 w-5" />,
    description: "Ideal for individual developers and freelancers",
    features: [
      "60 AI visibility scans",
      "Advanced scoring breakdown",
      "PDF export reports",
      "Priority email support",
      "Schema markup analysis"
    ]
  },
  pro: {
    icon: <Rocket className="h-5 w-5" />,
    description: "Great for small teams and growing businesses",
    recommended: true,
    badge: "Most Popular",
    features: [
      "150 AI visibility scans",
      "Complete VOICE analysis",
      "Custom branding reports", 
      "API access",
      "Performance monitoring",
      "24/7 chat support"
    ]
  },
  studio: {
    icon: <Building className="h-5 w-5" />,
    description: "Perfect for agencies and development studios",
    features: [
      "400 AI visibility scans",
      "White-label reports",
      "Multi-client dashboard",
      "Advanced API features",
      "Custom integrations",
      "Dedicated account manager"
    ]
  },
  agency: {
    icon: <Building className="h-5 w-5" />,
    description: "Enterprise-grade for large agencies and corporations",
    features: [
      "1000 AI visibility scans",
      "Enterprise integrations",
      "Custom deployment options",
      "SLA guarantees",
      "On-premise deployment",
      "24/7 phone support"
    ]
  }
};

interface PricingTableProps {
  className?: string;
  onSelectPlan?: (planKey: PlanKey, isAnnual: boolean) => void;
}

export default function PricingTable({ className, onSelectPlan }: PricingTableProps) {
  const [isAnnual, setIsAnnual] = useState(false);

  const handlePlanSelect = (planKey: PlanKey) => {
    onSelectPlan?.(planKey, isAnnual);
  };

  const calculateSavings = (planKey: PlanKey) => {
    const plan = PRICING[planKey];
    const monthlyCost = plan.monthlyPrice * 12;
    const annualCost = plan.annualPrice;
    return monthlyCost - annualCost;
  };

  return (
    <div className={cn("w-full max-w-7xl mx-auto", className)} data-testid="pricing-table">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Choose Your AI Visibility Plan
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Get detailed AI visibility scores, schema markup analysis, and performance insights
          to ensure your business is discoverable by ChatGPT, Gemini, Claude, and other AI assistants.
        </p>

        {/* Annual/Monthly Toggle */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <Label htmlFor="billing-toggle" className={cn("text-base", !isAnnual && "text-foreground")}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            data-testid="toggle-annual-billing"
          />
          <Label htmlFor="billing-toggle" className={cn("text-base", isAnnual && "text-foreground")}>
            Annual
          </Label>
          {isAnnual && (
            <Badge variant="secondary" className="ml-2">
              2 months FREE
            </Badge>
          )}
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {Object.entries(PRICING).map(([planKey, plan]) => {
          const key = planKey as PlanKey;
          const feature = planFeatures[key];
          const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
          const savings = calculateSavings(key);
          const displayPrice = isAnnual ? Math.round(price / 12) : price;
          
          return (
            <Card 
              key={key} 
              className={cn(
                "relative h-full flex flex-col",
                feature.recommended && "border-primary shadow-lg scale-105"
              )}
              data-testid={`pricing-card-${key}`}
            >
              {/* Popular Badge */}
              {feature.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    {feature.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center mb-2">
                  {feature.icon}
                  <CardTitle className="ml-2 text-xl">{plan.name}</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
                
                {/* Pricing Display */}
                <div className="mt-4">
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl font-bold">£{displayPrice}</span>
                    <span className="text-muted-foreground ml-1">
                      /{isAnnual ? "mo" : "month"}
                    </span>
                  </div>
                  
                  {isAnnual && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Billed annually • Save £{savings}
                    </div>
                  )}
                  
                  <div className="text-sm text-muted-foreground mt-2">
                    {plan.credits} credits • {plan.pencePerCredit}p per credit
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {/* Features List */}
                <ul className="space-y-3 flex-1 mb-6">
                  {feature.features.map((featureText, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-sm">{featureText}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => handlePlanSelect(key)}
                  className={cn(
                    "w-full",
                    feature.recommended 
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                      : "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  )}
                  data-testid={`button-select-${key}`}
                >
                  {feature.recommended ? "Get Started" : "Choose Plan"}
                </Button>

                {/* Quick Scan Calculator */}
                <div className="text-xs text-muted-foreground text-center mt-3">
                  {Math.floor(plan.credits / 1)} quick scans or {Math.floor(plan.credits / 2)} deep scans
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer Notes */}
      <div className="text-center mt-12 space-y-2">
        <p className="text-sm text-muted-foreground">
          All plans include core AI visibility analysis • Cancel anytime • 14-day money-back guarantee
        </p>
        <p className="text-xs text-muted-foreground">
          Need more credits? Contact us for custom enterprise solutions.
        </p>
      </div>
    </div>
  );
}