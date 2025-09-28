import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Zap, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  pencePerCredit: number;
  popular?: boolean;
}

// Credit packages matching server/pricing.ts
const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 20,
    price: 12,
    pencePerCredit: 60,
  },
  {
    id: "solo", 
    name: "Solo",
    credits: 60,
    price: 25,
    pencePerCredit: 42,
    popular: true,
  },
  {
    id: "pro",
    name: "Pro", 
    credits: 150,
    price: 49,
    pencePerCredit: 33,
  },
];

interface BuyCreditsCTAProps {
  creditsNeeded: number;
  currentBalance: number;
  onPurchaseStart?: () => void;
}

export default function BuyCreditsCTA({ creditsNeeded, currentBalance, onPurchaseStart }: BuyCreditsCTAProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  const purchaseMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const response = await apiRequest('POST', '/api/credits/purchase', {
        package: packageId
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate purchase');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast({
          title: "Purchase Error",
          description: "Failed to redirect to checkout. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to start purchase process. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(null);
    },
  });

  const handlePurchase = async (packageId: string) => {
    setIsProcessing(packageId);
    onPurchaseStart?.();
    await purchaseMutation.mutateAsync(packageId);
  };

  // Show most relevant packages (those that would cover the needed credits)
  const relevantPackages = CREDIT_PACKAGES.filter(pkg => pkg.credits >= creditsNeeded);
  const packagesToShow = relevantPackages.length > 0 ? relevantPackages.slice(0, 2) : CREDIT_PACKAGES.slice(0, 2);

  return (
    <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30" data-testid="buy-credits-cta">
      <CardContent className="p-4">
        <div className="text-center mb-4">
          <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1" data-testid="cta-title">
            Need More Credits?
          </h3>
          <p className="text-sm text-orange-700 dark:text-orange-300" data-testid="cta-description">
            You need {creditsNeeded} more credits. Choose a package below:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {packagesToShow.map((pkg) => (
            <div
              key={pkg.id}
              className="relative border border-orange-200 dark:border-orange-700 rounded-lg p-3 bg-white dark:bg-gray-900"
              data-testid={`credit-package-${pkg.id}`}
            >
              {pkg.popular && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white">
                  Popular
                </Badge>
              )}
              
              <div className="text-center mb-3">
                <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
                  {pkg.credits} Credits
                </div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  £{pkg.price}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  £{(pkg.pencePerCredit / 100).toFixed(2)} per credit
                </div>
              </div>

              <Button
                onClick={() => handlePurchase(pkg.id)}
                disabled={isProcessing === pkg.id || purchaseMutation.isPending}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                data-testid={`button-buy-${pkg.id}`}
              >
                {isProcessing === pkg.id ? (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Buy {pkg.name}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-3 text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400" data-testid="cta-footer">
            Credits expire 30 days after purchase • Secure payment with Stripe
          </p>
        </div>
      </CardContent>
    </Card>
  );
}