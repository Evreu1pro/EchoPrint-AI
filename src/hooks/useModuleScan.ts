"use client";

import { useState, useCallback } from "react";
import { runFullModulePipeline } from "@/lib/modules/pipeline";
import type { FullModuleReport } from "@/lib/modules/types";

export function useModuleScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; pct: number } | null>(null);
  const [report, setReport] = useState<FullModuleReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    setReport(null);
    setProgress({ stage: "Starting", pct: 0 });
    try {
      const r = await runFullModulePipeline((stage, pct) => setProgress({ stage, pct }));
      setReport(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setIsScanning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setReport(null);
    setProgress(null);
    setError(null);
    setIsScanning(false);
  }, []);

  return { isScanning, progress, report, error, startScan, reset };
}
