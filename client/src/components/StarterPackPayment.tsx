import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Note: This component now uses Stripe Checkout redirect flow instead of embedded payment elements

interface StarterPackPaymentProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function StarterPackPayment({ onSuccess, onCancel }: StarterPackPaymentProps) {
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create checkout session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/create-starter-payment");
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setPaymentStatus('error');
        setErrorMessage("No checkout URL received");
      }
    },
    onError: (error: any) => {
      setPaymentStatus('error');
      setErrorMessage(error.message || "Failed to create checkout session");
      toast({
        title: "Payment Setup Failed",
        description: error.message || "Unable to set up payment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleStartPayment = () => {
    createCheckoutMutation.mutate();
  };

  const handlePaymentSuccess = () => {
    setPaymentStatus('success');
    
    // Invalidate user credits query to refresh available checks
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    
    toast({
      title: "Payment Successful!",
      description: "50 AI visibility checks have been added to your account.",
    });

    // Call success callback after a brief delay for UI feedback
    setTimeout(() => {
      onSuccess?.();
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    setPaymentStatus('error');
    setErrorMessage(error);
    
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  // Loading state while creating checkout session
  if (createCheckoutMutation.isPending) {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="card-starter-payment-loading">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Redirecting to secure payment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (paymentStatus === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="card-starter-payment-success">
        <CardContent className="text-center p-8">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Payment Successful!</h3>
              <p className="text-muted-foreground mb-4">
                50 AI visibility checks have been added to your account.
              </p>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                Starter Pack Activated
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (paymentStatus === 'error') {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="card-starter-payment-error">
        <CardContent className="text-center p-8">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Payment Failed</h3>
              <p className="text-muted-foreground mb-4">{errorMessage}</p>
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setPaymentStatus('idle');
                    setErrorMessage("");
                    handleStartPayment();
                  }}
                  data-testid="button-retry-payment"
                >
                  Try Again
                </Button>
                {onCancel && (
                  <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-payment">
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show payment form when ready

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="card-starter-payment">
      <CardHeader className="text-center pb-4">
        <div className="space-y-2">
          <CardTitle className="text-2xl font-bold">Starter Pack</CardTitle>
          <CardDescription>Get 50 AI visibility checks</CardDescription>
          
          {/* Price Display */}
          <div className="flex items-center justify-center space-x-2 py-3">
            <div className="text-3xl font-bold text-primary">£29.00</div>
            <Badge variant="secondary">One-time</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Value Proposition */}
        <div className="space-y-3 mb-6">
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">50 website checks</span>
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
          </div>
          <Separator />
        </div>

        {/* Payment Button */}
        <Button 
          onClick={handleStartPayment}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
          disabled={createCheckoutMutation.isPending}
          data-testid="button-start-payment"
        >
          {createCheckoutMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up payment...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay £29.00 with Stripe
            </>
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center mt-3">
          Secure payment powered by Stripe. You'll be redirected to complete your purchase.
        </p>

        {/* Cancel Option */}
        {onCancel && (
          <div className="text-center mt-4">
            <Button variant="ghost" size="sm" onClick={onCancel} data-testid="button-cancel-starter">
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}