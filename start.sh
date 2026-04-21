#!/bin/bash
set -e

echo ""
echo " ================================"
echo "  MedMatch - Démarrage"
echo " ================================"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo " [ERREUR] Docker n'est pas installé."
    echo " Téléchargez Docker Desktop sur https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo " [ERREUR] Docker n'est pas démarré. Lancez Docker Desktop puis réessayez."
    exit 1
fi

echo " [1/3] Construction de l'application..."
docker-compose build -q

echo " [2/3] Démarrage des services..."
docker-compose up -d

echo " [3/3] Attente du démarrage..."
sleep 5

echo ""
echo " ================================"
echo "  Application démarrée !"
echo " ================================"
echo ""
echo "  Interface :  http://localhost:3000"
echo "  API Docs  :  http://localhost:8000/docs"
echo ""
echo "  Pour arrêter : docker-compose down"
echo ""

# Open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v open &> /dev/null; then
    open http://localhost:3000
fi
