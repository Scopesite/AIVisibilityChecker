import { useState, useCallback, useRef, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

export type ScanStatus = 'idle' | 'running' | 'complete' | 'error' | 'cancelled';

export type ScanMilestone = 
  | 'queued'
  | 'render' 
  | 'seo_extract'
  | 'psi'
  | 'score'
  | 'complete';

interface ScanResult {
  run_id: string;
  status: 'complete' | 'error';
  data?: any;
  error?: string;
}

interface UseScanControllerOptions {
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  onMilestone?: (milestone: ScanMilestone) => void;
  softTimeoutMs?: number;  // Default: 60 seconds
  hardTimeoutMs?: number;  // Default: 180 seconds
}

export interface ScanControllerState {
  status: ScanStatus;
  runId: string | null;
  currentMilestone: ScanMilestone | null;
  error: string | null;
  isSSESupported: boolean;
  progress: number;
  result: any | null;
}

export function useScanController(options: UseScanControllerOptions = {}) {
  const {
    onComplete,
    onError,
    onMilestone,
    softTimeoutMs = 60000,  // 60 seconds
    hardTimeoutMs = 180000  // 180 seconds (3 minutes)
  } = options;

  const [state, setState] = useState<ScanControllerState>({
    status: 'idle',
    runId: null,
    currentMilestone: null,
    error: null,
    isSSESupported: true,
    progress: 0,
    result: null
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const softTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hardTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (softTimeoutRef.current) {
      clearTimeout(softTimeoutRef.current);
      softTimeoutRef.current = null;
    }
    if (hardTimeoutRef.current) {
      clearTimeout(hardTimeoutRef.current);
      hardTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Handle milestone updates
  const handleMilestone = useCallback((milestone: ScanMilestone) => {
    setState(prev => {
      // Calculate progress based on milestone
      const milestoneProgress = {
        queued: 5,
        render: 20,
        seo_extract: 40,
        psi: 65,
        score: 85,
        complete: 100
      };

      return {
        ...prev,
        currentMilestone: milestone,
        progress: milestoneProgress[milestone] || prev.progress
      };
    });

    onMilestone?.(milestone);
  }, [onMilestone]);

  // Handle scan completion
  const handleComplete = useCallback((result: any) => {
    cleanup();
    setState(prev => ({
      ...prev,
      status: 'complete',
      currentMilestone: 'complete',
      progress: 100,
      result: result
    }));
    onComplete?.(result);
  }, [cleanup, onComplete]);

  // Handle scan error
  const handleError = useCallback((error: string) => {
    cleanup();
    setState(prev => ({
      ...prev,
      status: 'error',
      error
    }));
    onError?.(error);
  }, [cleanup, onError]);

  // SSE Event handling
  const setupSSE = useCallback((runId: string) => {
    try {
      const eventSource = new EventSource(`/api/scan/${runId}/events`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('📡 SSE connection opened for scan:', runId);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 SSE milestone received:', data);
          
          if (data.milestone) {
            handleMilestone(data.milestone);
          }
          
          if (data.status === 'complete' && data.result) {
            handleComplete(data.result);
          } else if (data.status === 'error') {
            handleError(data.error || 'Analysis failed');
          }
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.warn('📡 SSE connection error, falling back to polling:', error);
        eventSource.close();
        eventSourceRef.current = null;
        
        setState(prev => ({ ...prev, isSSESupported: false }));
        startPolling(runId);
      };

    } catch (error) {
      console.warn('SSE not supported, using polling:', error);
      setState(prev => ({ ...prev, isSSESupported: false }));
      startPolling(runId);
    }
  }, [handleMilestone, handleComplete, handleError]);

  // Polling fallback
  const startPolling = useCallback((runId: string) => {
    let attempts = 0;
    const maxAttempts = 90; // 3 minutes with 2s intervals
    
    const poll = async () => {
      try {
        const response = await apiRequest('GET', `/result/${runId}`);
        
        if (response.ok) {
          const result = await response.json();
          console.log('📊 Polling: Analysis complete:', result);
          handleComplete(result);
          return;
        }
      } catch (error) {
        console.log(`Polling attempt ${attempts + 1} failed:`, error);
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        handleError('Analysis timed out. Please try again.');
      }
    };

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(poll, 2000);
    
    // Start first poll immediately
    poll();
  }, [handleComplete, handleError]);

  // Start scan function
  const startScan = useCallback(async (email: string, websiteUrl: string, scanType: 'basic' | 'deep' = 'basic') => {
    try {
      cleanup(); // Clean up any existing scan
      
      setState(prev => ({
        ...prev,
        status: 'running',
        runId: null,
        currentMilestone: 'queued',
        error: null,
        progress: 5
      }));

      // Create abort controller for request cancellation
      abortControllerRef.current = new AbortController();

      // Start the scan
      const response = await apiRequest('POST', '/api/scan/start', {
        email,
        website_url: websiteUrl,
        scan_type: scanType
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start scan');
      }

      const { run_id } = await response.json();
      
      setState(prev => ({
        ...prev,
        runId: run_id
      }));

      console.log('🚀 Scan started with ID:', run_id);

      // Set up timeouts
      softTimeoutRef.current = setTimeout(() => {
        console.warn('⏰ Soft timeout reached (60s), but continuing...');
        // Could show a message to user that it's taking longer than expected
      }, softTimeoutMs);

      hardTimeoutRef.current = setTimeout(() => {
        console.error('⏰ Hard timeout reached (180s), cancelling scan');
        handleError('Analysis timed out. Please try again later.');
      }, hardTimeoutMs);

      // Start SSE or polling
      if (state.isSSESupported) {
        setupSSE(run_id);
      } else {
        startPolling(run_id);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Scan request was cancelled');
        return;
      }
      
      console.error('Failed to start scan:', error);
      handleError(error.message || 'Failed to start analysis');
    }
  }, [cleanup, softTimeoutMs, hardTimeoutMs, handleError, state.isSSESupported, setupSSE, startPolling]);

  // Start free scan for unauthenticated users (Option B: Direct response, no SSE)
  const startFreeScan = useCallback(async (email: string, websiteUrl: string) => {
    try {
      cleanup(); // Clean up any existing scan
      
      setState(prev => ({
        ...prev,
        status: 'running',
        runId: null,
        currentMilestone: 'queued',
        error: null,
        progress: 10
      }));

      // Create abort controller for request cancellation
      abortControllerRef.current = new AbortController();

      // Simulate progress updates for better UX
      let progressInterval: NodeJS.Timeout | null = setInterval(() => {
        setState(prev => {
          if (prev.status === 'running' && prev.progress < 90) {
            return { ...prev, progress: prev.progress + 10 };
          }
          return prev;
        });
      }, 2000);

      console.log('🆓 Starting free scan for:', email, 'on:', websiteUrl);

      try {
        // Start the free scan - this returns results directly, not SSE
        const response = await apiRequest('POST', '/api/scan/free', {
          email,
          website_url: websiteUrl,
          consent: true
        });

        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to start free scan');
        }

        const result = await response.json();
        
        console.log('🆓 Free scan completed with result:', result);

        // Handle direct result (no SSE needed)
        handleComplete(result);

      } catch (scanError) {
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        throw scanError;
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Free scan request was cancelled');
        return;
      }
      
      console.error('Failed to start free scan:', error);
      handleError(error.message || 'Failed to start free analysis');
    }
  }, [cleanup, handleComplete, handleError]);

  // Cancel scan function
  const cancelScan = useCallback(async () => {
    const { runId } = state;
    
    if (!runId) {
      cleanup();
      setState(prev => ({ ...prev, status: 'idle' }));
      return;
    }

    try {
      // Call backend cancel endpoint
      await apiRequest('POST', `/api/scan/${runId}/cancel`);
      console.log('🛑 Scan cancelled:', runId);
    } catch (error) {
      console.warn('Failed to cancel scan on backend:', error);
      // Continue with local cleanup even if backend cancel fails
    }

    cleanup();
    setState(prev => ({
      ...prev,
      status: 'cancelled',
      error: null
    }));
  }, [cleanup, state]);

  // Reset scan to idle state
  const resetScan = useCallback(() => {
    cleanup();
    setState({
      status: 'idle',
      runId: null,
      currentMilestone: null,
      error: null,
      isSSESupported: true,
      progress: 0,
      result: null
    });
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    ...state,
    startScan,
    startFreeScan,
    cancelScan,
    resetScan
  };
}

export default useScanController;