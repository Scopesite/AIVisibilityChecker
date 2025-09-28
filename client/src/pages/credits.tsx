import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, CreditCard, Zap, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PromoCodeRedemption from "@/components/PromoCodeRedemption";

// Credit packages - LIVE Stripe products matching environment variables
const creditPackages = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 50,
    price: 29.00,
    popular: true,
    description: "Perfect for small businesses",
    apiEndpoint: "/api/create-starter-payment"
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 250,
    price: 99.00,
    popular: false,
    description: "Great for agencies and consultants",
    apiEndpoint: "/api/create-pro-payment"
  }
];

export default function Credits() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [purchasingPackage, setPurchasingPackage] = useState<string | null>(null);

  // Fetch user credits
  const { data: creditsData, isLoading: creditsLoading } = useQuery({
    queryKey: ["/api/credits/balance"],
    enabled: isAuthenticated
  });

  // Purchase credits mutation - redirects to Stripe checkout
  const purchaseCredits = useMutation({
    mutationFn: async (packageId: string) => {
      const pkg = creditPackages.find(p => p.id === packageId);
      if (!pkg) throw new Error("Invalid package");
      
      const response = await apiRequest("POST", pkg.apiEndpoint);
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast({
          title: "Checkout creation failed",
          description: "Unable to create checkout session. Please try again.",
          variant: "destructive"
        });
      }
      setPurchasingPackage(null);
    },
    onError: (error: any) => {
      toast({
        title: "Purchase failed",
        description: error.message || "Unable to process purchase. Please try again.",
        variant: "destructive"
      });
      setPurchasingPackage(null);
    }
  });

  const handlePurchase = (packageId: string) => {
    setPurchasingPackage(packageId);
    purchaseCredits.mutate(packageId);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You need to be logged in to manage your credits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/login">
              <Button className="w-full" data-testid="login-button">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="w-full" data-testid="register-button">
                Create Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/ai-visibility-checker">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2" data-testid="back-button">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Scanner</span>
                </Button>
              </Link>
              <h1 className="text-xl font-semibold">Credit Management</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Current Balance */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span>Your Credit Balance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold" data-testid="credit-balance">
                    {creditsLoading ? "..." : (creditsData as any)?.balance || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Credits available for AI visibility scans
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Each scan costs 1 credit
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Credit Packages */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Purchase More Credits</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {creditPackages.map((pkg) => (
              <Card 
                key={pkg.id} 
                className={`relative ${pkg.popular ? 'border-primary shadow-lg' : ''}`}
                data-testid={`credit-package-${pkg.id}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                  <div className="mt-4">
                    <div className="text-3xl font-bold">£{pkg.price.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">{pkg.credits} credits</div>
                    <div className="text-xs text-muted-foreground">
                      £{(pkg.price / pkg.credits).toFixed(2)} per credit
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchasingPackage === pkg.id || purchaseCredits.isPending}
                    data-testid={`purchase-button-${pkg.id}`}
                  >
                    {purchasingPackage === pkg.id ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Buy Now - £{pkg.price.toFixed(2)}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Promo Code Redemption */}
        <div className="mb-8 flex justify-center">
          <PromoCodeRedemption />
        </div>

        {/* Usage Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>How Credits Work</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="font-medium">• 1 Credit = 1 Full AI Scan</div>
                <div className="text-sm text-muted-foreground ml-4">
                  Complete website analysis with AI recommendations
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-medium">• Free Scans Available</div>
                <div className="text-sm text-muted-foreground ml-4">
                  Basic scores without detailed recommendations
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-medium">• Credits Never Expire</div>
                <div className="text-sm text-muted-foreground ml-4">
                  Use them whenever you need them
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/ai-visibility-checker">
                <Button variant="outline" className="w-full" data-testid="start-scan-button">
                  <Zap className="h-4 w-4 mr-2" />
                  Start New Scan
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="w-full" 
                data-testid="contact-support-button"
                onClick={() => window.location.href = 'mailto:support@ai-visibility-checker.com?subject=Credit%20Support%20Request'}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Need Help?
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}