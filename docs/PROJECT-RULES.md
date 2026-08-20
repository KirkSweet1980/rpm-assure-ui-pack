# RPM Assure — project rules

This conversation belongs to a Grok project. Product files also persist under `/workspace/artifacts`. Canonical product repo: [KirkSweet1980/rpm-assure-ui-pack](https://github.com/KirkSweet1980/rpm-assure-ui-pack). Production: `C:\RPM-Assure` behind `https://assure.rpmresources.co.za`.

## Stack & conventions

- **Frontend:** React 19 + TypeScript + Vite + TanStack Router/Start + Tailwind 4. UI chrome in `src/components/` and `src/styles.css`.
- **App data:** SQL Server `RPMAssure_App` via `mssql` (`src/lib/data/sql-pool.ts`). Gold views + `createServerFn` APIs. No second runtime — `App/` is a pack copy of the same UI.
- **Auth:** Better Auth (`src/lib/auth/`). Staff roles + customer scope in SQL `App_User`. Feature flags in `src/lib/auth/features.ts`.
- **Collectors:** PowerShell on the Assure box (`sql/cove`, `sql/rmm/pulseway`, `sql/bitdefender`, `sql/freshdesk`) write SQL. Edge agents (`sql/agent`) heartbeat over HTTPS only — never GitHub.
- Prefer functional components and existing hooks (`useStaffProfile`, `useTheme`, `useDensity`). Do not invent a new nav, RAG, or cover helper — extend `src/lib/data/cover.ts`, `live-status.ts`, `ui-contract.ts`.

## Build & commands

- Install: `npm install`
- Dev (preview contract): `npm run dev` → `0.0.0.0:8080`
- Typecheck: `npm run typecheck`
- Production box: `deploy/Apply-UiPack.ps1` (git pack → App + SQL + agent zip). Agents pull `https://assure.rpmresources.co.za/downloads` on VERSION mismatch.
- Auto-sync: scheduled `RPMAssure-Sync-UiPack` fetches `origin/main` every 10 minutes and applies only when HEAD moved.

## Hard rules

- Never edit `src/routeTree.gen.ts`, `dist/`, or `.output/`.
- Never commit secrets, `Agent.Secrets.bin`, `*.Config.ps1` passwords, or `.env`.
- SQL schema lives in `sql/**/*.sql` (numbered). Auth PGLite migrations stay in `migrations/`.
- Cover is a hard off: no RAG, no SLA, no flashing on No Cover. Only red robots flash.
- Microsoft 365 stays Green until it is on a signed SLA. Ticketed availability SLA stays parked until `HELPDESK_TICKET_SLA_ARMED`.
- Agents collect from Assure HTTPS only. Central git is Assure-box only.
- Agent Status lists every active/onboarded customer; group **hosts under customer name**. New `Agent_Registry` / `Dim_Customer` rows must appear without a UI code change.
- Do not invent SYSPRO cover. Do not remove menu items — show No Cover.
- Prefer small focused commits on `main` of `rpm-assure-ui-pack`.

## Architecture notes

- **Auth:** `src/lib/auth/` (Better Auth + `src/routes/api/auth/$.ts`). Gates in `src/lib/auth/gates.tsx`.
- **API:** TanStack Start server functions under `src/lib/**` and file routes `src/routes/api/**`.
- **UI state:** local React state + server loaders. Theme/palette/density in `localStorage` (`src/lib/theme.tsx`, `theme-tokens.ts`, `density.tsx`).
- **Customer workspace:** `src/routes/customers.$code.*` + `src/components/nav/customer-workspace-nav.tsx`.
- **Configuration:** `/settings/*` (infrastructure, SMTP, users, UI templates). Help: `/help`.
- **Edge agent:** Windows service `RPMAssure-Edge` → `RpmAssure-Agent-Loop.ps1`. Install input is **customer code only**.
