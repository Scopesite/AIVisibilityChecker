import { useState, useEffect, useRef } from "react";
import { X, Loader2, CheckCircle, AlertCircle, Search, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type ScanStatus = 'idle' | 'running' | 'complete' | 'error' | 'cancelled';

export interface ScanProgressProps {
  isOpen: boolean;
  status: ScanStatus;
  onCancel: () => void;
  onClose: () => void;
  websiteUrl?: string;
  error?: string;
}

const progressMessages = [
  { text: "Warming up the scanner…", icon: Search },
  { text: "Checking your AI visibility tags…", icon: Eye },
  { text: "Deep insight check on website SEO…", icon: Search },
  { text: "Crawling structured data & schema…", icon: Search },
  { text: "Running Core Web Vitals & PageSpeed…", icon: Search },
  { text: "Analysing content depth & headings…", icon: Search },
  { text: "Link profile & internal structure review…", icon: Search },
  { text: "Wrapping up your report…", icon: CheckCircle },
];

export function ScanProgress({ 
  isOpen, 
  status, 
  onCancel, 
  onClose, 
  websiteUrl,
  error 
}: ScanProgressProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Cycle through progress messages every 3.5 seconds when running
  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= progressMessages.length) {
          // Don't go past the last message, just stay there
          return progressMessages.length - 1;
        }
        return nextIndex;
      });
    }, 3500); // 3.5 second intervals

    return () => clearInterval(interval);
  }, [status]);

  // Update progress bar based on message index and status
  useEffect(() => {
    if (status === 'running') {
      // Progress from 10% to 90% based on message index
      const messageProgress = ((currentMessageIndex + 1) / progressMessages.length) * 80 + 10;
      setProgress(messageProgress);
    } else if (status === 'complete') {
      setProgress(100);
    } else if (status === 'error' || status === 'cancelled') {
      // Keep current progress on error/cancel
    } else {
      setProgress(0);
    }
  }, [currentMessageIndex, status]);

  // Reset message index when scan starts
  useEffect(() => {
    if (status === 'running') {
      setCurrentMessageIndex(0);
    }
  }, [status]);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      // Focus the cancel button when modal opens
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleCancel = () => {
    onCancel();
  };

  const handleClose = () => {
    onClose();
  };

  const currentMessage = progressMessages[currentMessageIndex];
  const CurrentIcon = currentMessage?.icon || Search;

  const getStatusContent = () => {
    switch (status) {
      case 'running':
        return (
          <div className="space-y-6">
            {/* Progress Header */}
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CurrentIcon className="w-8 h-8 text-primary" data-testid="progress-icon" />
              </div>
              <h3 className="text-lg font-semibold mb-2" data-testid="progress-title">
                Analyzing {websiteUrl}
              </h3>
              <p className="text-muted-foreground text-sm" data-testid="progress-subtitle">
                This usually takes 30-60 seconds
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-3">
              <Progress 
                value={progress} 
                className="h-2"
                aria-label={`Scan progress: ${Math.round(progress)}%`}
                data-testid="progress-bar"
              />
              <div className="text-center">
                <p className="text-sm font-medium" data-testid="progress-message">
                  {currentMessage?.text}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(progress)}% complete
                </p>
              </div>
            </div>

            {/* Cancel Button */}
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={handleCancel}
                ref={cancelButtonRef}
                data-testid="button-cancel-scan"
                aria-describedby="cancel-description"
              >
                Cancel Analysis
              </Button>
              <p id="cancel-description" className="text-xs text-muted-foreground mt-2">
                Your analysis will be stopped and no results will be provided
              </p>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" data-testid="success-icon" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2" data-testid="success-title">
                Analysis Complete!
              </h3>
              <p className="text-muted-foreground text-sm" data-testid="success-message">
                Your AI visibility report is ready. Check your results below and email.
              </p>
            </div>
            <Button onClick={handleClose} data-testid="button-view-results">
              View Results
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" data-testid="error-icon" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2" data-testid="error-title">
                Analysis Failed
              </h3>
              <p className="text-muted-foreground text-sm" data-testid="error-message">
                {error || "Something went wrong during the analysis. Please try again."}
              </p>
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={handleClose} data-testid="button-close-error">
                Close
              </Button>
            </div>
          </div>
        );

      case 'cancelled':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <X className="w-8 h-8 text-orange-600" data-testid="cancelled-icon" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2" data-testid="cancelled-title">
                Analysis Cancelled
              </h3>
              <p className="text-muted-foreground text-sm" data-testid="cancelled-message">
                Your website analysis was cancelled. You can start a new analysis anytime.
              </p>
            </div>
            <Button onClick={handleClose} data-testid="button-close-cancelled">
              Close
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  if (status === 'idle') {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md"
        aria-labelledby="scan-progress-title"
        aria-describedby="scan-progress-description"
        data-testid="modal-scan-progress"
      >
        <DialogHeader className="sr-only">
          <DialogTitle id="scan-progress-title">
            Website Analysis Progress
          </DialogTitle>
        </DialogHeader>
        
        {/* Hidden description for screen readers */}
        <div id="scan-progress-description" className="sr-only">
          {status === 'running' 
            ? `Currently analyzing ${websiteUrl}. ${currentMessage?.text}. ${Math.round(progress)}% complete.`
            : `Analysis ${status}${error ? `: ${error}` : ''}`
          }
        </div>

        {/* Main Content */}
        <div className="py-6">
          {getStatusContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ScanProgress;