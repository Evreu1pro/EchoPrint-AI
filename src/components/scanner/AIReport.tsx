"use client";

import {
  Sparkles,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ListChecks,
} from "lucide-react";
import type { AIReport } from "@/lib/types";

interface AIReportDisplayProps {
  report: AIReport;
}

export function AIReportDisplay({ report }: AIReportDisplayProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/15">
          <Sparkles className="h-4 w-4 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Analysis report</h3>
          <p className="text-xs text-zinc-500">Generated entirely on-device</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm leading-relaxed text-zinc-300">
        {report.summary}
      </div>

      <div className="grid gap-4">
        <ReportBlock
          icon={<Fingerprint className="h-4 w-4 text-cyan-400" />}
          title="Uniqueness"
          body={report.uniquenessAssessment}
        />
        <ReportBlock
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          title="Consistency"
          body={report.consistencyAssessment}
        />
        <ReportBlock
          icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
          title="Anomalies & integrity"
          body={report.anomalyAssessment}
        />
      </div>

      {report.recommendations.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <ListChecks className="h-4 w-4 text-cyan-400" />
            Recommendations
          </h4>
          <ul className="space-y-1.5">
            {report.recommendations.map((r, i) => (
              <li key={i} className="text-sm text-zinc-400">
                · {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.privacyTips.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Privacy tips
          </h4>
          <ul className="space-y-1.5">
            {report.privacyTips.map((tip, i) => (
              <li key={i} className="text-sm text-zinc-400">
                · {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReportBlock({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-zinc-100">{title}</h4>
        <p className="mt-0.5 text-sm leading-relaxed text-zinc-500">{body}</p>
      </div>
    </div>
  );
}
