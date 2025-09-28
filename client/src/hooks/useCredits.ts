import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface CreditBalance {
  balance: number;
  perScan: number;
}

interface CreditHistory {
  transactions: Array<{
    id: string;
    userId: string;
    delta: number;
    reason: string;
    jobId: string | null;
    extRef: string | null;
    expiresAt: string | null;
    createdAt: string;
  }>;
  totalCount: number;
}

export type ScanType = 'standard';

export function useCredits() {
  const {
    data: balance,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance
  } = useQuery<CreditBalance>({
    queryKey: ['/api/credits/balance'],
    staleTime: 30000, // 30 seconds - credits change frequently
    gcTime: 60000, // 1 minute
  });

  const {
    data: history,
    isLoading: isLoadingHistory,
    error: historyError,
    refetch: refetchHistory
  } = useQuery<CreditHistory>({
    queryKey: ['/api/credits/history'],
    staleTime: 60000, // 1 minute - history changes less frequently
    gcTime: 300000, // 5 minutes
  });

  // Credit validation helpers
  const canAffordScan = (): boolean => {
    if (!balance) return false;
    return balance.balance >= balance.perScan;
  };

  const getCreditRequirement = (): number => {
    return balance?.perScan || 1;
  };

  const getCreditShortfall = (): number => {
    if (!balance) return 1;
    const required = balance.perScan;
    const available = balance.balance;
    return Math.max(0, required - available);
  };

  const getInsufficientCreditsMessage = (): string => {
    const required = getCreditRequirement();
    const available = balance?.balance || 0;
    const shortfall = getCreditShortfall();
    
    if (shortfall === 0) return '';
    
    return `Insufficient credits. You need ${required} credits for a scan, but only have ${available}. Purchase ${shortfall} more credits to continue.`;
  };

  return {
    // Raw data
    balance,
    history,
    
    // Loading states
    isLoadingBalance,
    isLoadingHistory,
    
    // Error states
    balanceError,
    historyError,
    
    // Utilities
    refetchBalance,
    refetchHistory,
    refetch: () => {
      refetchBalance();
      refetchHistory();
    },
    
    // Computed values for backward compatibility
    availableCredits: balance?.balance || 0,
    subscriptionStatus: 'none', // Legacy - this app uses credit system now
    monthlyChecksRemaining: 0, // Legacy - not used in credit system
    isSubscriber: false, // Legacy - not used in credit system
    
    // Credit system values
    creditBalance: balance?.balance || 0,
    scanCost: balance?.perScan || 1,
    
    // Credit validation helpers
    canAffordScan,
    getCreditRequirement,
    getCreditShortfall,
    getInsufficientCreditsMessage,
    
    // Credit history
    creditTransactions: history?.transactions || [],
    totalTransactionCount: history?.totalCount || 0,
  };
}
