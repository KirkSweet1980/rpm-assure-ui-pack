@echo off
REM Update Assure agent from HTTPS using signed Windows tools only.
REM Run from an elevated Command Prompt. Do not use hidden PowerShell.
setlocal
set ZIP=%TEMP%\rpm-assure-agent.zip
set PACK=C:\RPM-Assure\deploy\ui-pack
set FROM=%PACK%\Sql\agent
curl.exe -fsSL --max-time 180 -o "%ZIP%" https://assure.rpmresources.co.za/downloads/rpm-assure-agent.zip
if errorlevel 1 exit /b 1
for %%A in ("%ZIP%") do echo zip=%%~zA
if exist "%PACK%" rmdir /s /q "%PACK%"
mkdir "%PACK%"
tar.exe -xf "%ZIP%" -C "%PACK%"
if not exist "%FROM%\RpmAssure-Agent.ps1" set FROM=%PACK%\sql\agent
if not exist "%FROM%\RpmAssure-Agent.ps1" (
  echo Pack missing agent scripts
  exit /b 1
)
robocopy "%FROM%" C:\RPM-Assure\Agent /E /XF Agent.Secrets.bin Agent.Config.ps1 Agent.Settings.json status.json request-sync.flag /XD logs /NFL /NDL /NJH /NJS /nc /ns /np
findstr AgentVersion C:\RPM-Assure\Agent\RpmAssure-Agent.ps1
net stop RPMAssure-Edge
net start RPMAssure-Edge
echo Done. Expect AgentVersion 2.8.4
endlocal
