# EchoPrint AI

**M1–M5 fingerprint lab** — separates empty Chrome from hardened browsers.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)

**Live:** [echo-print-ai.vercel.app](https://echo-print-ai.vercel.app) · **Docs:** [ARCHITECTURE-M1-M5](docs/ARCHITECTURE-M1-M5.md)

---

## Modules

| # | Name | What it does |
|---|------|----------------|
| **M1** | Network (`/api/fp`) | IP ASN/type/VPN, JA3/JA4 hooks, header order, WebRTC vs HTTP, **geo↔timezone map** (>1000 km = mismatch) |
| **M2** | Hardware | **stable_id**: 3× canvas, WebGL, WebGPU, Audio, fonts, screen, Math — same on all browsers of one PC |
| **M3** | Software | Spoof (UA/CH/GPU/fonts), adblock DOM, Brave, canvas noise, tracker script probes → **protection 0 vs 95** |
| **M4** | Four scores | **A** uniqueness · **B** spoof · **C** aggressiveness · **D** vulnerability + trackability % |
| **M5** | Advanced | localStorage temporal ID, emoji FP, VM WebGL strings |

**History & compare** — last 10 full reports stay in `localStorage` only. Select two scans (e.g. stock Chrome vs Brave) and diff scores / `stable_id` / protection.

Privacy: M2–M5 run client-side; M1 is an **ephemeral** server request (no DB). History never leaves the browser. JA3 needs edge headers or [sidecar](docs/ja3-sidecar.md).

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
npm test          # unit tests (scoring, compare, IP extract)
npm run typecheck
npm run lint
```

---

## Deploy

### Vercel (recommended)

1. Import `Evreu1pro/EchoPrint-AI` in Vercel  
2. Framework: **Next.js** (auto)  
3. Build: `npm run build` · Output: default  

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
Note: `/api/fp` will not work on pure static hosting (M1 falls back to empty network module).

---

## Architecture

```
src/
  app/                      # Next.js App Router UI + /api/fp
  components/scanner/       # Report, history, compare
  hooks/useModuleScan.ts    # Pipeline + local history
  lib/
    modules/                # M1–M5 pipeline
      m1-network/           # IP extract, intel, geo↔tz
      m2-hardware/
      m3-software/
      m4-scoring/
      m5-advanced/
    history/                # localStorage + compare (pure)
    i18n/messages.ts        # EN / RU
```

See [docs/MODULE-1-NETWORK-DETECTIVE.md](docs/MODULE-1-NETWORK-DETECTIVE.md) and [docs/ARCHITECTURE-M1-M5.md](docs/ARCHITECTURE-M1-M5.md).

### Adding a detector

1. Collect in the matching `src/lib/modules/mN-*/` module  
2. Extend `types.ts` if the report shape changes  
3. Wire scoring in `m4-scoring/scores.ts` when the signal should move A/B/C/D  

---

## Methodology (short)

**Uniqueness** — estimated signal entropy → score 0–100 (higher = easier to re-identify).

**Spoof / undercover** — geo↔tz mismatch, datacenter/TOR, WebRTC≠HTTP, software spoof findings.

**Protection / aggressiveness** — Brave, canvas noise, adblock DOM, tracker script probes.

**Vulnerability** — open ad surface + powerful browser APIs (USB, Bluetooth, GPU, …).

This project is **educational**. It does not claim perfect bot detection or legal tracker blocking.

---

## Stack

- Next.js 16 · React 19 · TypeScript  
- Tailwind CSS 4 · shadcn-style Button  
- Vitest (unit) · GitHub Actions CI  

---

## License

MIT

---

Built for privacy education. Contributions welcome.
