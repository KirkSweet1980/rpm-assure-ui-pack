@echo off
setlocal
echo === Rebuild Setup.exe layout fix (SkipPayload) ===
set WIZ=C:\RPM-Assure\installer\setup-wizard
set OUT=C:\RPM-Assure\installer\dist\setup
set REL=C:\RPM-Assure\installer\dist\RPMAssure-Setup-1.0.1

if not exist "%WIZ%\WizardForm.cs" (
  echo Missing WizardForm.cs - extract installer pack first
  pause
  exit /b 1
)

cd /d "%WIZ%"
dotnet publish -c Release -r win-x64 --self-contained true ^
  -p:PublishSingleFile=true ^
  -p:IncludeNativeLibrariesForSelfExtract=true ^
  -p:EnableCompressionInSingleFile=true ^
  -o "%OUT%"
if errorlevel 1 (
  echo publish failed
  pause
  exit /b 1
)

mkdir "%REL%" 2>nul
copy /Y "%OUT%\RPMAssure-Setup.exe" "%REL%\RPMAssure-Setup.exe" >nul
if not exist "%REL%\payload.zip" (
  if exist "C:\RPM-Assure\installer\payload\payload.zip" copy /Y "C:\RPM-Assure\installer\payload\payload.zip" "%REL%\payload.zip" >nul
)
echo.
echo UPDATED: %REL%\RPMAssure-Setup.exe
echo Run as Administrator. payload.zip must be beside the exe.
dir "%REL%"
pause
