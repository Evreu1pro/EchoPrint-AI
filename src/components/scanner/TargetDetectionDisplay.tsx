"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Shield, 
  Globe, 
  Cookie, 
  Code, 
  Fingerprint,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import type { FullDetectionResult, TargetDetectionResult, DetectionSignal } from "@/lib/detection/target-detector";
import type { TargetProfile, RiskLevel } from "@/lib/targets/profiles";

interface TargetDetectionDisplayProps {
  result: FullDetectionResult;
}

const riskColors: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  'LOW': { 
    bg: 'bg-green-500/10', 
    text: 'text-green-400', 
    border: 'border-green-500/30' 
  },
  'MEDIUM': { 
    bg: 'bg-yellow-500/10', 
    text: 'text-yellow-400', 
    border: 'border-yellow-500/30' 
  },
  'HIGH': { 
    bg: 'bg-orange-500/10', 
    text: 'text-orange-400', 
    border: 'border-orange-500/30' 
  },
  'CRITICAL': { 
    bg: 'bg-red-500/10', 
    text: 'text-red-400', 
    border: 'border-red-500/30' 
  }
};

const categoryIcons: Record<string, typeof Globe> = {
  'ecommerce': Globe,
  'social': Globe,
  'adtech': Globe,
  'analytics': Globe,
  'finance': Globe,
  'government': Globe
};

export function TargetDetectionDisplay({ result }: TargetDetectionDisplayProps) {
  const { results, overallRisk, totalRiskScore, criticalTargets, allSignals } = result;
  const riskStyle = riskColors[overallRisk];

  return (
    <div className="space-y-6">
      {/* Overall Risk Banner */}
      <div className={`p-6 rounded-xl border ${riskStyle.bg} ${riskStyle.border}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 ${riskStyle.text}`} />
            <div>
              <h3 className="text-xl font-bold">Target Detection Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Обнаружено {results.length} активных трекеров
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${riskStyle.text}`}>
              {totalRiskScore}%
            </div>
            <Badge variant="outline" className={riskStyle.text}>
              {overallRisk} RISK
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="p-3 rounded-lg bg-black/20">
            <div className="text-2xl font-bold">{results.length}</div>
            <div className="text-xs text-muted-foreground">Трекеров</div>
          </div>
          <div className="p-3 rounded-lg bg-black/20">
            <div className="text-2xl font-bold text-red-400">{criticalTargets.length}</div>
            <div className="text-xs text-muted-foreground">Критических</div>
          </div>
          <div className="p-3 rounded-lg bg-black/20">
            <div className="text-2xl font-bold">{allSignals.length}</div>
            <div className="text-xs text-muted-foreground">Сигналов</div>
          </div>
          <div className="p-3 rounded-lg bg-black/20">
            <div className="text-2xl font-bold text-orange-400">
              {results.filter(r => r.riskScore >= 50).length}
            </div>
            <div className="text-xs text-muted-foreground">Высокий риск</div>
          </div>
        </div>
      </div>

      {/* Target Cards */}
      <div className="grid gap-4">
        {results.slice(0, 5).map((targetResult) => (
          <TargetCard key={targetResult.profile.id} result={targetResult} />
        ))}
      </div>

      {/* All Detected Signals */}
      {allSignals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Fingerprint className="w-5 h-5" />
              Все обнаруженные сигналы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {allSignals.slice(0, 20).map((signal, i) => (
                <Badge 
                  key={i}
                  variant="outline"
                  className={
                    signal.severity === 'critical' ? 'border-red-500 text-red-400' :
                    signal.severity === 'high' ? 'border-orange-500 text-orange-400' :
                    signal.severity === 'medium' ? 'border-yellow-500 text-yellow-400' :
                    'border-green-500 text-green-400'
                  }
                >
                  {signal.type === 'domain' && <Globe className="w-3 h-3 mr-1" />}
                  {signal.type === 'script' && <Code className="w-3 h-3 mr-1" />}
                  {signal.type === 'fingerprint' && <Fingerprint className="w-3 h-3 mr-1" />}
                  {signal.type === 'storage' && <Cookie className="w-3 h-3 mr-1" />}
                  {signal.name}
                </Badge>
              ))}
              {allSignals.length > 20 && (
                <Badge variant="outline">
                  +{allSignals.length - 20} ещё
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Individual Target Card
function TargetCard({ result }: { result: TargetDetectionResult }) {
  const { profile, detected, confidence, signals, riskScore, recommendations } = result;
  const riskStyle = riskColors[profile.riskLevel];
  const Icon = categoryIcons[profile.category] || Globe;

  return (
    <Card className={`border-l-4 ${riskStyle.border}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${riskStyle.bg}`}>
              <Icon className={`w-5 h-5 ${riskStyle.text}`} />
            </div>
            <div>
              <h4 className="font-semibold">{profile.name}</h4>
              <p className="text-xs text-muted-foreground">{profile.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={riskStyle.text}>
              {profile.riskLevel}
            </Badge>
            <div className="text-right">
              <div className="text-lg font-bold">{riskScore}%</div>
              <div className="text-xs text-muted-foreground">
                {confidence}% уверенность
              </div>
            </div>
          </div>
        </div>

        {/* Detected Signals */}
        {signals.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Обнаружено:</p>
            <div className="flex flex-wrap gap-1">
              {signals.slice(0, 6).map((signal, i) => (
                <Badge 
                  key={i}
                  variant="outline"
                  className="text-xs"
                >
                  {signal.name}
                </Badge>
              ))}
              {signals.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{signals.length - 6}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">Рекомендации:</p>
            <ul className="space-y-1">
              {recommendations.slice(0, 3).map((rec, i) => (
                <li key={i} className="text-xs flex items-start gap-1">
                  <Shield className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Known Vulnerabilities */}
        {profile.knownVulnerabilities.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="w-3 h-3" />
            <span>
              {profile.knownVulnerabilities.length} известных проблем: {' '}
              {profile.knownVulnerabilities[0].description}
            </span>
          </div>
        )}

        {/* Data Transfer Warning */}
        {profile.dataTransferDestination && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <Globe className="w-3 h-3 text-orange-400" />
            <span className="text-orange-400">
              Данные передаются: {profile.dataTransferDestination.join(', ')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for sidebar
export function TargetDetectionSummary({ result }: { result: FullDetectionResult }) {
  const riskStyle = riskColors[result.overallRisk];

  return (
    <div className={`p-4 rounded-lg ${riskStyle.bg} border ${riskStyle.border}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-5 h-5 ${riskStyle.text}`} />
          <span className="font-medium">Target Detection</span>
        </div>
        <Badge className={riskStyle.text}>
          {result.results.length} трекеров
        </Badge>
      </div>
      
      <div className="mt-2 flex gap-2">
        {result.results.slice(0, 4).map(r => (
          <div 
            key={r.profile.id}
            className="px-2 py-1 rounded bg-black/20 text-xs"
          >
            {r.profile.name.split(' ')[0]}
          </div>
        ))}
      </div>
    </div>
  );
}
