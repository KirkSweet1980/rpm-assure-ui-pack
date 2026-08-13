# HTTPS-only for assure.rpmresources.co.za (Let's Encrypt)

## Prerequisites
1. DNS **A record**: `assure.rpmresources.co.za` → public IP of this server
2. Port **443** open inbound only (**port 80 is not used**)
3. App running locally (e.g. Vite on **8081**)

## Caddy (auto HTTPS on 443)

- Site block uses `https://hostname` so Caddy does **not** bind HTTP on :80
- Global: `auto_https disable_redirects disable_http_challenge` (TLS-ALPN-01 only)

```bat
caddy run --config C:\RPM-Assure\deploy\Caddyfile
```

## Own certificate

Settings → Platform → SSL / HTTPS → Own certificate, or place PEM files and set `tls` in Caddyfile.

## App env

```
BETTER_AUTH_URL=https://assure.rpmresources.co.za
VITE_APP_URL=https://assure.rpmresources.co.za
```
