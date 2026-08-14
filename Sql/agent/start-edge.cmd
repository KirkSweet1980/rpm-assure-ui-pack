@echo off
cd /d C:\RPM-Assure\Agent
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\RPM-Assure\Agent\RpmAssure-Agent-Loop.ps1" -AgentRoot "C:\RPM-Assure\Agent"
