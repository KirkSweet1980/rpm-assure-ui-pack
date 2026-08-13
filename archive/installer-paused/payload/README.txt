RPM Assure installer payload
============================

This folder is filled by scripts\Prepare-Payload.ps1 before MSI build:

  payload\
    app\                 <- production build (.output + package files)
    runtime\node\        <- portable Node.js LTS
    service\
      RPMAssure-App.exe  <- WinSW renamed wrapper
    tools\caddy\         <- optional Caddy binary

Do not hand-edit harvested Payload.wxs; regenerate via Prepare-Payload.ps1.
