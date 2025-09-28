import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Copy, ExternalLink, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AiCrawlerAccessProps {
  origin: string;
}

interface RobotResult {
  bot: string;
  directive: string;
  allowedRoot: boolean;
  disallowedRoot: boolean;
  docs: string;
  fixLines: string[];
  note?: string;
}

interface RobotsResponse {
  robotsUrl: string;
  robotsText: string;
  results: RobotResult[];
}

export function AiCrawlerAccess({ origin }: AiCrawlerAccessProps) {
  const { toast } = useToast();
  
  const { data, isLoading, error } = useQuery<RobotsResponse>({
    queryKey: ['robots', origin],
    queryFn: async () => {
      const response = await fetch(`/api/scan/robots?origin=${encodeURIComponent(origin)}`);
      if (!response.ok) {
        throw new Error('Failed to analyze robots.txt');
      }
      return response.json();
    },
    enabled: !!origin
  });

  const copyFixes = (bot: string, fixLines: string[]) => {
    if (fixLines.length > 0) {
      navigator.clipboard.writeText(fixLines.join('\n'));
      toast({
        title: "Fix copied!",
        description: `Copied ${bot} robots.txt fix to clipboard`,
      });
    }
  };

  const copyRobotsUrl = () => {
    if (data?.robotsUrl) {
      navigator.clipboard.writeText(data.robotsUrl);
      toast({
        title: "URL copied!",
        description: "Robots.txt URL copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="ai-crawler-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            AI Crawler Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Checking AI crawler access...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="ai-crawler-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            AI Crawler Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">Error loading robots.txt analysis</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="ai-crawler-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            AI Crawler Access
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="view-robots-btn">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View robots.txt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    Robots.txt Content
                    <Button variant="ghost" size="sm" onClick={copyRobotsUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground break-all">
                    {data?.robotsUrl}
                  </div>
                  <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
                    {data?.robotsText || "No robots.txt file found"}
                  </pre>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data?.results?.map((result) => (
            <div key={result.bot} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`robot-${result.bot.toLowerCase()}`}>
              <div className="flex items-center gap-3">
                <span className="font-medium">{result.bot}</span>
                <Badge 
                  variant={result.allowedRoot ? "default" : "destructive"}
                  className={result.allowedRoot ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {result.allowedRoot ? "✅ Allowed" : "❌ Blocked"}
                </Badge>
                {result.note && (
                  <Badge variant="outline" className="text-xs">
                    {result.note}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.open(result.docs, '_blank')}
                  data-testid={`docs-${result.bot.toLowerCase()}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                {!result.allowedRoot && result.fixLines.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyFixes(result.bot, result.fixLines)}
                    data-testid={`copy-fix-${result.bot.toLowerCase()}`}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Fix
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        {data?.results?.some(r => !r.allowedRoot) && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Fix:</strong> Paste the copied lines into your robots.txt file to allow AI crawlers access to your site.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}