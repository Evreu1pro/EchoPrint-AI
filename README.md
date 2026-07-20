# EchoPrint AI

**Browser fingerprint integrity lab** — educational, fully client-side.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

**Live:** [echo-print-ai.vercel.app](https://echo-print-ai.vercel.app) · **Repo:** [github.com/Evreu1pro/EchoPrint-AI](https://github.com/Evreu1pro/EchoPrint-AI)

---

## What it does

EchoPrint measures how identifiable and how *trustworthy* your browser environment looks:

| Module | Purpose |
|--------|---------|
| **Uniqueness** | Entropy / rarity across canvas, WebGL, fonts, hardware, locale… |
| **Integrity** | Multi-sample canvas & audio noise, navigator prototype tamper, Client Hints vs UA drift, automation markers |
| **Consistency** | 30+ cross-signal rules (UA ↔ platform ↔ GPU ↔ touch ↔ screen) |
| **Exposure** | Which fingerprint vectors are *available* to trackers + **live** third-party hits on the current page |
| **Network detective (server)** | Module 1: what the edge sees — IP, headers, proxy score, Client Hints on the wire, client↔server cross-check (`/api/network`) |

### What changed in v2

- **No more fake “AliExpress detected”** just because Canvas/WebGL exist. Live tracker hits require real scripts, network resources, cookies, or storage keys.
- **Integrity engine** (multi-sample stability + spoof signals) instead of static keyword-only anomalies.
- **International UI** (English default + Russian toggle), dark professional theme, mobile-first layout.
- **Honest docs** and a deployable Next.js app.

Privacy: analysis runs **only in your browser**. Nothing is uploaded.

---

## Quick start

```bash
git clone https://github.com/Evreu1pro/EchoPrint-AI.git
cd EchoPrint-AI
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm start
```

---

## Deploy

### Vercel (recommended)

1. Import `Evreu1pro/EchoPrint-AI` in Vercel  
2. Framework: **Next.js** (auto)  
3. Build: `npm run build` · Output: default  

Or:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Evreu1pro/EchoPrint-AI)

### Static export (GitHub Pages / Netlify)

In `next.config.ts`:

```ts
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // basePath: '/EchoPrint-AI', // if project site on GitHub Pages
};
```

Then `npm run build` → publish the `out/` folder.

---

## Architecture

```
src/
  app/                 # Next.js App Router UI
  components/          # Layout + scanner UI
  hooks/useScanner.ts  # Collect → analyze pipeline
  lib/
    fingerprint/       # Signal collectors (canvas, webgl, audio, …)
    engine/
      integrity.ts     # Spoof / multi-sample / automation
      exposure.ts      # Vector map + live tracker intel
      tracking-posture.ts
    server/network-detective/  # Module 1 — server-side network view
    analysis/          # Uniqueness, consistency, anomaly, report
    i18n/messages.ts   # EN / RU strings
    detection/         # Thin adapter (legacy API → exposure)
  app/api/network/     # POST/GET Network Detective API
```

See [docs/MODULE-1-NETWORK-DETECTIVE.md](docs/MODULE-1-NETWORK-DETECTIVE.md).

### Adding a detector

1. Collector: `src/lib/fingerprint/<signal>.ts`  
2. Wire into `collector.ts`  
3. Integrity rule: `src/lib/engine/integrity.ts`  
4. Consistency rule: `src/lib/analysis/consistency.ts`  
5. Tracker intel (live match only): `TRACKER_INTEL` in `exposure.ts`

---

## Methodology (short)

**Uniqueness** — rarity priors (global-ish frequencies) + estimated signal entropy → score 0–100 (higher = easier to re-identify).

**Integrity** — five canvas samples + three offline-audio samples; non-native `Navigator` getters; CH vs UA; GPU vs OS; WebDriver / `cdc_` markers.

**Exposure** — capability surface (what APIs leak) separate from **live hits** (Performance Resource Timing, script tags, cookie/storage key patterns for Meta, Google, TikTok, Amazon, AliExpress, LinkedIn, Microsoft, X, Yandex, Hotjar, …).

This project is **educational**. It does not claim perfect bot detection or legal tracker blocking.

---

## Stack

- Next.js 16 · React 19 · TypeScript  
- Tailwind CSS 4 · shadcn/ui patterns  
- FingerprintJS (optional visitorId component)  

---

## License

MIT

---

Built for privacy education. Contributions welcome.
