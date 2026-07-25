# EchoPrint AI

### Browser fingerprint & exposure lab — educational, honest, local-first

<p align="center">
  <a href="https://echo-print-ai.vercel.app"><img src="https://img.shields.io/badge/Live-echo--print--ai.vercel.app-a855f7?style=for-the-badge&labelColor=0b0f19" alt="Live demo" /></a>
  &nbsp;
  <img src="https://img.shields.io/badge/Stack-Next.js_16_%7C_React_19_%7C_TS-121826?style=for-the-badge&labelColor=0b0f19" alt="Stack" />
  &nbsp;
  <img src="https://img.shields.io/badge/Privacy-localStorage_only-2D7D55?style=for-the-badge&labelColor=0b0f19" alt="Privacy" />
  &nbsp;
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge&labelColor=0b0f19" alt="MIT" />
</p>

<p align="center">
  <strong>Separates empty Chrome from hardened browsers.</strong><br/>
  Network intel · hardware <code>stable_id</code> · spoof / protection scores · AdTech transparency · scan history &amp; compare.
</p>

<p align="center">
  <a href="https://echo-print-ai.vercel.app"><strong>→ Open live lab</strong></a>
  ·
  <a href="#modules">Modules</a>
  ·
  <a href="#architecture">Architecture</a>
  ·
  <a href="#quick-start">Quick start</a>
</p>

---

## Why this project

Most “fingerprint” demos either scare you or sell you an API. EchoPrint is a **lab**:

| | |
|---|---|
| **Honest scores** | Four axes (uniqueness · spoof · aggressiveness · vulnerability) + trackability narrative |
| **Stable device identity** | `stable_id` designed to stay the same across browsers on one PC |
| **Network detective** | IP / ASN / VPN-ish signals, WebRTC vs HTTP, geo↔timezone map, cross-scan IP history |
| **AdTech mirror (M7)** | Privacy Sandbox probes, Meta / Google signals, live tracker radar |
| **Local-first history** | Last scans in `localStorage` only — compare Chrome vs Brave yourself |

**Educational.** Not a bot-detection product, not legal advice, not a claim of perfect anonymity.

---

## Live

| | |
|---|---|
| **Production** | [echo-print-ai.vercel.app](https://echo-print-ai.vercel.app) |
| **Repository** | [github.com/Evreu1pro/EchoPrint-AI](https://github.com/Evreu1pro/EchoPrint-AI) |
| **Author** | [Evreu1pro](https://github.com/Evreu1pro) · Leipzig, Germany |

---

## Modules

| # | Name | What it does |
|---|------|----------------|
| **M1** | Network (`/api/fp`) | IP intel (ASN, hosting/proxy/mobile, VPN score), JA3/JA4 hooks, header order, WebRTC vs HTTP, **geo↔timezone map**, **cross-scan IP history** |
| **M2** | Hardware | **`stable_id`**: 3× canvas, WebGL, WebGPU, Audio, fonts, screen, Math — same machine → same id |
| **M3** | Software | Spoof (UA / CH / GPU / fonts), adblock DOM, Brave, canvas noise, tracker script probes → protection ~0 vs ~95 |
| **M4** | Four scores | **A** uniqueness · **B** spoof · **C** aggressiveness · **D** vulnerability + trackability % |
| **M5** | Advanced | localStorage temporal ID, emoji FP, VM WebGL strings |
| **M7** | AdTech lab | Privacy Sandbox probes, Meta pixel / CAPI hints, Google/GTM signals, **request radar**, “what would they know” briefing |

> M6 is reserved / experimental in some branches. Production pipeline ships **M1–M5 + M7**.

### History & compare

- Up to the last **10** full reports stay in **browser `localStorage` only**
- Pick two scans (e.g. stock Chrome vs Brave) and diff scores / `stable_id` / protection
- IP history surfaces when the network moves while hardware stays put

### Privacy model

| Layer | Where it runs | Stored |
|-------|----------------|--------|
| M2–M5, M7 | Client | Optional local history only |
| M1 | Ephemeral `POST /api/fp` | **No app DB** — request-scoped |
| JA3/JA4 | Edge headers or [sidecar](docs/ja3-sidecar.md) | Depends on your edge |

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
npm test          # scoring, compare, IP extract
npm run typecheck
npm run lint
```

---

## Deploy

### Vercel (recommended)

1. Import `Evreu1pro/EchoPrint-AI`  
2. Framework: **Next.js** (auto)  
3. Build: `npm run build`  

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Evreu1pro/EchoPrint-AI)

### Static export (GitHub Pages / Netlify)

```ts
// next.config.ts
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
};
```

`npm run build` → publish `out/`.  
**Note:** `/api/fp` will not work on pure static hosting (M1 falls back to empty network module).

---

## Architecture

```
src/
  app/                         # App Router UI + /api/fp
  components/scanner/          # Report, map, history, compare, M7 lab
  hooks/useModuleScan.ts       # Pipeline + local history
  lib/
    modules/
      m1-network/              # IP extract, ASN DB, intel, geo↔tz
      m2-hardware/             # stable_id collectors
      m3-software/             # spoof + protection
      m4-scoring/              # A/B/C/D + narrative
      m5-advanced/             # temporal / emoji / VM
      m7-adtech/               # sandbox · meta · radar
      pipeline.ts              # full run
      types.ts                 # contracts
    history/                   # localStorage + compare + IP history
    i18n/messages.ts           # EN / RU
```

Docs:

- [ARCHITECTURE-M1-M5](docs/ARCHITECTURE-M1-M5.md) (core modules + week plan)
- [MODULE-1-NETWORK-DETECTIVE](docs/MODULE-1-NETWORK-DETECTIVE.md)
- [JA3 sidecar](docs/ja3-sidecar.md)

### Adding a detector

1. Collect in the matching `src/lib/modules/mN-*/` module  
2. Extend `types.ts` if the report shape changes  
3. Wire scoring in `m4-scoring/scores.ts` when the signal should move A/B/C/D  
4. Keep M7 optional — never let AdTech probes break a full scan  

---

## Methodology (short)

| Score | Meaning |
|-------|---------|
| **Uniqueness (A)** | Estimated signal entropy → 0–100 (higher ≈ easier to re-identify) |
| **Spoof (B)** | geo↔tz mismatch, datacenter/TOR, WebRTC≠HTTP, software spoof findings |
| **Aggressiveness (C)** | Brave, canvas noise, adblock DOM, tracker script probes |
| **Vulnerability (D)** | Open ad surface + powerful browser APIs (USB, Bluetooth, GPU, …) |
| **Transparency (M7)** | Higher = less leaks to ad-tech surfaces under test |

---

## Stack

| Layer | Choice |
|-------|--------|
| App | Next.js 16 · React 19 · TypeScript |
| UI | Tailwind CSS 4 · shadcn-style primitives |
| Tests | Vitest |
| Deploy | Vercel |

---

## Author

**Evreu1pro** — AI web developer · Python / TypeScript / HTML / CSS / JS · Vercel · Open Source  
Leipzig, Germany · [github.com/Evreu1pro](https://github.com/Evreu1pro) · [evreu1pro.github.io](https://evreu1pro.github.io)

---

## License

MIT — use it, fork it, break it, learn from it.

---

<p align="center">
  <sub>Built for privacy education · contributions welcome · not a surveillance product</sub>
</p>
