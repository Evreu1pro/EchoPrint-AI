'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PrivacyNotice } from '@/components/layout/PrivacyNotice';
import { ScannerButton } from '@/components/scanner/ScannerButton';
import { ModuleReportDisplay } from '@/components/scanner/ModuleReportDisplay';
import { useModuleScan } from '@/hooks/useModuleScan';
import type { Locale } from '@/lib/i18n/messages';
import { t } from '@/lib/i18n/messages';
import {
  Fingerprint,
  Shield,
  Cpu,
  Network,
  Crosshair,
  Layers,
  Loader2,
} from 'lucide-react';

export default function Home() {
  const [locale, setLocale] = useState<Locale>('en');
  const { isScanning, progress, report, error, startScan, reset } = useModuleScan();

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

  return (
    <div className="flex min-h-screen flex-col bg-[#070a0e] text-zinc-100">
      <Header locale={locale} onLocaleChange={changeLocale} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {!report && !isScanning && (
          <section className="mx-auto mb-14 max-w-3xl text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-cyan-500/20 to-transparent shadow-[0_0_40px_-10px_rgba(34,211,238,0.45)]">
              <Fingerprint className="h-8 w-8 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              EchoPrint AI
            </h1>
            <p className="mt-3 text-base text-zinc-400 sm:text-lg">
              {locale === 'ru'
                ? 'M1 сеть · M2 железо · M3 софт/защита · M4 четыре скора · M5 temporal. Различает пустой Chrome и hardened браузер.'
                : 'M1 network · M2 hardware · M3 software/protection · M4 four scores · M5 temporal. Separates empty Chrome from hardened browsers.'}
            </p>

            <div className="mt-8">
              <PrivacyNotice locale={locale} />
            </div>

            <div className="mt-8 space-y-3">
              <ScannerButton
                onClick={startScan}
                isScanning={isScanning}
                label={locale === 'ru' ? 'Полный скан M1–M5' : 'Full scan M1–M5'}
              />
              <p className="text-xs text-zinc-500">
                {locale === 'ru'
                  ? '~15 с · /api/fp IP-intel · 3 canvas · WebGL/WebGPU · protection probes'
                  : '~15s · /api/fp IP-intel · 3 canvas · WebGL/WebGPU · protection probes'}
              </p>
            </div>

            <div className="mt-12 grid gap-3 text-left sm:grid-cols-2">
              {[
                {
                  icon: Network,
                  title: 'M1 Network',
                  desc:
                    locale === 'ru'
                      ? 'IP ASN/тип, JA3 hooks, порядок заголовков, WebRTC vs HTTP, карта geo↔timezone'
                      : 'IP ASN/type, JA3 hooks, header order, WebRTC vs HTTP, geo↔timezone map',
                },
                {
                  icon: Cpu,
                  title: 'M2 Hardware',
                  desc:
                    locale === 'ru'
                      ? 'stable_id: 3 canvas, WebGL, WebGPU, Audio, fonts, screen, Math'
                      : 'stable_id: 3 canvas, WebGL, WebGPU, Audio, fonts, screen, Math',
                },
                {
                  icon: Shield,
                  title: 'M3 Software',
                  desc:
                    locale === 'ru'
                      ? 'Spoof UA/CH/GPU, adblock, Brave, canvas noise, tracker block'
                      : 'Spoof UA/CH/GPU, adblock, Brave, canvas noise, tracker block',
                },
                {
                  icon: Crosshair,
                  title: 'M4 Scores',
                  desc:
                    locale === 'ru'
                      ? 'A уникальность · B подставной · C агрессивность · D уязвимость'
                      : 'A uniqueness · B spoof · C aggressiveness · D vulnerability',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-4"
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
                {locale === 'ru' ? 'Почему Chrome и «макс. защита» больше не одинаковые' : 'Why Chrome ≠ max protection'}
              </h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-400">
                <li>
                  {locale === 'ru'
                    ? 'M2 stable_id одинаковый на одном ПК — это железо, не баг'
                    : 'M2 stable_id is shared on one PC — hardware, not a bug'}
                </li>
                <li>
                  {locale === 'ru'
                    ? 'M3 protection: 0 у пустого Chrome, 70–95 у Brave/uBlock/RFP'
                    : 'M3 protection: 0 on empty Chrome, 70–95 on Brave/uBlock/RFP'}
                </li>
                <li>
                  {locale === 'ru'
                    ? 'M1+B score: geo↔tz >1000km и datacenter IP поднимают «подставной»'
                    : 'M1+B score: geo↔tz >1000km and datacenter IP raise undercover score'}
                </li>
              </ol>
            </div>
          </section>
        )}

        {isScanning && progress && (
          <div className="mx-auto max-w-md space-y-6 py-20 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-400" />
            <p className="text-lg font-medium text-zinc-100">{progress.stage}</p>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <p className="text-xs tabular-nums text-zinc-500">{progress.pct}%</p>
          </div>
        )}

        {error && (
          <div className="mx-auto mb-6 max-w-lg rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-center text-sm text-rose-200">
            {error}
          </div>
        )}

        {report && !isScanning && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  {locale === 'ru' ? 'Отчёт M1–M5' : 'Report M1–M5'}
                </h2>
                <p className="text-sm text-zinc-500">{report.generatedAt}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(report, null, 2)], {
                      type: 'application/json',
                    });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `echoprint-m1m5-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                  }}
                >
                  Export JSON
                </button>
                <ScannerButton
                  onClick={() => {
                    reset();
                    void startScan();
                  }}
                  isScanning={false}
                  label={t(locale, 'rescan')}
                  compact
                />
              </div>
            </div>
            <ModuleReportDisplay report={report} locale={locale} />
          </div>
        )}
      </main>

      <Footer locale={locale} />
    </div>
  );
}
