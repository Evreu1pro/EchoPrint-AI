# Module 1 — Network Detective (server-side)

Educational, **stateless** analysis of what a server sees when the browser connects.

## Endpoint

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `GET` | `/api/network` | — | Analyze the current request only |
| `POST` | `/api/network` | `ClientNetworkClaim` JSON | Same + cross-check vs browser-reported UA / language / WebRTC IPs |

Runtime: **Edge** (`export const runtime = 'edge'`).  
Cache: `no-store`. **No database writes.**

## What the server extracts

1. **Client IP** — `cf-connecting-ip` → `x-vercel-forwarded-for` → `x-real-ip` → first `x-forwarded-for` hop  
2. **Geo hints** — Vercel / Cloudflare edge headers when present  
3. **HTTP headers** — UA, Accept-Language, Sec-Fetch-*, DNT, Sec-GPC  
4. **Client Hints on the wire** — `Sec-CH-UA*` etc. (what adtech actually receives)  
5. **Proxy score** — Via / multi-hop XFF / conflicting IP headers / weak hosting ranges  
6. **Cross-check** (POST) — `navigator.userAgent` vs `User-Agent`, languages, WebRTC candidates vs public IP  

## Client claim schema (POST)

```json
{
  "userAgent": "…",
  "language": "en-US",
  "languages": ["en-US", "en"],
  "platform": "Win32",
  "timezone": "Europe/Berlin",
  "webrtcIps": ["192.168.0.5", "203.0.113.10"],
  "clientHints": {
    "mobile": false,
    "platform": "Windows",
    "brands": [{ "brand": "Chromium", "version": "131" }],
    "architecture": "x86",
    "model": "",
    "platformVersion": "15.0.0"
  }
}
```

## Source map

```
src/lib/server/network-detective/
  types.ts       — report contracts
  ip.ts          — IP + geo
  headers.ts     — header snapshot
  proxy-score.ts — proxy/VPN heuristics
  report.ts      — findings + risk
  index.ts       — public exports
src/app/api/network/route.ts
src/lib/client/fetch-network-detective.ts
```

## Privacy

- Report is built in memory and returned once.  
- EchoPrint does **not** store IP or reports.  
- UI shows an explicit privacy note from `privacyNote`.

## Local test

```bash
npm run dev
curl -s http://localhost:3000/api/network | jq .
curl -s -X POST http://localhost:3000/api/network \
  -H "Content-Type: application/json" \
  -d "{\"userAgent\":\"Mozilla/5.0\",\"language\":\"en-US\"}" | jq .summary
```
