@echo off
:: Auto-elevate to Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo ========================================================
echo   Restarting Dak Monitoring Windows Service (Port 3050)
echo ========================================================
echo.

set "NSSM_EXE=D:\aj\Tools\nssm.exe"
if not exist "%NSSM_EXE%" (
    where nssm.exe >nul 2>&1
    if '%errorlevel%' EQU '0' (
        for /f "delims=" %%i in ('where nssm.exe') do set "NSSM_EXE=%%i"
    ) else (
        set "NSSM_EXE=nssm"
    )
)

echo [1/3] Checking DakMonitoring service...
"%NSSM_EXE%" status DakMonitoring >nul 2>&1
if %errorlevel% equ 0 (
    echo [2/3] Restarting service 'DakMonitoring'...
    "%NSSM_EXE%" restart DakMonitoring
    "%NSSM_EXE%" status DakMonitoring
) else (
    echo [INFO] Attempting net start DakMonitoring...
    net start DakMonitoring >nul 2>&1
    if %errorlevel% equ 0 (
        echo   [OK] DakMonitoring service started.
    ) else (
        echo   [NOTE] DakMonitoring Windows service is not yet running or registered.
        echo   Starting Dak Monitoring directly if available...
        if exist "D:\aj\Dak-Monitoring" (
            start "" cmd /c "cd /d D:\aj\Dak-Monitoring && npm run dev"
        ) else if exist "D:\aj\Dak" (
            start "" cmd /c "cd /d D:\aj\Dak && npm run dev"
        )
    )
)

echo.
echo Dak Monitoring service check complete.
pause
