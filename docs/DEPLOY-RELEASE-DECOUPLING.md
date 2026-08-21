# Application release ≠ Agent release

**FROZEN.** Application deployment must never implicitly release an Agent.

Current fleet pointer: **2.9.11** until an operator runs `Publish-AgentRelease.ps1`.

```
Application release:
    Git/source
      -> Sync-UiPack-From-Git.ps1
      -> Apply-UiPack.ps1          (no -PublishAgent)
      -> App + SQL/server
      -> health checks
      -> Agent VERSION unchanged

Agent pilot:
    reviewed candidate
      -> Stage-AgentPilot.ps1 -PilotHost <one> -CandidateVersion 2.10.1
      -> one approved host only
      -> evidence/review
      -> global downloads/VERSION untouched

Agent production release:
    approved candidate
      -> Publish-AgentRelease.ps1 -CandidateVersion <ver>
      -> backup current Agent release
      -> validate
      -> publish
      -> VERSION promotion
      -> public /downloads/VERSION verification
```

`Apply-UiPack -PublishAgent` is exceptional/manual only and delegates to `Publish-AgentRelease.ps1`. Sync-UiPack must never pass it.

Legacy (deprecated, not invoked by app apply/sync):

- `Publish-Agent-Pack.ps1` — pack builder only, requires `-PromoteVersion` from Publish-AgentRelease
- `Publish-Agent-Pack-IfStale.ps1` — no-op
- `Install-Publish-Agent-Pack-Task.ps1` — refuses to enable `RPMAssure-Publish-AgentPack` unless `-IUnderstandThisIsDeprecated`

Scheduled tasks `RPMAssure-Publish-AgentPack` and `RPMAssure-Sync-UiPack` are **not** installed or enabled by Apply-UiPack.

## Trusted controller layer

`$Root\deploy` (typically `C:\RPM-Assure\deploy`) is the installed release-control layer.

`$Pack` (typically `C:\RPM-Assure\deploy\ui-pack`) is application/source **input only**.

Normal `Apply-UiPack` must **not** copy or replace:

- Apply-UiPack.ps1
- Sync-UiPack-From-Git.ps1
- Publish-AgentRelease.ps1
- Stage-AgentPilot.ps1
- Publish-Agent-Pack.ps1
- Publish-Agent-Pack-IfStale.ps1
- Install-Publish-Agent-Pack-Task.ps1
- Sanitise-Downloads-DeployScript.ps1

`Sync-UiPack-From-Git` invokes **only** `$Root\deploy\Apply-UiPack.ps1` and fails closed if that file is missing. A malicious or stale `$Pack\deploy\Apply-UiPack.ps1` is ignored.
