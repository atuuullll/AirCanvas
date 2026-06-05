@echo off
setlocal enabledelayedexpansion

echo.
echo 🚀 AirCanvas - Starting Sharing Infrastructure
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if !errorlevel! neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo 📦 Installing server dependencies...
cd server
call npm install >nul 2>&1
if !errorlevel! equ 0 (
    echo ✓ Server dependencies installed
) else (
    echo ✗ Failed to install server dependencies
    cd ..
    pause
    exit /b 1
)

echo.
echo 📦 Installing web dependencies...
cd ..\web
call npm install >nul 2>&1
if !errorlevel! equ 0 (
    echo ✓ Web dependencies installed
) else (
    echo ✗ Failed to install web dependencies
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo 🚀 Starting servers...
echo.

echo Starting Backend Server on port 3000...
start "AirCanvas Server" cmd /k "cd server && npm start"
echo ✓ Server started

timeout /t 2 /nobreak

echo Starting Web App on port 5173+...
start "AirCanvas Web" cmd /k "cd web && npm run dev"
echo ✓ Web App started

echo.
echo ✅ AirCanvas is running!
echo.
echo ══════════════════════════════════════════
echo Backend:  http://localhost:3000
echo Web App:  http://localhost:5173
echo ══════════════════════════════════════════
echo.
echo 📋 How to use:
echo 1. Click the 🔗 Share button to start sharing your canvas
echo 2. Copy the share link and send it to others
echo 3. Others can open the link to view your canvas in real-time
echo.
echo ⚠️  To stop: Close the command windows
echo.
pause
