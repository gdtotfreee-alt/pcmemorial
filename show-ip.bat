@echo off
title Your PC IP Address
echo ============================================================
echo   Your PC's IP Address (for multi-device access)
echo ============================================================
echo.
echo Finding your IP address...
echo.

setlocal enabledelayedexpansion
set "PC_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4 Address"') do (
    set "temp_ip=%%a"
    set "temp_ip=!temp_ip: =!"
    if not defined PC_IP set "PC_IP=!temp_ip!"
)

if defined PC_IP (
    echo ============================================================
    echo.
    echo   Your PC's IP address is:  !PC_IP!
    echo.
    echo   To open the app on other devices (phone, tablet, PC):
    echo.
    echo     http://!PC_IP!:3000
    echo.
    echo   Type this address into any browser on any device
    echo   connected to the SAME WiFi network.
    echo.
    echo ============================================================
) else (
    echo Could not detect IP address automatically.
    echo.
    echo Run 'ipconfig' manually and look for "IPv4 Address".
)

echo.
echo Press any key to close...
pause >nul
