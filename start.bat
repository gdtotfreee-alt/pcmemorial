@echo off
title PC Memorial Kalawati Hospital - Prescription Management System
echo ============================================================
echo   PC Memorial Kalawati Hospital - Prescription Management
echo ============================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/4] Node.js version:
node --version
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [2/4] Installing dependencies first time - please wait...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo.
) else (
    echo [2/4] Dependencies already installed.
    echo.
)

REM Generate Prisma client
echo [3/4] Setting up database...
call npx prisma generate
echo.

REM ============================================================
REM Detect the PC's actual IP address (not 0.0.0.0)
REM ============================================================
set "PC_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4 Address"') do (
    set "temp_ip=%%a"
    set "temp_ip=!temp_ip: =!"
    REM Take the first IPv4 address found
    if not defined PC_IP (
        set "PC_IP=!temp_ip!"
    )
)

REM Enable delayed expansion for variable manipulation
setlocal enabledelayedexpansion

REM Re-detect with delayed expansion
set "PC_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4 Address"') do (
    set "temp_ip=%%a"
    set "temp_ip=!temp_ip: =!"
    if not defined PC_IP set "PC_IP=!temp_ip!"
)

REM Start the dev server with network access enabled
echo [4/4] Starting server...
echo.
echo ============================================================
echo.
echo   HOW TO ACCESS THE APP:
echo.
echo   On THIS computer:
echo     http://localhost:3000
echo.
if defined PC_IP (
    echo   On OTHER devices (phone, tablet, other PC):
echo     http://!PC_IP!:3000
echo.
echo   ^>^> Use the address above on any device on the same WiFi ^<^<
echo.
echo   NOTE: Ignore the "0.0.0.0" shown by Next.js below.
echo         Use !PC_IP! instead - that is your PC's real IP address.
) else (
    echo   On OTHER devices: Run 'ipconfig' in Command Prompt
echo   to find your PC's IPv4 Address, then use http://YOUR-IP:3000
)
echo.
echo   - All devices must be on the same WiFi
echo   - All devices auto-sync every 15 seconds
echo   - Windows Firewall may prompt - click "Allow access"
echo   - Press Ctrl+C to stop the server
echo.
echo ============================================================
echo.

REM Open browser after a short delay (in background)
start /b cmd /c "timeout /t 8 >nul & start http://localhost:3000"

REM Start Next.js dev server bound to all interfaces (-H 0.0.0.0)
REM This enables network access. The 0.0.0.0 shown by Next.js is normal -
REM it means "all interfaces". Use the PC_IP shown above to access.
npm run dev

pause
