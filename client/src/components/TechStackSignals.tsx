import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Code, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface TechEnrichment {
  groups: { name: string; live: number; dead: number }[];
  categories: { name: string; live: number; dead: number }[];
  techGuess: string[];
  tips: string[];
  source: "builtwith" | "heuristics" | "none";
  domain: string;
  cached: boolean;
  timestamp: string;
}

interface TechStackSignalsProps {
  domain: string;
  className?: string;
}

export default function TechStackSignals({ domain, className }: TechStackSignalsProps) {
  const [enrichment, setEnrichment] = useState<TechEnrichment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchEnrichment() {
      if (!domain) return;

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/enrich/stack?domain=${encodeURIComponent(domain)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tech stack data: ${response.status}`);
        }

        const data = await response.json();
        
        if (isMounted) {
          setEnrichment(data);
        }
      } catch (err: any) {
        console.error("Tech stack enrichment error:", err);
        if (isMounted) {
          setError(err.message || "Failed to load technology stack data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchEnrichment();

    return () => {
      isMounted = false;
    };
  }, [domain]);

  // Show loading state
  if (isLoading && !enrichment) {
    return (
      <Card className={cn("bg-card border border-border shadow-lg", className)} data-testid="tech-stack-signals">
        <CardContent className="p-4 sm:p-5 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading technology stack...</p>
        </CardContent>
      </Card>
    );
  }

  // Show error state but don't hide completely
  if (error) {
    return (
      <Card className={cn("bg-card border border-border shadow-lg", className)} data-testid="tech-stack-signals">
        <CardContent className="p-4 sm:p-5 text-center">
          <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-500">Failed to load technology data</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Don't render if no enrichment data at all
  if (!enrichment) {
    return null;
  }

  // Show fallback message if no technology data but API succeeded
  const hasData = enrichment.techGuess.length > 0 || enrichment.groups.length > 0 || enrichment.tips.length > 0;
  const showFallback = !hasData && enrichment.source !== "none";

  const getSourceIcon = () => {
    switch (enrichment.source) {
      case "builtwith":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "heuristics":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSourceText = () => {
    switch (enrichment.source) {
      case "builtwith":
        return "BuiltWith API";
      case "heuristics":
        return "Heuristic Detection";
      default:
        return "No Data";
    }
  };

  // Get top 6 technologies to display
  const topTechs = [
    ...enrichment.techGuess.slice(0, 6),
    ...enrichment.groups.slice(0, 6 - enrichment.techGuess.length).map(g => g.name)
  ].slice(0, 6);

  return (
    <Card className={cn("bg-card border border-border shadow-lg", className)} data-testid="tech-stack-signals">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm sm:text-base">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-blue-600/10 rounded-lg flex items-center justify-center mr-3 border border-purple-500/20">
              <Code className="w-4 h-4 text-purple-600" />
            </div>
            Tech Stack Fingerprint
          </div>
          <div className="flex items-center space-x-2">
            {getSourceIcon()}
            <span className="text-xs text-muted-foreground">{getSourceText()}</span>
            {enrichment.cached && (
              <Badge variant="secondary" className="text-xs">Cached</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Technology Tags */}
        {topTechs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Detected Technologies</h4>
            <div className="flex flex-wrap gap-2">
              {topTechs.map((tech, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs capitalize"
                  data-testid={`tech-badge-${tech.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Fallback message when no technology detected */}
        {showFallback && (
          <div className="text-center py-4">
            <div className="text-sm text-muted-foreground">
              <Info className="h-4 w-4 inline mr-2" />
              No specific technologies detected for this domain.
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {enrichment.source === "builtwith" 
                ? "BuiltWith database has no public technology information for this site."
                : "Heuristic analysis found no recognizable technology patterns."
              }
            </p>
          </div>
        )}

        {/* Platform-Specific Tips */}
        {enrichment.tips.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Optimization Tips</h4>
            <div className="space-y-2">
              {enrichment.tips.map((tip, index) => (
                <div 
                  key={index} 
                  className="text-sm text-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800"
                  data-testid={`tech-tip-${index}`}
                >
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-blue-700 dark:text-blue-300">{tip}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Groups Summary (if from BuiltWith API) */}
        {enrichment.source === "builtwith" && enrichment.groups.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Technology Groups</h4>
            <div className="text-xs text-muted-foreground">
              {enrichment.groups.slice(0, 3).map(group => group.name).join(', ')}
              {enrichment.groups.length > 3 && ` +${enrichment.groups.length - 3} more`}
            </div>
          </div>
        )}

        {/* Data Source Disclaimer */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <div className="flex items-center justify-between">
            <span>
              {enrichment.source === "builtwith" && "Signals are aggregated (BuiltWith Free). Vendor names may be hidden."}
              {enrichment.source === "heuristics" && "Based on HTML pattern detection. May not capture all technologies."}
            </span>
            {enrichment.cached && (
              <span className="text-green-600 dark:text-green-400">
                24h Cache
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}