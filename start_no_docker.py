#!/usr/bin/env python3
"""
Lance MedMatch sans Docker (mode développement).
Requis : Python 3.9+ et Node.js 18+
"""
import subprocess, sys, os, time, webbrowser
from pathlib import Path

ROOT = Path(__file__).parent

def run(cmd, cwd=None, **kwargs):
    return subprocess.Popen(cmd, cwd=cwd or ROOT, shell=True, **kwargs)

print("\n MedMatch — Démarrage sans Docker\n" + "="*40)

# Install backend deps
print("\n[1/4] Installation des dépendances backend...")
subprocess.run(f"{sys.executable} -m pip install -r backend/requirements.txt -q", shell=True, cwd=ROOT)

# Install frontend deps
print("[2/4] Installation des dépendances frontend...")
subprocess.run("npm install --silent", shell=True, cwd=ROOT / "frontend")

# Start backend
print("[3/4] Démarrage du backend (port 8000)...")
backend = run(f"{sys.executable} -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload",
              cwd=ROOT / "backend",
              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Start frontend dev server
print("[4/4] Démarrage du frontend (port 3000)...")
frontend = run("npm run dev", cwd=ROOT / "frontend",
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

time.sleep(3)

print("\n" + "="*40)
print("  Application démarrée !")
print("="*40)
print("  Interface :  http://localhost:3000")
print("  API Docs  :  http://localhost:8000/docs")
print("\n  Ctrl+C pour arrêter\n")

webbrowser.open("http://localhost:3000")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\n Arrêt...")
    backend.terminate()
    frontend.terminate()
