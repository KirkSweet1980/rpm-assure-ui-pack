# RPM Assure Windows Installer (Phases 1–5)

True Windows packaging for RPM Assure:

| Phase | Deliverable | Location |
|-------|-------------|----------|
| **1** | WiX MSI skeleton, folders, registry, shortcuts | `wix/` |
| **2** | SQL + URL config wizard (WinForms) | `wizard/RpmAssure-ConfigWizard.ps1` |
| **3** | Portable Node + WinSW service in payload | `scripts/Prepare-Payload.ps1` |
| **4** | Versioned upgrades (`UpgradeCode` + Build-Release) | `scripts/Build-Release.ps1`, `docs/UPGRADE.md` |
| **5** | Silent install, repair, uninstall | `docs/SILENT.md`, `scripts/Install-Silent.ps1` |

## Quick start (on Windows build host)

```powershell
# 0) App must already build production node-server
cd C:\RPM-Assure\App
# ensure build:node works (see production pack)

# 1) Copy this installer folder to C:\RPM-Assure\installer

# 2) Full release
cd C:\RPM-Assure\installer\scripts
powershell -NoProfile -ExecutionPolicy Bypass -File .\Build-Release.ps1 -AppSource C:\RPM-Assure\App

# 3) Install
msiexec /i ..\dist\RPMAssure-1.0.0.msi
```

Requires **.NET SDK** once (for `dotnet tool install wix`).

## Product identity

- **Name:** RPM Assure  
- **Manufacturer:** RPM Resources  
- **UpgradeCode:** `B7E2C4A1-9F3D-4E8B-A6C1-0D5F2E9B8A74` (never change)  
- **Version:** `VERSION.txt`

## Architecture

```
MSI install
  → Program Files\RPM Resources\RPM Assure\  (binaries)
  → Expand payload.zip (app + node + winsw)
  → Optional silent SQL props → app.env
  → Or launch Config Wizard (UI)
  → WinSW service RPMAssure-App (:8081)
  → Caddy (separate) → HTTPS
```

## Docs

- [INSTALL.md](docs/INSTALL.md)  
- [UPGRADE.md](docs/UPGRADE.md)  
- [SILENT.md](docs/SILENT.md)  
