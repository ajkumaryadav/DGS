@echo off
:: ==============================================================================
:: District Governance Suite (DGS) - Install NGINX as Automatic Windows Service
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

set "NGINX_DIR=C:\nginx"
set "NSSM_EXE=D:\aj\Tools\nssm.exe"
set "SERVICE_NAME=DGS-Nginx"
set "DGS_DIR=%~dp0"

echo ========================================================
echo   Installing NGINX as Automatic 24/7 Windows Service
echo ========================================================
echo.

:: 1. Check NGINX directory
if not exist "%NGINX_DIR%\nginx.exe" (
    echo [ERROR] NGINX not found at %NGINX_DIR%\nginx.exe!
    pause
    exit /b 1
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

echo [1/5] Stopping any running standalone nginx.exe processes...
taskkill /F /IM nginx.exe >nul 2>&1

echo [2/5] Updating C:\nginx\conf\nginx.conf with DGS Gateway configuration...
if exist "%NGINX_DIR%\conf\nginx.conf" (
    copy /Y "%NGINX_DIR%\conf\nginx.conf" "%NGINX_DIR%\conf\nginx.conf.bak" >nul 2>&1
)
copy /Y "%DGS_DIR%nginx.conf" "%NGINX_DIR%\conf\nginx.conf" >nul
if '%errorlevel%' NEQ '0' (
    echo [WARNING] Could not copy nginx.conf directly. Please ensure %NGINX_DIR%\conf\nginx.conf is updated.
)

echo [3/5] Configuring Port 80 in Windows Firewall...
netsh advfirewall firewall delete rule name="DGS NGINX Gateway (Port 80)" >nul 2>&1
netsh advfirewall firewall add rule name="DGS NGINX Gateway (Port 80)" dir=in action=allow protocol=TCP localport=80 profile=any >nul 2>&1

echo [4/5] Registering Windows Service '%SERVICE_NAME%' with NSSM...
"%NSSM_EXE%" stop "%SERVICE_NAME%" >nul 2>&1
"%NSSM_EXE%" remove "%SERVICE_NAME%" confirm >nul 2>&1

"%NSSM_EXE%" install "%SERVICE_NAME%" "%NGINX_DIR%\nginx.exe"
"%NSSM_EXE%" set "%SERVICE_NAME%" AppDirectory "%NGINX_DIR%"
"%NSSM_EXE%" set "%SERVICE_NAME%" DisplayName "District Governance Suite - NGINX Gateway"
"%NSSM_EXE%" set "%SERVICE_NAME%" Description "Reverse-proxy web gateway for District Governance Suite (DGS) on port 80."
"%NSSM_EXE%" set "%SERVICE_NAME%" Start SERVICE_AUTO_START
"%NSSM_EXE%" set "%SERVICE_NAME%" AppStopMethodSkip 0
"%NSSM_EXE%" set "%SERVICE_NAME%" AppStopMethodConsole 1500
"%NSSM_EXE%" set "%SERVICE_NAME%" AppKillConsoleDelay 1500

echo [5/5] Starting Windows Service '%SERVICE_NAME%'...
"%NSSM_EXE%" start "%SERVICE_NAME%"

echo.
echo ========================================================
echo   SUCCESS! NGINX is now installed as an Automatic Service.
echo   It will start automatically on system boot.
echo.
echo   You can now open:
echo   - Local:  http://localhost/
echo   - LAN:    http://10.70.12.73/
echo ========================================================
echo.
pause
