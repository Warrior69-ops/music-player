@echo off
title Nocturne Music Player (Dual Windows)
echo ========================================================
echo   Launching API and Web in dedicated command windows...
echo ========================================================
echo.

cd /d "%~dp0"
start "Nocturne API [Port 3001]" cmd /k "cd /d "%~dp0" && npm run dev:api"
timeout /t 2 /nobreak >nul
start "Nocturne Web [Port 3000]" cmd /k "cd /d "%~dp0" && npm run dev:web"

echo Services have been launched in separate windows!
echo - Frontend: http://localhost:3000
echo - Backend:  http://localhost:3001
echo.
timeout /t 5
