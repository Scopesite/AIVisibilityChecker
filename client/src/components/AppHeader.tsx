import { Link } from "wouter";
import { CreditCard, LogOut, Home, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreditMeter from "@/components/CreditMeter";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";

export default function AppHeader() {
  const { isAuthenticated, user } = useAuth();
  const { availableCredits } = useCredits();

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  if (!isAuthenticated) return null;

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo/Home */}
        <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <Home className="h-5 w-5" />
          <span className="font-semibold hidden sm:inline">AI Visibility Checker</span>
        </Link>

        {/* Right side: Credits + Actions */}
        <div className="flex items-center space-x-4">
          {/* Credit Balance with Purchase Link */}
          <div className="flex items-center space-x-2">
            <CreditMeter className="text-sm" showRefresh />
            
            {/* Buy More Credits Button - prominent when low */}
            {availableCredits <= 5 ? (
              <Link href="/credits">
                <Button 
                  size="sm" 
                  variant="default"
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
                  data-testid="button-buy-credits-header"
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Buy Credits</span>
                  <span className="sm:hidden">Buy</span>
                </Button>
              </Link>
            ) : (
              <Link href="/credits">
                <Button 
                  size="sm" 
                  variant="outline"
                  data-testid="button-credits-header"
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Credits</span>
                </Button>
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {(user as any)?.email || 'User'}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              data-testid="button-logout-header"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}