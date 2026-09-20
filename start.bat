@echo off
title Nocturne Music Player
color 0b
echo ========================================================
echo         NOCTURNE MUSIC PLAYER - STARTUP
echo ========================================================
echo.
echo   [API] Backend will be ready at:  http://localhost:3001
echo   [WEB] Frontend will be ready at: http://localhost:3000
echo.
echo Starting both services together...
echo Press Ctrl+C anytime to stop.
echo ========================================================
echo.

cd /d "%~dp0"
npm run dev
pause
