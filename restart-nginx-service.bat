@echo off
:: Restart DGS-Nginx Windows Service
setlocal
set "NSSM_EXE=D:\aj\Tools\nssm.exe"
set "SERVICE_NAME=DGS-Nginx"

echo Restarting %SERVICE_NAME%...
"%NSSM_EXE%" restart "%SERVICE_NAME%"
echo Done.
pause
