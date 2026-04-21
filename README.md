# MedMatch — Laska Corporate Medical
## Outil de Matching Médical Interne

---

## Démarrage rapide

### Première fois (installation)
1. Double-cliquez sur `INSTALLER.bat`
2. Suivez les instructions à l'écran
3. Une fois terminé, double-cliquez sur `LANCER_MEDMATCH.bat`

### Utilisations suivantes
- Double-cliquez sur **`LANCER_MEDMATCH.bat`**
- L'application s'ouvre dans votre navigateur
- Partagez l'adresse réseau avec vos collègues

---

## Prérequis (une seule fois)
- **Python 3.9+** : https://www.python.org/downloads/ (cocher "Add to PATH")
- **Node.js LTS** : https://nodejs.org (seulement pour l'installation)

---

## Accès équipe
Une fois lancée, l'application est accessible sur votre réseau local.
L'adresse s'affiche dans la fenêtre noire et dans le Dashboard.

---

## Connexion Google Sheets
Allez dans **Google Sheets** (menu de gauche) pour configurer la synchronisation
automatique avec vos fichiers Google Sheets.

---

## Structure
```
medmatch/
├── INSTALLER.bat          ← Lancer une seule fois
├── LANCER_MEDMATCH.bat    ← Lancer l'application
├── backend/
│   ├── main.py            ← API FastAPI
│   ├── sheets_sync.py     ← Sync Google Sheets
│   └── static/            ← Frontend compilé (généré par INSTALLER.bat)
├── data/
│   ├── doctors.json       ← 261 médecins
│   ├── hospitals.json     ← 35 établissements
│   ├── offers.json        ← 197 offres
│   └── calls.json         ← Historique appels
└── frontend/              ← Code source React (pas nécessaire pour utiliser l'app)
```
