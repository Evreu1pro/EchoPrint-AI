'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PrivacyNotice } from '@/components/layout/PrivacyNotice';
import { ScannerButton } from '@/components/scanner/ScannerButton';
import { ScanProgressDisplay } from '@/components/scanner/ScanProgress';
import { ScoreCard, BigScoreCard } from '@/components/scanner/ScoreCard';
import { AIReportDisplay } from '@/components/scanner/AIReport';
import { CategorySection } from '@/components/scanner/ParameterCard';
import { ExportButton } from '@/components/scanner/ExportButton';
import { DeviceBadge, DeviceInfoCard } from '@/components/scanner/DeviceBadge';
import { TargetDetectionDisplay } from '@/components/scanner/TargetDetectionDisplay';
import { TrackingPostureDisplay } from '@/components/scanner/TrackingPostureDisplay';
import { NetworkDetectiveDisplay } from '@/components/scanner/NetworkDetectiveDisplay';
import { useScanner } from '@/hooks/useScanner';
import { fingerprintToCategories } from '@/lib/utils/display';
import type { Locale } from '@/lib/i18n/messages';
import { t, riskLabel } from '@/lib/i18n/messages';
import {
  Fingerprint,
  Shield,
  ScanSearch,
  Crosshair,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Megaphone,
} from 'lucide-react';

export default function Home() {
  const [locale, setLocale] = useState<Locale>('en');
  const {
    isScanning,
    progress,
    fingerprintData,
    analysisResult,
    error,
    startScan,
    resetScan,
  } = useScanner();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('echoprint-locale') as Locale | null;
      if (saved === 'en' || saved === 'ru') setLocale(saved);
      else if (navigator.language?.toLowerCase().startsWith('ru')) setLocale('ru');
    } catch {
      /* ignore */
    }
  }, []);

  const changeLocale = (l: Locale) => {
    setLocale(l);
    try {
      localStorage.setItem('echoprint-locale', l);
    } catch {
      /* ignore */
    }
  };

  const categories = fingerprintData ? fingerprintToCategories(fingerprintData) : [];
  const integrity = analysisResult?.integrity;
  const exposure = analysisResult?.exposure;
  const tracking = analysisResult?.tracking;
  const network = analysisResult?.network;

  return (
    <div className="flex min-h-screen flex-col bg-[#070a0e] text-zinc-100">
      <Header locale={locale} onLocaleChange={changeLocale} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {/* Hero */}
        {!fingerprintData && !isScanning && (
          <section className="mx-auto mb-14 max-w-3xl text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-cyan-500/20 to-transparent shadow-[0_0_40px_-10px_rgba(34,211,238,0.45)]">
              <Fingerprint className="h-8 w-8 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              {t(locale, 'brand')}
            </h1>
            <p className="mt-3 text-base text-zinc-400 sm:text-lg">
              {t(locale, 'subtitle')}
            </p>

            <div className="mt-8">
              <PrivacyNotice locale={locale} />
            </div>

            <div className="mt-8 space-y-3">
              <ScannerButton onClick={startScan} isScanning={isScanning} label={t(locale, 'scanCta')} />
              <p className="text-xs text-zinc-500">{t(locale, 'scanHint')}</p>
            </div>

            <div className="mt-12 grid gap-3 text-left sm:grid-cols-2">
              {[
                { icon: Megaphone, title: t(locale, 'featTracking'), desc: t(locale, 'featTrackingDesc') },
                { icon: Fingerprint, title: t(locale, 'featUniqueness'), desc: t(locale, 'featUniquenessDesc') },
                { icon: Shield, title: t(locale, 'featIntegrity'), desc: t(locale, 'featIntegrityDesc') },
                { icon: Crosshair, title: t(locale, 'featExposure'), desc: t(locale, 'featExposureDesc') },
                { icon: CheckCircle2, title: t(locale, 'featConsistency'), desc: t(locale, 'featConsistencyDesc') },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-4 transition hover:border-zinc-700"
                >
                  <Icon className="mb-2 h-5 w-5 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{desc}</p>
                </div>
              ))}
            </div>

            <div id="how" className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 text-left">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                <Layers className="h-4 w-4 text-cyan-400" />
                {t(locale, 'howItWorks')}
              </h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-400">
                <li>{t(locale, 'how1')}</li>
                <li>{t(locale, 'how2')}</li>
                <li>{t(locale, 'how3')}</li>
              </ol>
            </div>
          </section>
        )}

        {/* Progress */}
        {isScanning && progress && (
          <div className="mx-auto max-w-lg py-16">
            <ScanProgressDisplay progress={progress} />
          </div>
        )}

        {error && (
          <div className="mx-auto mb-8 max-w-lg rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-center text-sm text-rose-200">
            {error || t(locale, 'errorGeneric')}
          </div>
        )}

        {/* Results */}
        {fingerprintData && analysisResult && !isScanning && (
          <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  {t(locale, 'sectionReport')}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {fingerprintData.parsedUA.browser.name} · {fingerprintData.parsedUA.os.name} ·{' '}
                  {Math.round(fingerprintData.scanDuration)}ms
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ExportButton
                  fingerprintData={fingerprintData}
                  analysisResult={analysisResult}
                  label={t(locale, 'exportJson')}
                />
                <ScannerButton
                  onClick={() => {
                    resetScan();
                    void startScan();
                  }}
                  isScanning={false}
                  label={t(locale, 'rescan')}
                  compact
                />
              </div>
            </div>

            {analysisResult.deviceProfile && (
              <div className="flex flex-wrap items-center gap-3">
                <DeviceBadge profile={analysisResult.deviceProfile} />
                <span className="text-xs text-zinc-500">
                  {t(locale, 'device')}: {analysisResult.deviceProfile.type} ·{' '}
                  {riskLabel(locale, analysisResult.privacyRiskLevel)} risk
                </span>
              </div>
            )}

            {/* Scores */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <BigScoreCard
                title={t(locale, 'scoreOverall')}
                score={analysisResult.overallScore}
                description={riskLabel(locale, analysisResult.privacyRiskLevel)}
                type="overall"
              />
              <ScoreCard
                title={t(locale, 'scoreTrackingSurface')}
                score={tracking?.trackingSurfaceScore ?? exposure?.exposureScore ?? 0}
                description={
                  tracking
                    ? `${t(locale, 'protectionLevel')}: ${tracking.protectionLevel}`
                    : riskLabel(locale, analysisResult.trackabilityLevel)
                }
                type="exposure"
              />
              <ScoreCard
                title={t(locale, 'scoreProtection')}
                score={tracking?.protectionScore ?? analysisResult.overallScore}
                description={
                  tracking
                    ? `${tracking.blockedNetworkCount}/${tracking.networkProbes.length} trackers blocked`
                    : ''
                }
                type="consistency"
              />
              <ScoreCard
                title={t(locale, 'scoreUniqueness')}
                score={analysisResult.uniqueness.overallScore}
                description={`${Math.round(analysisResult.uniqueness.bitsOfEntropy)} bits · ${locale === 'ru' ? 'не равно приватности' : '≠ privacy'}`}
                type="uniqueness"
              />
              <ScoreCard
                title={t(locale, 'scoreIntegrity')}
                score={integrity?.score ?? analysisResult.anomaly.overallScore}
                description={
                  integrity
                    ? integrity.canvasStable
                      ? t(locale, 'canvasStable')
                      : t(locale, 'canvasUnstable')
                    : ''
                }
                type="anomaly"
              />
              <ScoreCard
                title={t(locale, 'scoreConsistency')}
                score={analysisResult.consistency.overallScore}
                description={`${analysisResult.consistency.passedRules}/${analysisResult.consistency.totalRules}`}
                type="consistency"
              />
            </div>

            {network && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
                <NetworkDetectiveDisplay report={network} locale={locale} />
              </section>
            )}

            {tracking && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
                <TrackingPostureDisplay tracking={tracking} locale={locale} />
              </section>
            )}

            {exposure && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
                <TargetDetectionDisplay exposure={exposure} locale={locale} />
              </section>
            )}

            {/* Integrity findings */}
            {integrity && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
                <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
                  <ScanSearch className="h-5 w-5 text-cyan-400" />
                  {t(locale, 'sectionIntegrity')}
                </h3>
                <p className="mb-4 text-sm text-zinc-500">{integrity.summary}</p>
                <div className="mb-4 flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full border px-2.5 py-1 ${integrity.canvasStable ? 'border-emerald-500/30 text-emerald-400' : 'border-rose-500/30 text-rose-400'}`}>
                    {integrity.canvasStable ? t(locale, 'canvasStable') : t(locale, 'canvasUnstable')}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 ${integrity.audioStable ? 'border-emerald-500/30 text-emerald-400' : 'border-rose-500/30 text-rose-400'}`}>
                    {integrity.audioStable ? t(locale, 'audioStable') : t(locale, 'audioUnstable')}
                  </span>
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-400">
                    spoof {(integrity.spoofProbability * 100).toFixed(0)}%
                  </span>
                </div>
                {integrity.findings.length === 0 ? (
                  <p className="text-sm text-zinc-500">{t(locale, 'noFindings')}</p>
                ) : (
                  <ul className="space-y-3">
                    {integrity.findings.map((f) => (
                      <li
                        key={f.id}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-zinc-100">{f.title}</span>
                          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                            {f.severity} · {f.confidence}%
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">{f.detail}</p>
                        {f.evidence.length > 0 && (
                          <ul className="mt-2 space-y-0.5">
                            {f.evidence.slice(0, 5).map((e, i) => (
                              <li key={i} className="font-mono text-[11px] text-zinc-600">
                                {e}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* AI report */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
              <AIReportDisplay report={analysisResult.aiReport} />
            </section>

            {analysisResult.deviceProfile && (
              <DeviceInfoCard profile={analysisResult.deviceProfile} />
            )}

            {/* Signals */}
            <section>
              <h3 className="mb-4 text-lg font-semibold text-white">
                {t(locale, 'sectionSignals')}
              </h3>
              <div className="space-y-4">
                {categories.map((cat) => (
                  <CategorySection key={cat.id} category={cat} />
                ))}
              </div>
            </section>

            {analysisResult.consistency.rules.filter((r) => !r.passed).length > 0 && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  {t(locale, 'scoreConsistency')} — failed rules
                </h3>
                <ul className="space-y-2">
                  {analysisResult.consistency.rules
                    .filter((r) => !r.passed)
                    .slice(0, 12)
                    .map((r) => (
                      <li key={r.id} className="text-sm text-zinc-400">
                        <span className="font-medium text-zinc-200">{r.name}</span>
                        <span className="text-zinc-600"> · {r.severity}</span>
                        <p className="text-xs text-zinc-500">{r.message}</p>
                      </li>
                    ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>

      <Footer locale={locale} />
    </div>
  );
}
