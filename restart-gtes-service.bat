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
echo   Restarting GTES Typing Exam Windows Service (Port 3800)
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

echo [1/3] Checking gtes service...
"%NSSM_EXE%" status gtes >nul 2>&1
if %errorlevel% equ 0 (
    echo [2/3] Restarting service 'gtes'...
    "%NSSM_EXE%" restart gtes
    "%NSSM_EXE%" status gtes
) else (
    echo [INFO] Attempting net start gtes...
    net start gtes >nul 2>&1
    if %errorlevel% equ 0 (
        echo   [OK] gtes service started.
    ) else (
        echo   [NOTE] 'gtes' Windows service not found. Starting GTES directly from D:\aj\gtes...
        if exist "D:\aj\gtes" (
            start "" cmd /c "cd /d D:\aj\gtes && npm run dev"
        )
    )
)

echo.
echo GTES Typing Examination service check complete.
pause
