import { CreditCard, Crown, AlertTriangle, RefreshCw } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CreditMeterProps {
  className?: string;
  showRefresh?: boolean;
}

export default function CreditMeter({
  className = "",
  showRefresh = false,
}: CreditMeterProps) {
  const {
    availableCredits = 0,
    subscriptionStatus = 'none',
    monthlyChecksRemaining = 0,
    isSubscriber = false,
    isLoadingBalance = false,
    balanceError = null,
    refetchBalance,
  } = useCredits();

  // Handle special states first
  if (isLoadingBalance) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading credits...
      </div>
    );
  }

  if (balanceError) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-red-500", className)}>
        <AlertTriangle className="h-4 w-4" />
        Error loading credits
        {showRefresh && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetchBalance()} 
            className="h-6 px-2"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  // Compute display values
  const isLow = availableCredits <= 5;
  const icon = isSubscriber && subscriptionStatus !== "none" 
    ? <Crown className="h-4 w-4 text-yellow-500" />
    : <CreditCard className={cn("h-4 w-4", isLow ? "text-orange-500" : "text-blue-500")} />;
  
  const text = isSubscriber && subscriptionStatus !== "none"
    ? `${monthlyChecksRemaining} monthly scans remaining`
    : `Credits: ${availableCredits}`;
    
  const badgeText = isSubscriber && subscriptionStatus !== "none"
    ? subscriptionStatus.toUpperCase()
    : (isLow ? "LOW" : "CREDITS");
    
  const badgeVariant = isSubscriber && subscriptionStatus !== "none"
    ? "default" as const
    : (isLow ? "destructive" as const : "secondary" as const);
    
  const textColor = isSubscriber && subscriptionStatus !== "none"
    ? "text-foreground"
    : (isLow ? "text-orange-600 dark:text-orange-400" : "text-foreground");

  return (
    <div className={cn("flex items-center gap-2", className)} data-testid="credit-meter">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-[#0a0e1a] px-3 py-1 text-sm text-white"
            aria-label="Credit details"
          >
            <span className="flex items-center gap-1.5">
              {icon}
              <span className={cn("text-sm font-medium", textColor)}>{text}</span>
            </span>
            <Badge variant={badgeVariant} className="text-xs">
              {badgeText}
            </Badge>
          </button>
        </TooltipTrigger>

        <TooltipContent side="bottom" align="start" forceMount>
          <div className="text-sm">
            {isSubscriber && subscriptionStatus !== "none" ? (
              <div>
                <p className="font-medium">
                  {subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)} Subscription
                </p>
                <p>Unlimited scans this month</p>
                <p className="text-muted-foreground">{monthlyChecksRemaining} remaining</p>
              </div>
            ) : (
              <div>
                <p className="font-medium">Credit Balance: {availableCredits}</p>
                <p>Each scan uses 1 credit</p>
                {availableCredits <= 5 && (
                  <p className="mt-1 text-orange-400">⚠ Consider purchasing more credits</p>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {showRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetchBalance()}
          className="h-6 px-2"
          title="Refresh credit balance"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
