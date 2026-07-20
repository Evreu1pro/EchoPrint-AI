# JA3 / JA4 sidecar (optional, for real TLS fingerprints)

Next.js never sees the TLS handshake — the edge terminates TLS first.

## Option A — Cloudflare

Enable Bot Management / JA3 and the worker receives:

- `cf-ja3-hash`
- `cf-ja4` (if available)

EchoPrint already reads these in `extractTlsFromHeaders`.

## Option B — Go TLS terminator (self-host)

```
Internet → Go JA3 proxy :8443 → Next.js :3000
```

Forward headers:

```
X-JA3-Hash: <md5>
X-JA4-Hash: <ja4>
X-Forwarded-For: <client>
```

Minimal pattern: use [wi1dcard/go-ja3](https://github.com/wi1dcard/go-ja3) or nginx stream + OpenResty.

## Option C — Caddy / Traefik plugins

Configure the proxy to inject JA3 into HTTP headers before the request hits `/api/fp`.

Until a sidecar exists, UI shows `tls.source: unavailable` with an explanation — header order + IP intel still work.
