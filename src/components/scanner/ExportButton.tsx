"use client";

import { Button } from "@/components/ui/button";
import { Download, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { FingerprintData } from "@/lib/types";
import type { FullAnalysisResult } from "@/lib/analysis/report";

interface ExportButtonProps {
  fingerprintData: FingerprintData;
  analysisResult: FullAnalysisResult;
  label?: string;
}

export function ExportButton({
  fingerprintData,
  analysisResult,
  label = "Export JSON",
}: ExportButtonProps) {
  const [copied, setCopied] = useState(false);

  const generateReport = () => ({
    version: "2.0.0",
    generatedAt: new Date().toISOString(),
    fingerprint: fingerprintData,
    analysis: {
      uniqueness: analysisResult.uniqueness,
      consistency: analysisResult.consistency,
      anomaly: analysisResult.anomaly,
      overallScore: analysisResult.overallScore,
      privacyRiskLevel: analysisResult.privacyRiskLevel,
      trackabilityLevel: analysisResult.trackabilityLevel,
      integrity: analysisResult.integrity,
      exposure: analysisResult.exposure,
      aiReport: analysisResult.aiReport,
    },
    disclaimer:
      "Generated client-side by EchoPrint AI for educational / personal use. No data was uploaded.",
  });

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(generateReport(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `echoprint-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(JSON.stringify(generateReport(), null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={downloadJSON} variant="outline" className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800">
        <Download className="h-4 w-4" />
        {label}
      </Button>
      <Button onClick={copyToClipboard} variant="ghost" className="gap-2 text-zinc-400 hover:text-zinc-100">
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
