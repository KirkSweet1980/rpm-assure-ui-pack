# RPM Assure Edge Agent

Windows service `RPMAssure-Edge` on each customer SQL host.

## Security

- Secrets in `Agent.Secrets.bin` — Windows **DPAPI LocalMachine** (this box only)
- Agent admin password (PBKDF2) required to change settings
- Folder ACL: **SYSTEM + Administrators** only
- SQL password is **not** passed on the sqlcmd command line (`SQLCMDPASSWORD` + encrypt `-N`)
- `Agent.Config.ps1` has **no** passwords

Change settings:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Agent\Set-AgentSettings.ps1
```

## Deploy (every customer SQL host)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\agent\Deploy-Customer-Sql-Agent.ps1
```

You will be asked for an **agent admin password** on first install.

## Proof

```powershell
Get-Service RPMAssure-Edge
# Assure: Configuration > Edge Agents
```
