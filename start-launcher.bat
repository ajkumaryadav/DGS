@echo off
:: ==============================================================================
:: District Governance Suite (DGS) Launcher and Service Manager Server
:: Runs on Port 8000 and automatically opens Portal in Default Browser
:: ==============================================================================
setlocal EnableDelayedExpansion

>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting Administrator privileges to manage Windows Services...
    powershell -Command "Start-Process -Verb RunAs -FilePath '%~f0'"
    exit /b
)

title DGS Launcher and Service Manager (Port 8000)
cd /d "%~dp0"
echo ========================================================
echo Starting District Governance Suite (DGS) Launcher...
echo Live Service Management and Health API: Active on Port 8000
echo ========================================================
echo.

:: Automatically open browser after 1 second in background
start "" cmd /c "timeout /t 1 /nobreak >nul & start http://localhost:8000/"

node server.js
pause
