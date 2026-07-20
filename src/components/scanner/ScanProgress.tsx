"use client";

import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import type { ScanProgress } from "@/lib/types";

interface ScanProgressProps {
  progress: ScanProgress;
}

export function ScanProgressDisplay({ progress }: ScanProgressProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10">
        <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
      </div>
      <div>
        <p className="text-lg font-medium text-zinc-100">{progress.stage}</p>
        <p className="mt-1 text-sm text-zinc-500">{progress.currentSignal}</p>
      </div>
      <div className="space-y-2">
        <Progress value={progress.progress} className="h-2 bg-zinc-800" />
        <p className="text-xs tabular-nums text-zinc-500">
          {progress.progress}% · {progress.signalsCollected}/{progress.totalSignals} modules
        </p>
      </div>
    </div>
  );
}
