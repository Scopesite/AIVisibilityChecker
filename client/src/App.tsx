// Integration reference: blueprint:javascript_log_in_with_replit
import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
// ❌ REMOVE this: import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AIVisibilityChecker from "@/pages/ai-visibility-checker";
import Pricing from "@/pages/pricing";
import Register from "@/pages/register";
import Login from "@/pages/login";
import Credits from "@/pages/credits";
import AppHeader from "@/components/AppHeader";

// Professional V.O.I.C.E loading for auth transitions
function AuthLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#2C3E50' }}>
      <div className="text-center">
        {/* V.O.I.C.E Logo */}
        <div className="mb-6">
          <div className="relative inline-flex items-center justify-center">
            {/* Concentric circles logo */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full" style={{ border: '3px solid #F39C12' }}></div>
              <div className="absolute inset-1 rounded-full" style={{ border: '2px solid #F39C12', opacity: 0.7 }}></div>
              <div className="absolute inset-3 rounded-full" style={{ border: '1px solid #F39C12', opacity: 0.5 }}></div>
              <div className="absolute inset-4 rounded-full" style={{ backgroundColor: '#F39C12', opacity: 0.3 }}></div>
            </div>
          </div>
        </div>
        
        {/* Title */}
        <h2 className="text-xl font-bold text-white mb-2">
          AI Visibility Checker
        </h2>
        
        {/* Gold underline */}
        <div className="w-24 h-0.5 mx-auto mb-6" style={{ backgroundColor: '#F39C12' }}></div>
        
        {/* Loading text */}
        <div className="text-gray-300 text-sm">
          Checking authentication...
        </div>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <AuthLoadingFallback />;

  return (
    <>
      <AppHeader />
      <Switch>
        {/* Public pages accessible to all users */}
        <Route path="/pricing" component={Pricing} />
        <Route path="/ai-visibility-checker" component={AIVisibilityChecker} />
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route path="/credits" component={Credits} />
        
        {!isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <Route path="/" component={AIVisibilityChecker} />
        )}
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  useEffect(() => {
    const removeInitialLoader = () => {
      const loader = document.getElementById("initial-loader");
      if (loader) {
        // Immediate removal - no animations
        loader.remove();
      }
      if (window.parent !== window) {
        window.parent.postMessage({ type: "AIV_TOOL_READY" }, "*");
      }
    };

    const checkForContent = () => {
      const root = document.getElementById("root");
      if (root && root.children.length > 0) removeInitialLoader();
      else requestAnimationFrame(checkForContent);
    };

    requestAnimationFrame(checkForContent);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* TooltipProvider now lives ONCE at the app root (main.tsx) */}
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
