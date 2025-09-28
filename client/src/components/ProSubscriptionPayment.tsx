import { useState, useEffect } from "react";
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, CreditCard, Loader2, AlertCircle, Crown, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Load Stripe outside of component to avoid recreating
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface ProSubscriptionPaymentFormProps {
  clientSecret: string;
  subscriptionId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function ProSubscriptionPaymentForm({ clientSecret, subscriptionId, onSuccess, onError }: ProSubscriptionPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/ai-visibility-checker?subscription=success",
        },
        redirect: "if_required"
      });

      if (error) {
        onError(error.message || "Subscription setup failed");
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Call finalization endpoint to ensure subscription is activated
        try {
          const response = await apiRequest("POST", "/api/subscription/finalize", {
            subscription_id: subscriptionId
          });
          
          if (response.ok) {
            onSuccess();
          } else {
            const errorData = await response.json();
            onError(errorData.error || "Failed to finalize subscription");
          }
        } catch (finalizeError: any) {
          console.error("Failed to finalize subscription:", finalizeError);
          onError("Payment succeeded but failed to activate subscription. Please contact support.");
        }
      } else {
        onError("Subscription payment did not complete successfully");
      }
    } catch (err: any) {
      onError(err.message || "Subscription processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="form-pro-subscription">
      <div className="space-y-6">
        {/* Payment Element */}
        <div className="p-4 border rounded-lg bg-card">
          <PaymentElement 
            options={{
              layout: "tabs",
              paymentMethodOrder: ["card", "google_pay", "apple_pay"]
            }}
          />
        </div>

        {/* Subscription Terms */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">Monthly Billing Terms</p>
              <ul className="space-y-1 text-xs">
                <li>• Subscription automatically renews monthly at £20.00</li>
                <li>• 100 AI visibility checks per billing period</li>
                <li>• Cancel anytime from your account settings</li>
                <li>• No refunds for partial billing periods</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Subscribe Button */}
        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold py-3 shadow-lg"
          disabled={!stripe || !elements || isProcessing}
          data-testid="button-complete-subscription"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up subscription...
            </>
          ) : (
            <>
              <Crown className="mr-2 h-4 w-4" />
              Subscribe - £20.00/month
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Secure payment powered by Stripe. You can cancel your subscription at any time.
        </p>
      </div>
    </form>
  );
}

interface ProSubscriptionPaymentProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ProSubscriptionPayment({ onSuccess, onCancel }: ProSubscriptionPaymentProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create subscription mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/create-pro-subscription");
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.client_secret);
    },
    onError: (error: any) => {
      setSubscriptionStatus('error');
      setErrorMessage(error.message || "Failed to create subscription");
      toast({
        title: "Subscription Setup Failed",
        description: error.message || "Unable to set up subscription. Please try again.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    // Create subscription when component mounts
    createSubscriptionMutation.mutate();
  }, []);

  const handleSubscriptionSuccess = () => {
    setSubscriptionStatus('success');
    
    // Invalidate user credits query to refresh subscription status
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    
    toast({
      title: "Subscription Activated!",
      description: "Welcome to V.O.I.C.E™ Pro! You now have unlimited AI visibility checks.",
    });

    // Call success callback after a brief delay for UI feedback
    setTimeout(() => {
      onSuccess?.();
    }, 2000);
  };

  const handleSubscriptionError = (error: string) => {
    setSubscriptionStatus('error');
    setErrorMessage(error);
    
    toast({
      title: "Subscription Failed",
      description: error,
      variant: "destructive",
    });
  };

  // Loading state while creating subscription
  if (createSubscriptionMutation.isPending) {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="card-pro-subscription-loading">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Setting up subscription...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (subscriptionStatus === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20" data-testid="card-pro-subscription-success">
        <CardContent className="text-center p-8">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center mx-auto">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Welcome to V.O.I.C.E™ Pro!</h3>
              <p className="text-muted-foreground mb-4">
                Your subscription is now active. Enjoy unlimited AI visibility checks!
              </p>
              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
                <Crown className="w-3 h-3 mr-1" />
                Pro Subscriber
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (subscriptionStatus === 'error') {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="card-pro-subscription-error">
        <CardContent className="text-center p-8">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Subscription Failed</h3>
              <p className="text-muted-foreground mb-4">{errorMessage}</p>
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSubscriptionStatus('idle');
                    setErrorMessage("");
                    createSubscriptionMutation.mutate();
                  }}
                  data-testid="button-retry-subscription"
                >
                  Try Again
                </Button>
                {onCancel && (
                  <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-subscription">
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

  // Subscription form
  if (!clientSecret) {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="card-pro-subscription-loading">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Preparing subscription...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20" data-testid="card-pro-subscription">
      <CardHeader className="text-center pb-4">
        <div className="space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Crown className="h-6 w-6 text-amber-600" />
            <CardTitle className="text-2xl font-bold">V.O.I.C.E™ Pro</CardTitle>
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs">
              Recommended
            </Badge>
          </div>
          <CardDescription>Unlimited AI visibility checks for growing businesses</CardDescription>
          
          {/* Price Display */}
          <div className="flex items-center justify-center space-x-2 py-3">
            <div className="text-3xl font-bold text-amber-600">£20.00</div>
            <div className="text-sm text-muted-foreground">/month</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Value Proposition */}
        <div className="space-y-3 mb-6">
          <Separator />
          <div className="space-y-2">
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
              <span className="text-sm">Schema markup optimization</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Priority customer support</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Cancel anytime</span>
            </div>
          </div>
          <Separator />
        </div>

        {/* Payment Form wrapped in Elements */}
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <ProSubscriptionPaymentForm 
            clientSecret={clientSecret}
            subscriptionId=""
            onSuccess={handleSubscriptionSuccess}
            onError={handleSubscriptionError}
          />
        </Elements>

        {/* Cancel Option */}
        {onCancel && (
          <div className="text-center mt-4">
            <Button variant="ghost" size="sm" onClick={onCancel} data-testid="button-cancel-pro">
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}