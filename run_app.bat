@echo off
title Money Mind Local Server
echo ===================================================
echo   Starting Money Mind Local Server...
echo   Web App will open at http://localhost:8000
echo ===================================================
echo.

:: Get the directory of this batch file
cd /d "%~dp0"

:: Start the browser pointing to the local address
start "" "http://localhost:8000"

:: Run the Flask backend server
cd backend
python main.py

pause
