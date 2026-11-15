@echo off
rem Double-click to install or update Pulse on Windows (Docker Desktop must be running).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
