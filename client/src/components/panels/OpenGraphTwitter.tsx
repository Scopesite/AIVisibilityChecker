import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Copy, ExternalLink, Share2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useClipboard } from '@/hooks/useClipboard';

interface OpenGraphTwitterProps {
  url: string;
}

interface MetaTag {
  name: string;
  property: string;
  content: string;
  present: boolean;
  suggested?: string;
  critical: boolean;
}

interface MetaTagsResponse {
  url: string;
  openGraph: {
    title: MetaTag;
    description: MetaTag;
    image: MetaTag;
    url: MetaTag;
    type: MetaTag;
    siteName: MetaTag;
  };
  twitter: {
    card: MetaTag;
    title: MetaTag;
    description: MetaTag;
    image: MetaTag;
    site: MetaTag;
    creator: MetaTag;
  };
  canonical: MetaTag;
  basic: {
    title: string;
    description: string;
    h1: string[];
    images: string[];
    siteName: string;
  };
  suggestions: {
    html: string[];
    missing: string[];
  };
}

export function OpenGraphTwitter({ url }: OpenGraphTwitterProps) {
  const { toast } = useToast();
  const { copy } = useClipboard();
  
  const { data, isLoading, error } = useQuery<MetaTagsResponse>({
    queryKey: ['meta-tags', url],
    queryFn: async () => {
      const response = await fetch(`/api/scan/meta?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error('Failed to analyze meta tags');
      }
      return response.json();
    },
    enabled: !!url
  });

  const copyMetaTag = (htmlTag: string, tagName: string) => {
    const tagType = tagName === 'canonical' ? 'canonical link' : 'meta tag';
    copy(htmlTag, `Copied ${tagName} ${tagType} to clipboard`);
  };

  const copyAllMissing = () => {
    if (data?.suggestions.html && data.suggestions.html.length > 0) {
      const allTags = data.suggestions.html.join('\n');
      copy(allTags, `Copied ${data.suggestions.html.length} missing meta tags to clipboard`);
    }
  };

  const getTagStatus = (tag: MetaTag) => {
    if (tag.present) {
      return { icon: CheckCircle, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800", status: "Present" };
    } else if (tag.critical) {
      return { icon: XCircle, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800", status: "Missing" };
    } else {
      return { icon: AlertCircle, color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800", status: "Optional" };
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="meta-tags-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Open Graph & Twitter Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-900 dark:text-gray-100">Analyzing meta tags for social sharing...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="meta-tags-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Open Graph & Twitter Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">Error loading meta tags analysis</div>
        </CardContent>
      </Card>
    );
  }

  const criticalMissing = data?.suggestions.missing.filter(tag => {
    const ogTag = Object.values(data.openGraph).find(t => t.property === tag);
    const twitterTag = Object.values(data.twitter).find(t => t.name === tag);
    const canonicalTag = tag === 'canonical' ? data.canonical : null;
    return (ogTag?.critical || twitterTag?.critical || canonicalTag?.critical);
  }).length || 0;

  return (
    <Card data-testid="meta-tags-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Open Graph & Twitter Cards
          </div>
          <div className="flex items-center gap-2">
            {data?.suggestions.html && data.suggestions.html.length > 0 && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={copyAllMissing}
                data-testid="copy-all-meta-btn"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy All Missing ({data.suggestions.html.length})
              </Button>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="view-analysis-btn">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Analysis
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Meta Tags Analysis</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2">Page Summary</h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Title:</strong> {data?.basic.title || 'Not found'}</div>
                      <div><strong>Description:</strong> {data?.basic.description || 'Not found'}</div>
                      <div><strong>H1 Tags:</strong> {data?.basic.h1.length || 0} found</div>
                      <div><strong>Images:</strong> {data?.basic.images.length || 0} found</div>
                    </div>
                  </div>
                  
                  {data?.suggestions.html && data.suggestions.html.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Missing Meta Tags HTML</h4>
                      <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                        {data.suggestions.html.join('\n')}
                      </pre>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Summary */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">
                {Object.values({...data?.openGraph, ...data?.twitter, canonical: data?.canonical}).filter(tag => tag?.present).length} Present
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">
                {criticalMissing} Critical Missing
              </span>
            </div>
          </div>

          {/* Open Graph Tags */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/7/72/Facebook_logo_2013.svg" alt="Facebook" className="h-4 w-4" />
              Open Graph (Facebook, LinkedIn)
            </h4>
            <div className="space-y-2">
              {data && Object.entries(data.openGraph).map(([key, tag]) => {
                const status = getTagStatus(tag);
                const StatusIcon = status.icon;
                
                return (
                  <div 
                    key={key} 
                    className={`flex items-center justify-between p-3 border rounded-lg ${status.bgColor}`}
                    data-testid={`og-${key}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <StatusIcon className={`h-4 w-4 ${status.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{tag.property}</div>
                        {tag.present ? (
                          <div className="text-xs text-gray-700 dark:text-gray-300 break-words">
                            {tag.content}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-700 dark:text-gray-300 break-words">
                            Suggested: {tag.suggested}
                          </div>
                        )}
                      </div>
                      <Badge 
                        variant={tag.present ? "default" : tag.critical ? "destructive" : "secondary"}
                        className={tag.present ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {status.status}
                      </Badge>
                    </div>
                    {!tag.present && tag.suggested && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="ml-2 flex-shrink-0"
                        onClick={() => copyMetaTag(
                          `<meta property="${tag.property}" content="${tag.suggested}" />`,
                          tag.property
                        )}
                        data-testid={`copy-og-${key}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Canonical URL */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Canonical URL
            </h4>
            <div className="space-y-2">
              {data?.canonical && (() => {
                const status = getTagStatus(data.canonical);
                const StatusIcon = status.icon;
                
                return (
                  <div 
                    className={`flex items-center justify-between p-3 border rounded-lg ${status.bgColor}`}
                    data-testid="canonical-tag"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <StatusIcon className={`h-4 w-4 ${status.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">Canonical URL</div>
                        {data.canonical.present ? (
                          <div className="text-xs text-gray-700 dark:text-gray-300 break-words">
                            {data.canonical.content}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-700 dark:text-gray-300 break-words">
                            Suggested: {data.canonical.suggested}
                          </div>
                        )}
                      </div>
                      <Badge 
                        variant={data.canonical.present ? "default" : data.canonical.critical ? "destructive" : "secondary"}
                        className={data.canonical.present ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {status.status}
                      </Badge>
                    </div>
                    {!data.canonical.present && data.canonical.suggested && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="ml-2 flex-shrink-0"
                        onClick={() => copyMetaTag(
                          `<link rel="canonical" href="${data.canonical.suggested}" />`,
                          'canonical'
                        )}
                        data-testid="copy-canonical"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Twitter Cards */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg" alt="Twitter" className="h-4 w-4" />
              Twitter Cards
            </h4>
            <div className="space-y-2">
              {data && Object.entries(data.twitter).map(([key, tag]) => {
                const status = getTagStatus(tag);
                const StatusIcon = status.icon;
                
                return (
                  <div 
                    key={key} 
                    className={`flex items-center justify-between p-3 border rounded-lg ${status.bgColor}`}
                    data-testid={`twitter-${key}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <StatusIcon className={`h-4 w-4 ${status.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{tag.name}</div>
                        {tag.present ? (
                          <div className="text-xs text-gray-700 dark:text-gray-300 break-words">
                            {tag.content}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-700 dark:text-gray-300 break-words">
                            Suggested: {tag.suggested}
                          </div>
                        )}
                      </div>
                      <Badge 
                        variant={tag.present ? "default" : tag.critical ? "destructive" : "secondary"}
                        className={tag.present ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {status.status}
                      </Badge>
                    </div>
                    {!tag.present && tag.suggested && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="ml-2 flex-shrink-0"
                        onClick={() => copyMetaTag(
                          `<meta name="${tag.name}" content="${tag.suggested}" />`,
                          tag.name
                        )}
                        data-testid={`copy-twitter-${key}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Help Text */}
          {criticalMissing > 0 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Fix:</strong> Copy the missing meta tags and canonical link, then paste them into your HTML &lt;head&gt; section to improve SEO and social media sharing.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}