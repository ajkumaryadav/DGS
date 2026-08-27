@echo off
:: Auto-elevate to Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo Restarting BAMS Windows Service on Port 3100...
if exist "D:\aj\Tools\nssm.exe" (
    "D:\aj\Tools\nssm.exe" restart bams
    "D:\aj\Tools\nssm.exe" status bams
) else (
    nssm restart bams
    nssm status bams
)

echo.
echo BAMS restarted successfully on Port 3100.
pause
