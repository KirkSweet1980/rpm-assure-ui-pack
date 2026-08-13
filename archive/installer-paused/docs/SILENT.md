# Silent install / repair / uninstall (Phase 5)

## Silent install

```powershell
msiexec /i RPMAssure-1.0.0.msi /qn /l*v C:\Temp\rpma-install.log `
  SQLSERVER="102.222.21.220,14333" `
  SQLDATABASE="RPMAssure_App" `
  SQLUSER="Rpm_collect" `
  SQLPASSWORD="***" `
  SQLTRUSTCERT="true" `
  APPURL="https://assure.rpmresources.co.za"
```

Or:

```powershell
.\Install-Silent.ps1 -MsiPath .\dist\RPMAssure-1.0.0.msi `
  -SqlServer "102.222.21.220,14333" `
  -SqlUser "Rpm_collect" `
  -SqlPassword "***" `
  -Quiet
```

## Repair

```powershell
msiexec /fa RPMAssure-1.0.0.msi /qn
# or
msiexec /f {ProductCode} /qn
```

Repair restores missing Program Files bits; does not wipe ProgramData config.

## Uninstall

```powershell
.\Uninstall.ps1 -KeepConfig    # keep SQL settings
.\Uninstall.ps1                # remove config too
```

Or:

```powershell
msiexec /x RPMAssure-1.0.0.msi /qb
```

## Public properties

| Property | Meaning |
|----------|---------|
| SQLSERVER | host or host,port |
| SQLDATABASE | default RPMAssure_App |
| SQLUSER | SQL login |
| SQLPASSWORD | SQL password (hidden) |
| SQLTRUSTCERT | true/false |
| APPURL | public HTTPS origin |
| INSTALLFOLDER | override install path |
