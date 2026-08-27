@echo off
:: Uninstall DGS-Nginx Windows Service
setlocal
set "NSSM_EXE=D:\aj\Tools\nssm.exe"
set "SERVICE_NAME=DGS-Nginx"

>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    powershell -Command "Start-Process -Verb RunAs -FilePath '%~f0'"
    exit /b
)

echo Stopping and removing %SERVICE_NAME%...
"%NSSM_EXE%" stop "%SERVICE_NAME%"
"%NSSM_EXE%" remove "%SERVICE_NAME%" confirm
echo Service removed.
pause
