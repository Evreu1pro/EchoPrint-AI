"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { runFullModulePipeline } from "@/lib/modules/pipeline";
import type { FullModuleReport } from "@/lib/modules/types";
import {
  loadHistory,
  pushHistory,
  removeHistoryEntry,
  clearHistory,
  HISTORY_KEY,
  type ScanHistoryEntry,
} from "@/lib/history/store";

function subscribeHistory(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = (e: StorageEvent) => {
    if (e.key === null || e.key === HISTORY_KEY) onStoreChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getHistorySnapshot(): ScanHistoryEntry[] {
  return loadHistory();
}

function getServerHistorySnapshot(): ScanHistoryEntry[] {
  return [];
}

/** Bump local subscribers after same-tab writes (storage event is cross-tab only). */
function notifyLocalHistory() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new StorageEvent("storage", { key: HISTORY_KEY }));
}

export function useModuleScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; pct: number } | null>(null);
  const [report, setReport] = useState<FullModuleReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const history = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getServerHistorySnapshot
  );

  const startScan = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    setReport(null);
    setProgress({ stage: "Starting", pct: 0 });
    try {
      const r = await runFullModulePipeline((stage, pct) => setProgress({ stage, pct }));
      setReport(r);
      pushHistory(r);
      notifyLocalHistory();
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

  const viewEntry = useCallback((entry: ScanHistoryEntry) => {
    setReport(entry.report);
    setError(null);
    setProgress(null);
  }, []);

  const removeEntry = useCallback((id: string) => {
    removeHistoryEntry(id);
    notifyLocalHistory();
  }, []);

  const clearAllHistory = useCallback(() => {
    clearHistory();
    notifyLocalHistory();
  }, []);

  return {
    isScanning,
    progress,
    report,
    error,
    history,
    startScan,
    reset,
    viewEntry,
    removeEntry,
    clearAllHistory,
    setReport,
  };
}
