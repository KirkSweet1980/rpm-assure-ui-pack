# RPM Assure Edge Agent — Windows installer wizard

Same wizard for **every** SYSPRO customer. Run on the customer SQL host as Administrator.

## What you get

| Piece | Purpose |
|---|---|
| `Start-Agent-Wizard.cmd` | Double-click launcher (self-elevates) |
| `Install-Assure-Agent-Wizard.ps1` | Setup wizard (customer, SQL, options, password) |
| `Install-Assure-Agent.ps1` | Silent / unattended engine |

## Wizard pages

1. Welcome  
2. Customer code, display name, SQL host, SYSPRO instance  
3. Local SQL access (Windows or SQL login) — connection is tested  
4. Central Assure SQL — connection is tested  
5. Collect interval, jobs interval, tray, service  
6. **Agent admin password** + lock files  
7. Install progress  

## Security

- Agent admin password (min 8) is required. Settings later: `Set-AgentSettings.ps1`
- Central / local SQL passwords are stored in `Agent.Secrets.bin` with **Windows DPAPI** (this machine only)
- With **Lock files** on, `C:\RPM-Assure\Agent` is **SYSTEM + Administrators only**
- `Agent.Secrets.bin` is Hidden + System and ACL-locked

## Install from Git (APP or any SQL host)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\Sql\agent\installer\Start-Agent-Wizard.cmd
```

Or after `Update-AppServer.ps1` / customer git pull:

```cmd
C:\RPM-Assure\deploy\ui-pack\Sql\agent\installer\Start-Agent-Wizard.cmd
```

## Silent (same options, no UI)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\Sql\agent\installer\Install-Assure-Agent.ps1 `
  -CustomerCode SIRF `
  -DisplayName "Sir Fruit" `
  -SqlHost SIRZAAPSQL01 `
  -InstanceName SIRZAAPSQL01 `
  -LocalAuth Windows `
  -CentralDataSource "102.222.21.220,14333" `
  -CentralSqlUser rpmassure `
  -CentralSqlPassword "<central>" `
  -AdminPassword "<agent-admin-8plus>" `
  -InstallTray -StartService -RunOnce -LockFiles
```
