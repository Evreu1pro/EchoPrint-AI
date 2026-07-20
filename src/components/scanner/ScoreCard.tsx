"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Fingerprint, Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface ScoreCardProps {
  title: string;
  score: number;
  description: string;
  type: "uniqueness" | "consistency" | "anomaly" | "overall" | "integrity" | "exposure";
  level?: string;
}

const ICON_MAP = {
  uniqueness: Fingerprint,
  consistency: CheckCircle,
  anomaly: AlertTriangle,
  integrity: Shield,
  exposure: AlertTriangle,
  overall: Shield,
};

function scoreTone(score: number, type: string): string {
  // uniqueness / exposure: high = bad (risk)
  if (type === "uniqueness" || type === "exposure") {
    if (score >= 75) return "text-rose-400 border-rose-500/25";
    if (score >= 50) return "text-amber-400 border-amber-500/25";
    return "text-emerald-400 border-emerald-500/25";
  }
  // integrity / consistency / overall: high = good
  if (score >= 75) return "text-emerald-400 border-emerald-500/25";
  if (score >= 50) return "text-amber-400 border-amber-500/25";
  return "text-rose-400 border-rose-500/25";
}

export function ScoreCard({ title, score, description, type }: ScoreCardProps) {
  const tone = scoreTone(score, type);
  const Icon = ICON_MAP[type] || Shield;

  return (
    <Card className={`border bg-zinc-900/50 ${tone.split(" ")[1] || "border-zinc-800"}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Icon className={`h-4 w-4 ${tone.split(" ")[0]}`} />
          <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        </div>
        <div className={`text-3xl font-semibold tabular-nums ${tone.split(" ")[0]}`}>
          {score}
          <span className="text-base font-normal text-zinc-600">/100</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">{description}</p>
      </CardContent>
    </Card>
  );
}

interface BigScoreCardProps {
  title: string;
  score: number;
  description?: string;
  subtitle?: string;
  type?: "privacy" | "trackability" | "overall";
}

export function BigScoreCard({ title, score, description, subtitle, type = "overall" }: BigScoreCardProps) {
  const label = description || subtitle || "";
  // overall privacy posture: higher = better protected
  const tone =
    score >= 70
      ? "from-emerald-500/15 border-emerald-500/30 text-emerald-300"
      : score >= 45
        ? "from-amber-500/15 border-amber-500/30 text-amber-300"
        : "from-rose-500/15 border-rose-500/30 text-rose-300";

  return (
    <Card className={`border bg-gradient-to-br to-transparent sm:col-span-2 lg:col-span-1 ${tone}`}>
      <CardContent className="p-5 sm:p-6">
        <div className="mb-2 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        </div>
        <div className="text-4xl font-semibold tabular-nums text-white">{score}</div>
        <p className="mt-2 text-xs text-zinc-400">{label}</p>
        {type === "trackability" && null}
      </CardContent>
    </Card>
  );
}
