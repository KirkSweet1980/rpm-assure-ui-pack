# Upgrades (Phase 4)

## Rules

| Field | Rule |
|-------|------|
| **UpgradeCode** | Fixed forever: `B7E2C4A1-9F3D-4E8B-A6C1-0D5F2E9B8A74` |
| **Version** | Bump `installer/VERSION.txt` each release (Major.Minor.Patch) |
| **Config** | Kept in `%ProgramData%\...\config\app.env` — **not** overwritten on upgrade |
| **App binaries** | Replaced under Program Files |

## Release a new version

```powershell
# bump patch 1.0.0 -> 1.0.1 and build
.\Build-Release.ps1 -BumpPatch -AppSource C:\RPM-Assure\App

# or explicit
.\Build-Release.ps1 -Version 1.1.0 -AppSource C:\RPM-Assure\App
```

## Apply upgrade

**UI:** double-click new MSI → Next through wizard (MajorUpgrade removes old product files first).

**Silent:**

```powershell
msiexec /i RPMAssure-1.1.0.msi /qn /l*v upgrade.log
```

Do **not** pass SQLPASSWORD on upgrade unless you intend to rotate it. Existing `app.env` remains.

## Rollback

Keep previous MSI. Uninstall current, reinstall previous, restore `app.env` from backup if needed.

```powershell
.\Uninstall.ps1 -KeepConfig
msiexec /i RPMAssure-1.0.0.msi /qn
```
