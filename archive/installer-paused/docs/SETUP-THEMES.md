# RPM Assure Setup - UI themes

The wizard includes four installer themes (Setup UI only - not the web app):

| Id | Name | Use |
|----|------|-----|
| midnight-teal | Midnight Teal | Default - brand dark + teal accent |
| graphite | Graphite Ops | Neutral NOC charcoal |
| slate-light | Slate Light | Bright rooms / projectors |
| high-contrast | High Contrast | Accessibility - black/white/amber |

Choice is stored in:
%LocalAppData%\RPM Assure\setup-theme.txt

Also written to app.env as SETUP_THEME=... and HKLM SetupTheme.

Rebuild Setup after theme changes:
  powershell -File C:\RPM-Assure\installer\scripts\Build-SetupExe.ps1
