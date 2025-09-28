import { useState } from 'react';
import { Copy, CheckCircle, ExternalLink, ChevronDown, ChevronRight, Target, TrendingUp, AlertTriangle, Globe, MessageSquare, CreditCard, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface SEOAnalysisV2 {
  url: string;
  finalUrl: string;
  aiVisibilityScore: number;
  seoScore: number;
  aiVisibilityBand: string;
  meta: {
    title: { text: string; length: number; isOptimal: boolean; };
    description: { text: string; length: number; isOptimal: boolean; };
  };
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  businessInfo: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    logo?: string;
    businessType?: string;
  };
  social: {
    sameAs: string[];
  };
  schema: {
    types: string[];
    hasOrganization: boolean;
    hasWebSite: boolean;
    hasLocalBusiness: boolean;
    hasBreadcrumb: boolean;
  };
  issues: string[];
}

interface ScanResultV1 {
  cost: number;
  remainingCredits: number;
  analysis: SEOAnalysisV2;
  ai: AIRecommendationsV1;
}

interface ComprehensiveAnalysisResultsProps {
  scanResult: ScanResultV1;
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

const getBandColor = (band?: string) => {
  if (!band) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  
  switch (band.toLowerCase()) {
    case 'excellent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'good': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'poor': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export default function ComprehensiveAnalysisResults({ scanResult }: ComprehensiveAnalysisResultsProps) {
  const { toast } = useToast();
  const [openSchemas, setOpenSchemas] = useState<Set<string>>(new Set());

  // Safety checks
  if (!scanResult || !scanResult.analysis || !scanResult.ai) {
    return (
      <div className="text-center py-8" data-testid="no-results">
        <p className="text-muted-foreground">No analysis results available</p>
      </div>
    );
  }

  const { analysis, ai } = scanResult;
  const prioritisedActions = ai.prioritised_actions || [];
  const schemaRecommendations = ai.schema_recommendations || [];
  const notes = ai.notes || [];

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

  const toggleSchema = (schemaType: string) => {
    const newOpen = new Set(openSchemas);
    if (newOpen.has(schemaType)) {
      newOpen.delete(schemaType);
    } else {
      newOpen.add(schemaType);
    }
    setOpenSchemas(newOpen);
  };

  return (
    <div className="space-y-6" data-testid="comprehensive-results">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="ai-plan" data-testid="tab-ai-plan">AI Action Plan</TabsTrigger>
          <TabsTrigger value="seo-dive" data-testid="tab-seo-dive">SEO Deep Dive</TabsTrigger>
          <TabsTrigger value="schema" data-testid="tab-schema">Schema</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* AI Visibility Score */}
            <Card data-testid="card-ai-score">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  AI Visibility Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2" data-testid="text-ai-score">
                    {analysis.aiVisibilityScore}/100
                  </div>
                  <Badge variant="secondary" className={getBandColor(analysis.aiVisibilityBand)} data-testid="badge-ai-band">
                    {analysis.aiVisibilityBand}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    SEO Foundation: {analysis.seoScore}/100
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Summary */}
            <Card data-testid="card-summary">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  AI Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm" data-testid="text-summary">{ai.summary}</p>
              </CardContent>
            </Card>
          </div>

          {/* Key Issues */}
          {analysis.issues && analysis.issues.length > 0 && (
            <Card data-testid="card-issues">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Key Issues Found
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {analysis.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-muted-foreground" data-testid={`text-issue-${index}`}>
                      • {issue}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Top Actions Preview */}
          <Card data-testid="card-top-actions">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Priority Actions
              </CardTitle>
              <CardDescription>
                Your highest impact, lowest effort improvements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {prioritisedActions.slice(0, 3).map((action, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg border" data-testid={`card-action-preview-${index}`}>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className={impactColors[action.impact]} data-testid={`badge-impact-${index}`}>
                        {action.impact} impact
                      </Badge>
                      <Badge variant="outline" className={effortColors[action.effort]} data-testid={`badge-effort-${index}`}>
                        {action.effort} effort
                      </Badge>
                    </div>
                    <p className="text-sm flex-1" data-testid={`text-action-${index}`}>{action.task}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Action Plan Tab */}
        <TabsContent value="ai-plan" className="space-y-4">
          {/* Summary */}
          <Card data-testid="card-ai-summary">
            <CardHeader>
              <CardTitle>Strategic Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground" data-testid="text-ai-summary">{ai.summary}</p>
            </CardContent>
          </Card>

          {/* Prioritized Actions */}
          <Card data-testid="card-prioritized-actions">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Prioritized Action Plan</CardTitle>
                  <CardDescription>
                    Ranked by impact vs effort for maximum ROI
                  </CardDescription>
                </div>
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://www.scopesite.co.uk/strategy-meeting-uk-web-design', '_blank')}
                  data-testid="button-help-actions"
                >
                  Need A Hand?
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prioritisedActions.map((action, index) => (
                  <div key={index} className="p-4 rounded-lg border" data-testid={`card-action-${index}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium mb-2" data-testid={`text-action-task-${index}`}>{action.task}</p>
                        {action.where && action.where.length > 0 && (
                          <p className="text-sm text-muted-foreground" data-testid={`text-action-where-${index}`}>
                            <strong>Where:</strong> {action.where.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className={impactColors[action.impact]} data-testid={`badge-action-impact-${index}`}>
                          {action.impact} impact
                        </Badge>
                        <Badge variant="outline" className={effortColors[action.effort]} data-testid={`badge-action-effort-${index}`}>
                          {action.effort} effort
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Schema Recommendations */}
          {schemaRecommendations.length > 0 && (
            <Card data-testid="card-schema-recommendations">
              <CardHeader>
                <CardTitle>Ready-to-Paste Schema Markup</CardTitle>
                <CardDescription>
                  Copy and paste these JSON-LD schemas into your website head section
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schemaRecommendations.map((schema, index) => (
                    <Collapsible key={index} open={openSchemas.has(schema.type)} onOpenChange={() => toggleSchema(schema.type)}>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-toggle-schema-${index}`}>
                              {openSchemas.has(schema.type) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <div>
                            <p className="font-medium" data-testid={`text-schema-type-${index}`}>{schema.type} Schema</p>
                            <p className="text-sm text-muted-foreground">
                              Add to: {schema.where.join(', ')}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(schema.jsonld, null, 2), `${schema.type} Schema`)}
                          data-testid={`button-copy-schema-${index}`}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                      <CollapsibleContent className="px-3 pb-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Ready to paste in your website's &lt;head&gt; section:</p>
                          <pre className="text-xs text-black bg-white border p-3 rounded overflow-x-auto">
                            {(schema as any).htmlCode || `<script type="application/ld+json">\n${JSON.stringify(schema.jsonld, null, 2)}\n</script>`}
                          </pre>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Notes */}
          {notes.length > 0 && (
            <Card data-testid="card-notes">
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {notes.map((note, index) => (
                    <li key={index} className="text-sm text-muted-foreground" data-testid={`text-note-${index}`}>
                      • {note}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SEO Deep Dive Tab */}
        <TabsContent value="seo-dive" className="space-y-4">
          {/* Meta Tags Analysis */}
          <Card data-testid="card-meta-analysis">
            <CardHeader>
              <CardTitle>Meta Tags Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">Title Tag</h4>
                    <Badge variant={analysis.meta?.title?.isOptimal ? "default" : "destructive"} data-testid="badge-title-status">
                      {analysis.meta?.title?.isOptimal ? "Optimal" : "Needs Work"}
                    </Badge>
                  </div>
                  <p className="text-sm" data-testid="text-title">{analysis.meta?.title?.text || "Missing"}</p>
                  <p className="text-xs text-muted-foreground" data-testid="text-title-length">
                    Length: {analysis.meta?.title?.length || 0} characters
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">Meta Description</h4>
                    <Badge variant={analysis.meta?.description?.isOptimal ? "default" : "destructive"} data-testid="badge-description-status">
                      {analysis.meta?.description?.isOptimal ? "Optimal" : "Needs Work"}
                    </Badge>
                  </div>
                  <p className="text-sm" data-testid="text-description">{analysis.meta?.description?.text || "Missing"}</p>
                  <p className="text-xs text-muted-foreground" data-testid="text-description-length">
                    Length: {analysis.meta?.description?.length || 0} characters
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Headings Structure */}
          <Card data-testid="card-headings">
            <CardHeader>
              <CardTitle>Heading Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.headings?.h1?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">H1 Tags ({analysis.headings.h1.length})</h4>
                    <ul className="space-y-1">
                      {analysis.headings.h1.map((h1, index) => (
                        <li key={index} className="text-sm text-muted-foreground" data-testid={`text-h1-${index}`}>
                          • {h1}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.headings?.h2?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">H2 Tags ({analysis.headings.h2.length})</h4>
                    <ul className="space-y-1">
                      {analysis.headings.h2.slice(0, 5).map((h2, index) => (
                        <li key={index} className="text-sm text-muted-foreground" data-testid={`text-h2-${index}`}>
                          • {h2}
                        </li>
                      ))}
                      {analysis.headings.h2.length > 5 && (
                        <li className="text-sm text-muted-foreground">
                          ... and {analysis.headings.h2.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                {!analysis.headings?.h1?.length && !analysis.headings?.h2?.length && (
                  <p className="text-sm text-muted-foreground">No heading structure detected</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card data-testid="card-business-info">
            <CardHeader>
              <CardTitle>Business Information Detected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Business Name:</span>
                    <span className="text-sm" data-testid="text-business-name">{analysis.businessInfo.name || "Not found"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Phone:</span>
                    <span className="text-sm" data-testid="text-business-phone">{analysis.businessInfo.phone || "Not found"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm" data-testid="text-business-email">{analysis.businessInfo.email || "Not found"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Address:</span>
                    <span className="text-sm" data-testid="text-business-address">{analysis.businessInfo.address || "Not found"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Business Type:</span>
                    <span className="text-sm" data-testid="text-business-type">{analysis.businessInfo.businessType || "Not detected"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Logo:</span>
                    <span className="text-sm" data-testid="text-business-logo">{analysis.businessInfo.logo ? "Found" : "Not found"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          {analysis.social.sameAs.length > 0 && (
            <Card data-testid="card-social">
              <CardHeader>
                <CardTitle>Social Media Presence</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {analysis.social.sameAs.map((social, index) => (
                    <li key={index} className="text-sm">
                      <a href={social} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1" data-testid={`link-social-${index}`}>
                        <ExternalLink className="h-3 w-3" />
                        {social}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Schema Tab */}
        <TabsContent value="schema" className="space-y-4">
          {/* Existing Schema */}
          <Card data-testid="card-existing-schema">
            <CardHeader>
              <CardTitle>Current Schema Markup</CardTitle>
              <CardDescription>
                Schema types detected on your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.schema.types.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Detected Schemas</h4>
                    <ul className="space-y-1">
                      {analysis.schema.types.map((type, index) => (
                        <li key={index} className="text-sm flex items-center gap-2" data-testid={`text-schema-detected-${index}`}>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {type}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Schema Status</h4>
                    <div className="space-y-1">
                      <div className="text-sm flex items-center gap-2">
                        {analysis.schema.hasOrganization ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <span data-testid="text-org-schema">Organization Schema</span>
                      </div>
                      <div className="text-sm flex items-center gap-2">
                        {analysis.schema.hasWebSite ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <span data-testid="text-website-schema">Website Schema</span>
                      </div>
                      <div className="text-sm flex items-center gap-2">
                        {analysis.schema.hasLocalBusiness ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <span data-testid="text-localbusiness-schema">LocalBusiness Schema</span>
                      </div>
                      <div className="text-sm flex items-center gap-2">
                        {analysis.schema.hasBreadcrumb ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <span data-testid="text-breadcrumb-schema">Breadcrumb Schema</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground" data-testid="text-no-schema">No schema markup detected</p>
              )}
            </CardContent>
          </Card>

          {/* Recommended Schema */}
          {schemaRecommendations.length > 0 && (
            <Card data-testid="card-recommended-schema">
              <CardHeader>
                <CardTitle>Recommended Schema Additions</CardTitle>
                <CardDescription>
                  Add these schemas to improve your AI visibility
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schemaRecommendations.map((schema, index) => (
                    <div key={index} className="border rounded-lg p-4" data-testid={`card-schema-rec-${index}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium" data-testid={`text-schema-rec-type-${index}`}>{schema.type} Schema</h4>
                          <p className="text-sm text-muted-foreground">
                            Add to: {schema.where.join(', ')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => copyToClipboard(
                              (schema as any).htmlCode || `<script type="application/ld+json">\n${JSON.stringify(schema.jsonld, null, 2)}\n</script>`,
                              `${schema.type} Schema HTML`
                            )}
                            data-testid={`button-copy-schema-rec-${index}`}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy HTML
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('https://www.scopesite.co.uk/strategy-meeting-uk-web-design', '_blank')}
                            data-testid={`button-help-schema-rec-${index}`}
                          >
                            Need A Hand?
                          </Button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Ready to paste in your website's &lt;head&gt; section:</p>
                        <pre className="text-xs text-black bg-white border p-3 rounded overflow-x-auto">
                          {(schema as any).htmlCode || `<script type="application/ld+json">\n${JSON.stringify(schema.jsonld, null, 2)}\n</script>`}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Purchase More Credits CTA */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800 mt-6">
        <CardContent className="p-4 sm:p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500/30 mb-4">
            <Sparkles className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold mb-3 text-green-900 dark:text-green-100">
            Scan More Websites
          </h3>
          <p className="text-sm sm:text-base text-green-700 dark:text-green-200 mb-4">
            Great analysis! Want to check more websites? Purchase additional credits to keep optimizing your online presence.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 max-w-md mx-auto">
            <Button 
              size="sm" 
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-600 dark:text-green-200 dark:hover:bg-green-900/20"
              data-testid="button-starter-comprehensive"
              asChild
            >
              <a href="/credits" className="flex items-center justify-center">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Starter Pack</span>
              </a>
            </Button>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              data-testid="button-pro-comprehensive"
              asChild
            >
              <a href="/credits" className="flex items-center justify-center">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Pro Pack</span>
              </a>
            </Button>
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-3">
            50 credits for £29 • 250 credits for £99 • Instant access
          </p>
        </CardContent>
      </Card>
    </div>
  );
}