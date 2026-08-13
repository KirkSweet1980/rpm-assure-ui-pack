@echo off
setlocal EnableExtensions
echo === RPM Assure EXTRACT-AND-BUILD ===
echo Run as Administrator
echo.

set "ZIP="
for /f "delims=" %%Z in ('dir /b /o-d "%USERPROFILE%\Downloads\RPMAssure-Windows-Installer*.zip" 2^>nul') do (
  set "ZIP=%USERPROFILE%\Downloads\%%Z"
  goto :havezip
)
:havezip
if not defined ZIP (
  echo ERROR: Place RPMAssure-Windows-Installer-Phase1-5.zip in Downloads
  pause
  exit /b 1
)
echo ZIP=%ZIP%

set "TMP=%TEMP%\rpma_ex_%RANDOM%%RANDOM%"
mkdir "%TMP%" >nul 2>&1

REM Extract with tar if available (handles locked less often), else .NET
where tar >nul 2>&1
if %ERRORLEVEL%==0 (
  echo Extracting with tar...
  tar -xf "%ZIP%" -C "%TMP%"
) else (
  echo Extracting with .NET ZipFile...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -A System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory('%ZIP%','%TMP%')"
)
if errorlevel 1 (
  echo Extract FAILED
  pause
  exit /b 1
)

REM Find setup-wizard
set "SRC="
for /f "delims=" %%P in ('dir /s /b "%TMP%\RpmAssure.Setup.csproj" 2^>nul') do (
  for %%D in ("%%~dpP..") do set "SRC=%%~fD"
  goto :havesrc
)
:havesrc
if not defined SRC (
  echo ERROR: RpmAssure.Setup.csproj not found in zip extract
  dir /s /b "%TMP%\*.csproj" 2>nul
  pause
  exit /b 1
)
echo SRC=%SRC%

REM backup payload
if exist "C:\RPM-Assure\installer\payload\payload.zip" (
  copy /Y "C:\RPM-Assure\installer\payload\payload.zip" "%TEMP%\rpma_payload_bak.zip" >nul
  echo Backed up payload.zip
)

mkdir "C:\RPM-Assure\installer" 2>nul
xcopy /E /Y /I /Q "%SRC%\*" "C:\RPM-Assure\installer\" >nul
if exist "%TEMP%\rpma_payload_bak.zip" (
  mkdir "C:\RPM-Assure\installer\payload" 2>nul
  copy /Y "%TEMP%\rpma_payload_bak.zip" "C:\RPM-Assure\installer\payload\payload.zip" >nul
  echo Restored payload.zip
)

echo.
echo Launching BUILD-SETUP.cmd ...
call "C:\RPM-Assure\installer\BUILD-SETUP.cmd"
