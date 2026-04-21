@echo off
title MedMatch — Laska Corporate Medical
color 0A
cls

echo.
echo  =====================================================
echo   MEDMATCH — Laska Corporate Medical
echo  =====================================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  [ERREUR] Python non installe.
    echo  Lancez d'abord INSTALLER.bat
    pause & exit /b 1
)

:: Check frontend is built
if not exist "%~dp0backend\static\index.html" (
    color 0E
    echo  [!] Le frontend n'est pas encore compile.
    echo  Lancez d'abord INSTALLER.bat
    echo.
    pause & exit /b 1
)

:: Install Python deps on first run
if not exist "%~dp0.deps_installed" (
    echo  Installation des dependances...
    pip install fastapi uvicorn pydantic python-multipart google-auth google-api-python-client -q --disable-pip-version-check
    echo. > "%~dp0.deps_installed"
)

:: Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1" ^| findstr /v "169.254"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP: =%

:: Start backend
echo  Demarrage du serveur...
cd /d "%~dp0backend"
start /b "" python -m uvicorn main:app --host 0.0.0.0 --port 8000 > "%~dp0logs.txt" 2>&1

:: Wait for ready
:wait_loop
timeout /t 1 /nobreak >nul
curl -s http://localhost:8000/api/stats >nul 2>&1
if errorlevel 1 goto wait_loop

:: Show info
cls
color 0A
echo.
echo  =====================================================
echo   MEDMATCH EST DEMARRE !
echo  =====================================================
echo.
echo   Votre acces :        http://localhost:8000
echo.
echo   Acces collegues :    http://%LOCAL_IP%:8000
echo.
echo   Copiez et envoyez :  http://%LOCAL_IP%:8000
echo.
echo  =====================================================
echo.
echo   Ne fermez PAS cette fenetre.
echo   Ctrl+C pour arreter l'application.
echo.

:: Open browser
start http://localhost:8000

:: Keep alive with auto-restart
:keep_alive
timeout /t 20 /nobreak >nul
curl -s http://localhost:8000/api/stats >nul 2>&1
if errorlevel 1 (
    echo  Relancement du serveur...
    cd /d "%~dp0backend"
    start /b "" python -m uvicorn main:app --host 0.0.0.0 --port 8000 >> "%~dp0logs.txt" 2>&1
    timeout /t 3 /nobreak >nul
)
goto keep_alive
