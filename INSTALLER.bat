@echo off
title MedMatch — Installation
color 0B
cls
echo.
echo  =====================================================
echo   MEDMATCH — Installation (a faire une seule fois)
echo  =====================================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  [ERREUR] Python non installe.
    echo  Telechargez sur : https://www.python.org/downloads/
    echo  IMPORTANT : Cochez "Add Python to PATH" !
    pause & exit /b 1
)
echo  [OK] Python detecte

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  [ERREUR] Node.js non installe.
    echo  Telechargez sur : https://nodejs.org  (bouton LTS)
    echo  Puis relancez ce fichier.
    pause & exit /b 1
)
echo  [OK] Node.js detecte

:: Install Python deps
echo.
echo  [1/3] Installation des dependances Python...
pip install fastapi uvicorn pydantic python-multipart google-auth google-api-python-client -q --disable-pip-version-check
echo  [1/3] OK

:: Install Node deps
echo  [2/3] Installation des dependances frontend...
cd /d "%~dp0frontend"
call npm install --silent
echo  [2/3] OK

:: Build frontend
echo  [3/3] Compilation du frontend...
call npm run build
echo  [3/3] OK

:: Mark as installed
echo. > "%~dp0.deps_installed"
echo. > "%~dp0.frontend_built"

color 0A
cls
echo.
echo  =====================================================
echo   Installation terminee avec succes !
echo  =====================================================
echo.
echo  Pour lancer l'application :
echo  Double-cliquez sur  LANCER_MEDMATCH.bat
echo.
pause
