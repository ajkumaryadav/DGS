@echo off
:: ==============================================================================
:: District Governance Suite (DGS) - Configure All Services for Automatic Boot Start
:: Sets startup type to AUTO & configures full Start/Stop permissions
:: ==============================================================================
setlocal EnableDelayedExpansion

>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process -Verb RunAs -FilePath '%~f0'"
    exit /b
)

set "SDDL=D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)(A;;CCLCSWRPWPDTLOCRRC;;;IU)(A;;CCLCSWRPWPDTLOCRRC;;;SU)(A;;CCLCSWRPWPDTLOCRRC;;;AU)(A;;CCLCSWRPWPDTLOCRRC;;;BU)"

set SERVICES=DGS-Launcher-Server DGS-Nginx bams DakMonitoring DistrictFlagshipMonitoring ACCC-WEB ACCC-API SamparkWeb SamparkAPI tcms gtes

echo ========================================================
echo   Configuring All District Services for Auto-Boot & Control
echo ========================================================
echo.

for %%s in (%SERVICES%) do (
    echo ----------------------------------------------------
    echo Processing Service: %%s
    
    :: 1. Set to Automatic Startup on Boot
    sc config "%%s" start= auto >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [AUTO-START] Configured to start automatically on boot.
    ) else (
        echo   [NOTE] Service not yet installed or config skipped.
    )

    :: 2. Set SDDL Permissions for 1-click web control
    sc sdset "%%s" "%SDDL%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [PERMISSIONS] Full web portal control granted.
    )

    :: 3. Start service if currently stopped
    sc query "%%s" | find "RUNNING" >nul 2>&1
    if !errorlevel! neq 0 (
        echo   [STARTING] Initiating service %%s...
        net start "%%s" >nul 2>&1
        if !errorlevel! equ 0 (
            echo   [STARTED] %%s is now RUNNING.
        ) else (
            echo   [INFO] %%s could not start immediately (check app binary).
        )
    ) else (
        echo   [ONLINE] %%s is already RUNNING.
    )
)

echo.
echo ========================================================
echo   SUCCESS! All installed District Services are now set to:
echo   1. Auto-Start 24/7 on PC Boot
echo   2. Controlled without UAC elevation from DGS Web Portal
echo ========================================================
echo.
pause
