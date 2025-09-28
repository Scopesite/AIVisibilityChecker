import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PricingTable from "@/components/PricingTable";
import { useAuth } from "@/hooks/useAuth";

// Import types for pricing
type PlanKey = "starter" | "solo" | "pro" | "studio" | "agency";

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<{ plan: PlanKey; isAnnual: boolean } | null>(null);

  const handlePlanSelect = (planKey: PlanKey, isAnnual: boolean) => {
    setSelectedPlan({ plan: planKey, isAnnual });
    
    // For now, just log the selection
    // In a real implementation, this would redirect to payment flow
    console.log(`Selected plan: ${planKey}, Annual: ${isAnnual}`);
    
    // TODO: Implement actual payment flow integration
    // - Could show a modal with ProSubscriptionPayment or StarterPackPayment
    // - Or redirect to a checkout page
    // - Or integrate with existing payment components
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={isAuthenticated ? "/ai-visibility-checker" : "/"}>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
              </Link>
              <h1 className="text-xl font-semibold">Pricing Plans</h1>
            </div>
            
            {!isAuthenticated && (
              <Link href="/">
                <Button variant="outline" size="sm">
                  Get Started Free
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <PricingTable onSelectPlan={handlePlanSelect} />
        
        {/* Selection Feedback */}
        {selectedPlan && (
          <div className="mt-8 p-4 bg-primary/10 border border-primary/20 rounded-lg max-w-md mx-auto text-center">
            <p className="text-sm text-foreground">
              You selected <strong>{selectedPlan.plan}</strong> plan 
              ({selectedPlan.isAnnual ? 'Annual' : 'Monthly'} billing)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Payment integration coming soon!
            </p>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
          
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2">What is AI visibility?</h4>
              <p className="text-muted-foreground text-sm">
                AI visibility measures how well your website can be discovered and understood by AI assistants 
                like ChatGPT, Gemini, and Claude. Poor AI visibility means these tools can't properly recommend 
                your business to potential customers.
              </p>
            </div>
            
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2">How does the credit system work?</h4>
              <p className="text-muted-foreground text-sm">
                Each scan uses credits from your account. Quick scans use 1 credit and provide basic analysis. 
                Deep scans use 2 credits and include mobile + desktop analysis with detailed scoring across 
                all 7 areas of our VOICE methodology.
              </p>
            </div>
            
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2">Can I change plans anytime?</h4>
              <p className="text-muted-foreground text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Unused credits roll over when you upgrade, 
                and we provide prorated billing for plan changes. Annual plans save you 2 months (17% discount).
              </p>
            </div>
            
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2">Do you offer enterprise solutions?</h4>
              <p className="text-muted-foreground text-sm">
                Absolutely! For large agencies and enterprises needing more than 1,000 monthly scans, 
                we offer custom solutions with dedicated support, white-label options, and API integrations. 
                Contact us to discuss your specific needs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}