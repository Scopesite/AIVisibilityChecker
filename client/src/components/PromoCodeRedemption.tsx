import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Gift, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Form schema for promo code redemption
const promoCodeSchema = z.object({
  code: z.string()
    .min(1, "Promo code is required")
    .max(20, "Promo code too long")
    .transform(code => code.toUpperCase().trim())
});

type PromoCodeFormData = z.infer<typeof promoCodeSchema>;

interface PromoRedemptionResult {
  success: boolean;
  message: string;
  creditsGranted: number;
  subscriptionGranted?: "none" | "starter" | "pro";
  subscriptionDays?: number;
  newBalance: number;
  error?: string;
}

export default function PromoCodeRedemption() {
  const { toast } = useToast();
  const [lastRedemption, setLastRedemption] = useState<PromoRedemptionResult | null>(null);

  const form = useForm<PromoCodeFormData>({
    resolver: zodResolver(promoCodeSchema),
    defaultValues: {
      code: "",
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async (data: PromoCodeFormData): Promise<PromoRedemptionResult> => {
      const response = await apiRequest('POST', '/api/promocodes/redeem', data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to redeem promo code');
      }
      
      return await response.json();
    },
    onSuccess: (result) => {
      setLastRedemption(result);
      form.reset();
      
      // Show success toast
      toast({
        title: "🎉 Promo Code Redeemed!",
        description: `You received ${result.creditsGranted} credits${result.subscriptionGranted && result.subscriptionGranted !== 'none' ? ` + ${result.subscriptionDays} days ${result.subscriptionGranted}` : ''}`,
        variant: "default",
      });
      
      // Invalidate credit-related queries to refresh balances
      queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credits/history'] });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Redemption Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = async (data: PromoCodeFormData) => {
    redeemMutation.mutate(data);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-orange-500" />
          Redeem Promo Code
        </CardTitle>
        <CardDescription>
          Enter a promotional code to receive credits or upgrade your subscription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Promo Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter code (e.g., EARLY123ABC)" 
                      data-testid="input-promo-code"
                      disabled={redeemMutation.isPending}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={redeemMutation.isPending}
              data-testid="button-redeem-promo"
            >
              {redeemMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redeeming...
                </div>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Redeem Code
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* Success message display */}
        {lastRedemption && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Code redeemed successfully!
                </p>
                <div className="text-sm text-green-700 dark:text-green-300">
                  <p>✓ {lastRedemption.creditsGranted} credits added</p>
                  {lastRedemption.subscriptionGranted && lastRedemption.subscriptionGranted !== 'none' && (
                    <p>✓ {lastRedemption.subscriptionDays} days {lastRedemption.subscriptionGranted} subscription</p>
                  )}
                  <p>💰 New balance: {lastRedemption.newBalance} credits</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info text */}
        <div className="text-xs text-muted-foreground text-center">
          Promo codes can only be used once per account
        </div>
      </CardContent>
    </Card>
  );
}