@echo off
:: Enable DGS Launcher & District Applications LAN Access (Requires Administrator Elevation)
setlocal EnableDelayedExpansion

>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo ========================================================
    echo  Requesting Administrator Privileges...
    echo ========================================================
    powershell -Command "Start-Process -Verb RunAs -FilePath '%~f0'"
    exit /b
)

echo ========================================================
echo   Configuring Windows Network & Firewall for LAN Access
echo ========================================================
echo.

echo [1/4] Switching Ethernet Network Profile to Private...
powershell -Command "Set-NetConnectionProfile -InterfaceAlias 'Ethernet' -NetworkCategory Private -ErrorAction SilentlyContinue"

echo [2/4] Configuring Windows Proxy Bypass for Local Subnet (10.*)...
powershell -Command "$p = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'; $ov = $p.ProxyOverride; if ($ov -notlike '*10.*') { Set-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -Name 'ProxyOverride' -Value ('<local>;10.*;127.*;' + $ov) }"

echo [3/4] Allowing DGS Gateway (Port 80) & Launcher (Port 8000)...
netsh advfirewall firewall delete rule name="DGS Gateway (Port 80)" >nul 2>&1
netsh advfirewall firewall add rule name="DGS Gateway (Port 80)" dir=in action=allow protocol=TCP localport=80 profile=any >nul 2>&1

netsh advfirewall firewall delete rule name="DGS Launcher (Port 8000)" >nul 2>&1
netsh advfirewall firewall add rule name="DGS Launcher (Port 8000)" dir=in action=allow protocol=TCP localport=8000 profile=any >nul 2>&1

echo [4/4] Allowing All District Application Ports (3000,3001,3005,3050,3100,3333,7000,8080)...
netsh advfirewall firewall delete rule name="DGS District Apps Suite" >nul 2>&1
netsh advfirewall firewall add rule name="DGS District Apps Suite" dir=in action=allow protocol=TCP localport=3000,3001,3005,3050,3100,3333,7000,8080 profile=any >nul 2>&1

echo.
echo ========================================================
echo   SUCCESS! All Gateway & Application Ports are OPEN.
echo.
echo   How to access:
echo   - From LAN Clients: http://10.70.12.73/ (or :8000)
echo   - From This Server: http://localhost/   (or :8000)
echo ========================================================
echo.
pause
