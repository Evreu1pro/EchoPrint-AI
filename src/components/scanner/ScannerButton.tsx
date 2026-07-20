"use client";

import { Button } from "@/components/ui/button";
import { Scan } from "lucide-react";

interface ScannerButtonProps {
  onClick: () => void;
  isScanning: boolean;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
}

export function ScannerButton({
  onClick,
  isScanning,
  disabled,
  label,
  compact,
}: ScannerButtonProps) {
  const text = isScanning ? "Scanning…" : label || "Run full scan";

  return (
    <Button
      onClick={onClick}
      disabled={isScanning || disabled}
      size={compact ? "default" : "lg"}
      className={
        compact
          ? "gap-2 border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
          : "relative group overflow-hidden rounded-xl bg-cyan-500 px-8 py-6 text-base font-semibold text-zinc-950 shadow-[0_0_32px_-8px_rgba(34,211,238,0.55)] transition hover:bg-cyan-400 disabled:opacity-50 sm:text-lg"
      }
    >
      <span className="relative z-10 flex items-center gap-2">
        <Scan className={`h-5 w-5 ${isScanning ? "animate-spin" : ""}`} />
        {text}
      </span>
    </Button>
  );
}
