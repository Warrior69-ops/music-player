@echo off
title MELO Music Player Launcher
echo ========================================================
echo             MELO Music Player Launcher
echo ========================================================
echo.

cd /d "%~dp0"

REM 1. Check for root .env
if not exist ".env" (
    echo [!] .env file not found in root!
    if exist ".env.example" (
        echo [*] Automatically creating .env from .env.example...
        copy .env.example .env
    ) else (
        echo [ERROR] No .env or .env.example found.
    )
)

REM 2. Check for apps\web\.env.local
if not exist "apps\web\.env.local" (
    echo [*] Creating apps\web\.env.local...
    echo NEXT_PUBLIC_API_URL=http://localhost:3001 > apps\web\.env.local
)

REM 3. Check for node_modules
if not exist "node_modules" (
    echo [*] Installing dependencies... This may take 1-2 minutes.
    call npm install
)

echo.
echo ========================================================
echo   Starting Backend API (Port 3001) and Web App (Port 3000)
echo ========================================================
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo ========================================================
echo.
call npm run dev
pause
