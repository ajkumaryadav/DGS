@echo off
:: Check Status of DGS-Nginx Windows Service
setlocal
set "NSSM_EXE=D:\aj\Tools\nssm.exe"
set "SERVICE_NAME=DGS-Nginx"

echo Checking %SERVICE_NAME% status...
"%NSSM_EXE%" status "%SERVICE_NAME%"
echo.
sc query "%SERVICE_NAME%"
pause
