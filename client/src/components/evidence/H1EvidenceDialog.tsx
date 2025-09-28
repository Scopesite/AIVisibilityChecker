import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClipboard } from "@/hooks/useClipboard";
import { Code } from "@/components/ui/code";

type H1Evidence = { text: string; selector: string; hidden?: boolean };

export function H1EvidenceDialog({
  open, onOpenChange, h1s
}: { open: boolean; onOpenChange: (v: boolean) => void; h1s: H1Evidence[] }) {
  const { copy } = useClipboard();

  // DEBUG: Log H1 evidence data received by dialog
  console.log('🔍 H1EvidenceDialog received:', {
    h1sLength: h1s?.length || 0,
    h1sData: h1s,
    isOpen: open
  });

  const visibleH1s = h1s.filter(h => !h.hidden);
  const fix = "Use exactly one <h1> per page. Demote additional headings to <h2>.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>H1 Evidence</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground mb-2">
          We found {visibleH1s.length} visible H1{visibleH1s.length !== 1 ? "s" : ""}.
          {h1s.length > visibleH1s.length && " Hidden H1s are shown for transparency."}
        </p>

        <ul className="space-y-3 max-h-96 overflow-y-auto">
          {h1s.map((h, i) => (
            <li key={i} className="rounded-md border p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">
                  #{i + 1} {h.hidden && <Badge variant="secondary" className="ml-2">hidden</Badge>}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copy(h.selector, "Selector copied")}
                  data-testid={`copy-selector-${i}`}
                >
                  Copy selector
                </Button>
              </div>
              <div className="text-sm mb-2 text-foreground">
                "{h.text || "(empty)"}"
              </div>
              <Code className="block text-xs break-all">{h.selector}</Code>
            </li>
          ))}
        </ul>

        {h1s.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No H1 elements found on this page.</p>
            <p className="text-sm mt-2">Consider adding a semantic &lt;h1&gt; element to improve SEO.</p>
          </div>
        )}

        <div className="mt-4 rounded-md bg-muted p-3 text-sm">
          <span className="font-medium">Fix:</span> {fix}
        </div>
      </DialogContent>
    </Dialog>
  );
}