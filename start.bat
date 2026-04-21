@echo off
echo.
echo  ================================
echo   MedMatch - Demarrage
echo  ================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
    echo  [ERREUR] Docker n'est pas installe.
    echo  Telechargez Docker Desktop sur https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo  [ERREUR] Docker n'est pas demarre. Lancez Docker Desktop puis reessayez.
    pause
    exit /b 1
)

echo  [1/3] Construction de l'application...
docker-compose build --quiet

echo  [2/3] Demarrage des services...
docker-compose up -d

echo  [3/3] Attente du demarrage...
timeout /t 5 /nobreak >nul

echo.
echo  ================================
echo   Application demarree !
echo  ================================
echo.
echo  Interface :  http://localhost:3000
echo  API Docs  :  http://localhost:8000/docs
echo.
echo  Pour arreter : docker-compose down
echo.
start http://localhost:3000
pause
