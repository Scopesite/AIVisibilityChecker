// Integration reference: blueprint:javascript_log_in_with_replit
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: true, // Refetch when user returns to tab after login
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes instead of never
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch,
  };
}