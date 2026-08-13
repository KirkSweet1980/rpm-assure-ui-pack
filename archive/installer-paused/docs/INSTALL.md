# RPM Assure — Windows Installer

## Prerequisites (build machine)

- Windows 10/11 or Server 2019+
- [.NET SDK 8+](https://dotnet.microsoft.com/download) (for WiX CLI)
- Network access once to download Node portable + WinSW + WiX tool
- Built app: `C:\RPM-Assure\App` with successful `npm run build:node`

## Build the MSI

```powershell
cd C:\RPM-Assure\installer\scripts   # or wherever you extracted installer/
powershell -NoProfile -ExecutionPolicy Bypass -File .\Build-Release.ps1 -AppSource C:\RPM-Assure\App
```

Output:

```
installer\dist\RPMAssure-1.0.0.msi
installer\dist\RELEASE-1.0.0.txt
```

## Install (UI + wizard)

1. Run `RPMAssure-1.0.0.msi` as Administrator  
2. Accept license, choose install folder (default Program Files)  
3. After files install, **Config Wizard** opens:
   - SQL Server host,port  
   - Database / user / password  
   - **Test connection**  
   - Public HTTPS URL  
4. Finish → service starts on **8081**  
5. Point Caddy (or IIS) at `127.0.0.1:8081` for HTTPS  

## Install (silent)

See [SILENT.md](SILENT.md).

## Layout after install

```
C:\Program Files\RPM Resources\RPM Assure\
  app\                 production node-server
  runtime\node\        portable Node
  service\             WinSW + helpers
  wizard\              Config wizard
  payload.zip          (extracted on install)

C:\ProgramData\RPM Resources\RPM Assure\
  config\app.env       SQL + auth secrets
  logs\
  data\
```

## Service

- Name: `RPMAssure-App`  
- Port: `8081`  
- Restart: `services.msc` or `Restart-Service RPMAssure-App`
