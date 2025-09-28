import { useState } from 'react';
import { Copy, CheckCircle, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';

interface AIRecommendationsV1 {
  version: "1.0";
  summary: string;
  prioritised_actions: {
    task: string;
    impact: "high" | "med" | "low";
    effort: "low" | "med" | "high";
    where?: string[];
  }[];
  schema_recommendations: {
    type: string;
    where: string[];
    jsonld: Record<string, any>;
  }[];
  notes?: string[];
}

interface AIAnalysisResultsProps {
  recommendations: AIRecommendationsV1;
}

const impactColors = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  med: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const effortColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  med: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function AIAnalysisResults({ recommendations }: AIAnalysisResultsProps) {
  const { toast } = useToast();
  const [openSchemas, setOpenSchemas] = useState<Set<string>>(new Set());

  // Add safety check
  if (!recommendations) {
    return (
      <div className="text-center py-8" data-testid="no-recommendations">
        <p className="text-muted-foreground">No recommendations available</p>
      </div>
    );
  }

  // Also add safety checks for arrays:
  const prioritisedActions = recommendations.prioritised_actions || [];
  const schemaRecommendations = recommendations.schema_recommendations || [];
  const notes = recommendations.notes || [];

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const toggleSchema = (type: string) => {
    const newOpen = new Set(openSchemas);
    if (newOpen.has(type)) {
      newOpen.delete(type);
    } else {
      newOpen.add(type);
    }
    setOpenSchemas(newOpen);
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            AI Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">
            {recommendations.summary}
          </p>
        </CardContent>
      </Card>

      {/* Prioritized Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Prioritized Action Plan</CardTitle>
          <CardDescription>
            Recommended improvements ranked by impact and effort
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {prioritisedActions.map((action, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 border rounded-lg"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="font-medium">{action.task}</p>
                  <div className="flex gap-2">
                    <Badge className={impactColors[action.impact]}>
                      {action.impact.toUpperCase()} IMPACT
                    </Badge>
                    <Badge className={effortColors[action.effort]}>
                      {action.effort.toUpperCase()} EFFORT
                    </Badge>
                  </div>
                  {action.where && action.where.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Apply to: {action.where.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schema Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>JSON-LD Schema Recommendations</CardTitle>
          <CardDescription>
            Ready-to-paste schema markup for your website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schemaRecommendations.map((schema, index) => (
              <Collapsible
                key={index}
                open={openSchemas.has(schema.type)}
                onOpenChange={() => toggleSchema(schema.type)}
              >
                <div className="border rounded-lg">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto"
                    >
                      <div className="flex items-center gap-3">
                        {openSchemas.has(schema.type) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div className="text-left">
                          <div className="font-medium">{schema.type} Schema</div>
                          <div className="text-sm text-muted-foreground">
                            Add to: {schema.where.join(', ')}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">JSON-LD</Badge>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <div className="bg-muted rounded-md p-4 relative">
                        <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(schema.jsonld, null, 2)}
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() =>
                            copyToClipboard(
                              JSON.stringify(schema.jsonld, null, 2),
                              `${schema.type} schema`
                            )
                          }
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a
                            href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(window.location.origin)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Test in Google
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a
                            href={`https://schema.org/${schema.type}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Schema.org Docs
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {notes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {notes.map((note, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  • {note}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
