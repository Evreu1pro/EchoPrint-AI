// ============================================================
// EchoPrint AI v2 — Scanner hook
// ============================================================

import { useState, useCallback } from 'react';
import { collectFingerprint, type ProgressCallback } from '@/lib/fingerprint/collector';
import { analyzeFingerprint, type FullAnalysisResult } from '@/lib/analysis/report';
import type { FingerprintData, ScanProgress } from '@/lib/types';

interface UseScannerResult {
  isScanning: boolean;
  progress: ScanProgress | null;
  fingerprintData: FingerprintData | null;
  analysisResult: FullAnalysisResult | null;
  error: string | null;
  startScan: () => Promise<void>;
  resetScan: () => void;
}

export function useScanner(): UseScannerResult {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [fingerprintData, setFingerprintData] = useState<FingerprintData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProgress: ProgressCallback = useCallback((newProgress) => {
    setProgress(newProgress);
  }, []);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    setProgress(null);
    setFingerprintData(null);
    setAnalysisResult(null);

    try {
      const data = await collectFingerprint(handleProgress);
      setFingerprintData(data);

      setProgress({
        stage: 'Integrity multi-sample',
        progress: 85,
        currentSignal: 'Canvas / Audio stability',
        signalsCollected: 14,
        totalSignals: 18,
      });

      setProgress({
        stage: 'Ads & deep tracking probes',
        progress: 88,
        currentSignal: 'Privacy Sandbox + tracker scripts',
        signalsCollected: 16,
        totalSignals: 20,
      });

      setProgress({
        stage: 'Network detective (server)',
        progress: 94,
        currentSignal: 'IP · headers · proxy · Client Hints',
        signalsCollected: 18,
        totalSignals: 20,
      });

      const analysis = await analyzeFingerprint(data);
      setAnalysisResult(analysis);

      setProgress({
        stage: 'Complete',
        progress: 100,
        currentSignal: 'Done',
        signalsCollected: 16,
        totalSignals: 16,
      });
    } catch (err) {
      console.error('Scanner error:', err);
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  }, [handleProgress]);

  const resetScan = useCallback(() => {
    setIsScanning(false);
    setProgress(null);
    setFingerprintData(null);
    setAnalysisResult(null);
    setError(null);
  }, []);

  return {
    isScanning,
    progress,
    fingerprintData,
    analysisResult,
    error,
    startScan,
    resetScan,
  };
}
