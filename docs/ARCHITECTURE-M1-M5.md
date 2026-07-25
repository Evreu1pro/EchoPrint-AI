# EchoPrint architecture (M1–M5 + M7)

Production pipeline: **M1 → M2 → M3 → M5 → M7 → M4 scoring**.  
UI pieces: module report, **M1 map**, history/compare, **M7 Transparency Lab**.

## Module 1 — Network (server, pre/alongside JS)

| Signal | Implementation |
|--------|----------------|
| JA3 / JA4 | Read `cf-ja3-hash`, `x-ja3-hash`, `x-ja4-hash` from reverse proxy. Real TLS hash requires Go/Rust/Caddy sidecar — see `docs/ja3-sidecar.md` |
| Header order | Arrival order of HTTP headers → browser guess + signature |
| IP intel | Geo/IP providers + **local ASN DB** → ASN, org, hosting/proxy/mobile, VPN score, lat/lon, classification reasons |
| WebRTC vs HTTP | Client sends ICE candidates; server compares to public IP |
| Geo ↔ Timezone map | Point A GeoIP, Point B timezone city coords; line if >1000 km |
| IP history | Cross-scan: previous IP/ASN/distance vs current `stable_id` (client history) |

**API:** `POST /api/fp` · `GET /api/fp`

## Module 2 — Hardware (stable_id)

3× canvas (text / emoji / curves) · WebGL unmasked + triangle hash · WebGPU · OfflineAudio · ~80 fonts · full screen metrics · Math.* · SHA-256 stable_id

Same on empty Chrome and Brave on one PC — **by design**.

## Module 3 — Software

UA ↔ fonts OS ↔ WebGL · Client Hints drift · ad-bait DOM · `navigator.brave` · canvas double-hash noise · GTM/GA load probes

Empty Chrome → protection ~0 · Hardened → 70–95

## Module 4 — Scores

- **A Uniqueness** — entropy bits → 0–100  
- **B Spoof** — `geo_tz*40 + software*30 + datacenter*30 + webrtc…`  
- **C Aggressiveness** — protection / tracker cutting  
- **D Vulnerability** — SharedArrayBuffer, USB, Bluetooth, open GPU, open ads  

Headline: *trackability %* narrative (CreepJS-style).

## Module 5 — Advanced

localStorage stable_id persistence · emoji canvas · VM WebGL strings

## Module 7 — AdTech / Data Transparency Lab

| Piece | Role |
|-------|------|
| Sandbox probes | Privacy Sandbox / API surfaces: open · blocked · empty · unsupported |
| Meta signals | `fbq`, `_fbp` / `_fbc`, advanced matching hints, CAPI beacons |
| Google | GTM / GA cookies / gclid-style signals |
| Radar | Timed request events (loaded vs blocked) with vendor notes |
| Outputs | `transparencyScore`, `wouldKnow` briefing, findings |

M7 must never break a scan — pipeline catches collector errors and continues.

## History & compare

- `lib/history/store.ts` — localStorage (last N full reports)
- `lib/history/compare.ts` — pure diffs for scores / ids / protection
- `lib/history/ip-history.ts` — network movement across scans

## Week plan mapping

| Week | Status in repo |
|------|----------------|
| 1 Backend /api/fp + IP intel | ✅ |
| 2 Custom collector (no FPJS core) | ✅ M2 |
| 3 Mismatch module | ✅ M1 map + M4 B |
| 4 CreepJS-style UI | ✅ ModuleReportDisplay |
| 5 AdTech transparency | ✅ M7 lab + radar |
| 6 History / compare / IP trail | ✅ |
