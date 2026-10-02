@echo off
:: ==============================================================================
:: District Governance Suite (DGS) - Install DGS Launcher as Automatic Windows Service
:: Runs server.js on Port 8000 automatically when the PC boots up!
:: ==============================================================================
setlocal EnableDelayedExpansion

>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo ========================================================
    echo  Requesting Administrator Privileges...
    echo ========================================================
    powershell -Command "Start-Process -Verb RunAs -FilePath '%~f0'"
    exit /b
)

set "SERVICE_NAME=DGS-Launcher-Server"
set "DGS_DIR=%~dp0"
set "NSSM_EXE=D:\aj\Tools\nssm.exe"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"

echo ========================================================
echo   Installing DGS Launcher as Automatic 24/7 Windows Service
echo   Port 8000 (DGS Management Portal)
echo ========================================================
echo.

:: 1. Check Node.js
if not exist "%NODE_EXE%" (
    where node.exe >nul 2>&1
    if '%errorlevel%' EQU '0' (
        for /f "delims=" %%i in ('where node.exe') do set "NODE_EXE=%%i"
    ) else (
        echo [ERROR] Node.js not found! Please ensure Node.js is installed.
        pause
        exit /b 1
    )
)

:: 2. Check NSSM
if not exist "%NSSM_EXE%" (
    where nssm.exe >nul 2>&1
    if '%errorlevel%' EQU '0' (
        for /f "delims=" %%i in ('where nssm.exe') do set "NSSM_EXE=%%i"
    ) else (
        echo [ERROR] NSSM not found at %NSSM_EXE%!
        pause
        exit /b 1
    )
)

echo [1/4] Checking Node: "%NODE_EXE%"
echo [2/4] Checking NSSM: "%NSSM_EXE%"
echo [3/4] Configuring Port 8000 in Windows Firewall...
netsh advfirewall firewall delete rule name="DGS Launcher Web Portal (Port 8000)" >nul 2>&1
netsh advfirewall firewall add rule name="DGS Launcher Web Portal (Port 8000)" dir=in action=allow protocol=TCP localport=8000 profile=any >nul 2>&1

echo [4/4] Registering Windows Service '%SERVICE_NAME%' with NSSM...
"%NSSM_EXE%" stop "%SERVICE_NAME%" >nul 2>&1
"%NSSM_EXE%" remove "%SERVICE_NAME%" confirm >nul 2>&1

"%NSSM_EXE%" install "%SERVICE_NAME%" "%NODE_EXE%" "server.js"
"%NSSM_EXE%" set "%SERVICE_NAME%" AppDirectory "%DGS_DIR%"
"%NSSM_EXE%" set "%SERVICE_NAME%" DisplayName "District Governance Suite - Portal Launcher Server"
"%NSSM_EXE%" set "%SERVICE_NAME%" Description "High-availability portal launcher and service manager for District Governance Suite on port 8000."
"%NSSM_EXE%" set "%SERVICE_NAME%" Start SERVICE_AUTO_START
"%NSSM_EXE%" set "%SERVICE_NAME%" AppStopMethodSkip 0
"%NSSM_EXE%" set "%SERVICE_NAME%" AppStopMethodConsole 1500
"%NSSM_EXE%" set "%SERVICE_NAME%" AppKillConsoleDelay 1500

:: Grant SDDL Permissions
set "SDDL=D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)(A;;CCLCSWRPWPDTLOCRRC;;;IU)(A;;CCLCSWRPWPDTLOCRRC;;;SU)(A;;CCLCSWRPWPDTLOCRRC;;;AU)(A;;CCLCSWRPWPDTLOCRRC;;;BU)"
sc sdset "%SERVICE_NAME%" "%SDDL%" >nul 2>&1

"%NSSM_EXE%" start "%SERVICE_NAME%"

echo.
echo ========================================================
echo   SUCCESS! DGS Launcher Server is now an Automatic Service.
echo   It will boot and run 24/7 automatically on Port 8000!
echo.
echo   You can now open:
echo   - Local:  http://localhost:8000/
echo   - Local:  http://127.0.0.1:8000/
echo   - LAN:    http://10.70.12.73:8000/
echo ========================================================
echo.
pause
