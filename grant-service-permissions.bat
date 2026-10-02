@echo off
:: ==============================================================================
:: District Governance Suite (DGS) - Grant Windows Service Permissions
:: Grants Authenticated Users & Local System permission to Start/Stop District Services
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
echo   Configuring District Services Permissions & Auto-Start...
echo ========================================================
echo.

for %%s in (%SERVICES%) do (
    echo Granting Start/Stop permissions and Auto-Start for: %%s
    sc config "%%s" start= auto >nul 2>&1
    sc sdset "%%s" "%SDDL%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [OK] %%s configured.
    ) else (
        echo   [SKIP] %%s (Service not installed or already configured)
    )
)

echo.
echo ========================================================
echo   SUCCESS! District services can now be started and
echo   restarted directly from the DGS Web Portal without
echo   requiring UAC elevation.
echo ========================================================
echo.
pause
