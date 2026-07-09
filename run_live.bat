@echo off
title Money Mind Live Server with Cloudflare Tunnel
echo ===================================================
echo   Starting Money Mind Backend ^& Cloudflare Tunnel...
echo   Backend: http://localhost:8555
echo   Live URL: https://tsdunair.dpdns.org
echo ===================================================
echo.

:: Dapatkan direktori dari batch file ini
cd /d "%~dp0"

:: Jalankan Cloudflare Tunnel di window terpisah
echo Menjalankan Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /c "cloudflared.exe --config C:\Users\DELL\.cloudflared\config.yml tunnel run"

:: Jalankan Flask backend server
echo Menjalankan Flask backend...
cd backend
.\venv\Scripts\python.exe main.py

pause
