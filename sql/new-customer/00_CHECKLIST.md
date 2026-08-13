# New customer onboarding checklist

Two stages. SQL first (on their SYSPRO box). Then cover checks (on the APP / central box).

## Stage 1 — SYSPRO SQL (on customer SQL server)

| Field | Example | Your value |
|-------|---------|------------|
| CustomerCode | SIRF | |
| DisplayName | Sir Fruit | |
| InstanceName | SIRZAAPSQL01 | |
| Current admin auth | Windows SIR\KirkS or sa | |
| Collect login created | rpmassure (read-only) | |

1. [ ] `Install-NewCustomer-OneShot.ps1` — login + grants + Dim_Customer + linked server
2. [ ] `Run-First-Collect.ps1` — first SYSPRO pull + 15-min schedule (elevated)

## Stage 2 — RMM / Cove / EPP / M365 (on APP server)

`Complete-Customer-Cover.ps1` talks to central Assure SQL and:

- Searches Pulseway orgs, Cove partners, Bitdefender companies, M365 tenants
- Lets you map matches (or type the name)
- Sets `PillarPulseway` / `PillarCove` / `PillarBitdefender` / `PillarMicrosoftCsp`
  - **1** = on cover
  - **0** = explicit no cover (Exco will not wait / go amber)

3. [ ] `Complete-Customer-Cover.ps1 -CustomerCode SIRF`
4. [ ] Hard-refresh Exco — customer row shows the right pillars
5. [ ] If RMM/Cove/EPP said GAP: run that product's collect, then re-run cover check

## You provide (stage 2)

| Product | How we know they are on it |
|---------|----------------------------|
| Pulseway RMM | Organization name in Pulseway (or "not on RMM") |
| Cove backup | Partner / company name in Cove (or "not on Cove") |
| Bitdefender | Company name in GravityZone (or "not on BD") |
| Microsoft 365 | Tenant id or primary domain (or "not on CSP") |
