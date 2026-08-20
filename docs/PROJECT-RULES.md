This conversation belongs to a Grok project. The project's files are mounted at `/workspace/artifacts` — look there for user-provided sources before concluding the workspace has no project files. Files written there persist to the project across conversations.

# RPM Assure — project rules

Canonical product repo: [KirkSweet1980/rpm-assure-ui-pack](https://github.com/KirkSweet1980/rpm-assure-ui-pack). Production: `C:\RPM-Assure` behind `https://assure.rpmresources.co.za`.

## Stack & conventions

- **Frontend:** React 19 + TypeScript + Vite + TanStack Router/Start + Tailwind 4. UI in `src/components/` and `src/styles.css`.
- **App data:** SQL Server `RPMAssure_App` via `mssql` (`src/lib/data/sql-pool.ts`). Gold views + `createServerFn`. `App/` is a pack copy of the same UI.
- **Auth:** Better Auth (`src/lib/auth/`). Staff roles + customer scope in SQL `App_User`. Flags in `src/lib/auth/features.ts`.
- **Collectors:** PowerShell on the Assure box (`sql/cove`, `sql/rmm/pulseway`, `sql/bitdefender`, `sql/freshdesk`, `sql/csp`) write SQL. Edge agents (`sql/agent`) heartbeat over HTTPS only — never GitHub.
- Prefer functional components and existing hooks. Do not invent a new nav, RAG, or cover helper — extend `src/lib/data/cover.ts`, `live-status.ts`, `ui-contract.ts`.

## Frontend commands

```
npm install
npm run dev              # preview: 0.0.0.0:8080
npm run typecheck
npm run lint
npm run build            # Vite / Nitro
npm run build:node       # production node-server
npm run start:prod       # node .output/server/index.mjs (PORT 8081 on the box)
npm run db:migrate       # PGLite Better Auth migrations (migrations/)
```

## Backend commands (Assure box)

Paths relative to `C:\RPM-Assure`. Use `powershell -NoProfile -ExecutionPolicy Bypass -File …`.

### App / pack

```
deploy\Apply-UiPack.ps1
deploy\Sync-UiPack-From-Git.ps1
deploy\Publish-Agent-Pack.ps1
deploy\Restart-App.ps1
Restart-Service RPMAssure-App
```

Git apply (central only):

```
$Pack = 'C:\RPM-Assure\deploy\ui-pack'
$git  = 'C:\Program Files\Git\cmd\git.exe'
& $git -C $Pack fetch origin main
& $git -C $Pack reset --hard origin/main
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Pack 'deploy\Apply-UiPack.ps1')
```

### API collectors (SQL ingest)

```
sql\ops\Sync-All-Apis-Now.ps1
sql\ops\Run-All-Api-Collects-Scheduled.ps1
sql\rmm\pulseway\Collect-Pulseway-To-RPMAssure.ps1
sql\cove\Collect-Cove-To-RPMAssure.ps1
sql\bitdefender\Collect-Bitdefender-To-RPMAssure.ps1
sql\freshdesk\Collect-Freshdesk-To-RPMAssure.ps1
sql\csp\Collect-Csp-Graph-To-RPMAssure.ps1
sql\csp\Run-Csp-Collect-All.ps1
```

Scheduled: `RPMAssure-All-Api-Collect` (15 min), `RPMAssure-Freshdesk-Collect` (1 min).

### Edge agent (customer hosts — HTTPS only)

```
sql\agent\Deploy-Assure-Agent.ps1 -CustomerCode AHIC
Restart-Service RPMAssure-Edge -Force
sql\agent\Update-From-Https.ps1
sql\agent\Uninstall-Assure-Agent.ps1
```

Host jobs (run by the agent, not by git): `Collect-Host-Iops.ps1`, `Collect-Host-Patches.ps1`, `Collect-Host-Firewall.ps1`, `Collect-Windows-EventLog.ps1`, SYSPRO via `sql\base\syspro-direct\Run-Syspro-Collect-Direct.ps1`.

### SQL / secrets (ops)

```
sqlcmd -S 127.0.0.1,14333 -d RPMAssure_App -E
deploy\Fix-App-Sql-Password.ps1
deploy\Rotate-SqlCollectPassword.ps1          # dry-run; -Apply to change
deploy\Backup-Assure-Box.ps1
deploy\Restrict-Sql14333.ps1                  # dry-run; -Apply to firewall
deploy\Harden-Production.ps1
deploy\Verify-Hardening.ps1
```

### HTTPS / Caddy

```
deploy\Ensure-Caddy-Downloads.ps1
deploy\Ensure-Https-443.ps1
deploy\Renew-Assure-Https.ps1
```

## Hard rules

- Never edit `src/routeTree.gen.ts`, `dist/`, or `.output/`.
- Never commit secrets, `Agent.Secrets.bin`, `*.Config.ps1` passwords, or `.env`.
- SQL schema in `sql/**/*.sql` (numbered). Auth PGLite migrations in `migrations/`.
- Cover is a hard off: no RAG, no SLA, no flashing on No Cover. Only red robots flash.
- Microsoft 365 stays Green until it is on a signed SLA. Ticketed availability parked until `HELPDESK_TICKET_SLA_ARMED`.
- Agents collect from Assure HTTPS only. Central git is Assure-box only.
- Agent Status lists every active/onboarded customer; group hosts under the customer name.
- Do not invent SYSPRO cover. Do not remove menu items — show No Cover.

## Architecture notes

- **Auth:** `src/lib/auth/` · `src/routes/api/auth/$.ts` · `src/lib/auth/gates.tsx`
- **API:** `createServerFn` under `src/lib/**` and `src/routes/api/**`
- **UI state:** loaders + local React. Theme/palette/density in `localStorage`
- **Customer workspace:** `src/routes/customers.$code.*`
- **Configuration / help:** `/settings/*` · `/help`
- **Edge:** Windows service `RPMAssure-Edge` wrapping `RpmAssure-Agent-Loop.ps1`. Install input is customer code only.
