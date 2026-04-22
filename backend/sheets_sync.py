"""
sheets_sync.py — Google Sheets integration for MedMatch
Reads config from environment variables (Render) or local JSON file.
"""

import json, re, os
from pathlib import Path
from datetime import datetime

try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

DATA = Path(__file__).parent.parent / "data"
CONFIG_FILE = DATA / "sheets_config.json"

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

SHEET_TO_SPEC = {
    'MED URGENCE':                  "Médecine d'Urgence",
    'MEDECINE GERIATRIE':           'Gériatrie',
    'ANESTHESIE REANIMATION':       'Anesthésie-Réanimation',
    'MEDECINE GENERALE':            'Médecine Générale',
    'MEDECINE CARDIO':              'Cardiologie',
    'MEDECINE PEDIATRIE':           'Pédiatrie',
    'MEDECINE RADIOLOGIE':          'Radiologie',
    'MEDECINE PNEUMOLOGIE':         'Pneumologie',
    'MEDECINE ORTHOPEDIE':          'Orthopédie',
    'MEDECINE CHIR VISCERALE':      'Chirurgie Viscérale',
    'MEDECINE NEPHRO':              'Néphrologie',
    'MEDECINE BIOLOGIE':            'Biologie Médicale',
    'MEDECINE GYNECO':              'Gynécologie-Obstétrique',
    'MEDECINE PSYCHIATRIE':         'Psychiatrie',
    'MEDECINE GASTRO':              'Gastroentérologie',
    'MEDECINE ONCO':                'Oncologie',
    'MEDECINE NEURO':               'Neurologie',
    'MEDECINE HEMATO':              'Hématologie',
    'MEDECINE ENDOCRINO':           'Endocrinologie',
    'MEDECINE INTENSIVE':           'Médecine Intensive-Réanimation',
    'PHARMACIE':                    'Pharmacie',
    'PARAMED':                      'Paramédical',
}

OFFER_SHEET_TO_SPEC = {
    'Med Anesthésie':               'Anesthésie-Réanimation',
    'Chirurgie ORL':                'Chirurgie ORL',
    'CHIRURGIE DIGESTIVE':          'Chirurgie Viscérale',
    'Infectiologie':                'Infectiologie',
    'Chirurgie Viscerale':          'Chirurgie Viscérale',
    'Med Urgence':                  "Médecine d'Urgence",
    'Chirurgie vasculaire':         'Chirurgie Vasculaire',
    'Med MG et GERIATRIE':          'Médecine Générale',
    'Urologie':                     'Urologie',
    'Oncologie':                    'Oncologie',
    'Med MPR':                      'Médecine Physique et Réadaptation',
    'Biologie médicale':            'Biologie Médicale',
    'Rhumatologie':                 'Rhumatologie',
    'Med Réanimation':              'Médecine Intensive-Réanimation',
    'Med Pédiatrie':                'Pédiatrie',
    'Med Cardiologie':              'Cardiologie',
    'Med Gyneco':                   'Gynécologie-Obstétrique',
    'Med Neuro':                    'Neurologie',
    'Med Radio':                    'Radiologie',
    'Med Dentiste':                 'Chirurgie Dentaire',
    'Med Nephrologue':              'Néphrologie',
    'Med Psychiatrie':              'Psychiatrie',
    'HEMATO':                       'Hématologie',
    'Med Orthopedie':               'Orthopédie',
    'Pharmacie':                    'Pharmacie',
    'Chirurgie orthopédique':       'Orthopédie',
    'Med Gastrologue':              'Gastroentérologie',
    'Med Pneumologue':              'Pneumologie',
    'Med Travail':                  'Médecine du Travail',
    'Chirurgie urologique':         'Urologie',
    'Recrutement':                  'Recrutement CDI/CDD',
}


# ── Config helpers ─────────────────────────────────────────────────────────────

def load_config() -> dict:
    """Load config from environment variables first, then fallback to local file."""
    # Start with local config file
    config = _load_config_file()

    # Override with environment variables (used on Render)
    if os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON"):
        config["service_account_json"] = os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"]
    if os.environ.get("DOCTORS_SHEET_ID"):
        config["doctors_sheet_id"] = os.environ["DOCTORS_SHEET_ID"]
    if os.environ.get("HOSPITALS_SHEET_ID"):
        config["hospitals_sheet_id"] = os.environ["HOSPITALS_SHEET_ID"]
    if os.environ.get("OFFERS_SHEET_ID"):
        config["offers_sheet_id"] = os.environ["OFFERS_SHEET_ID"]

    return config


def _load_config_file() -> dict:
    """Load config from local JSON file."""
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {
        "doctors_sheet_id": "",
        "hospitals_sheet_id": "",
        "offers_sheet_id": "",
        "service_account_json": "",
        "auto_sync": False,
        "last_sync": None,
        "last_sync_status": None,
    }


def save_config(config: dict):
    DATA.mkdir(parents=True, exist_ok=True)
    # Don't save env var values to file
    safe = {k: v for k, v in config.items() if k != "service_account_json"}
    CONFIG_FILE.write_text(json.dumps(safe, ensure_ascii=False, indent=2), encoding="utf-8")


# ── Google Sheets client ───────────────────────────────────────────────────────

def get_sheets_service(service_account_info: dict):
    if not GOOGLE_AVAILABLE:
        raise RuntimeError("google-auth not installed.")
    creds = Credentials.from_service_account_info(service_account_info, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds, cache_discovery=False, num_retries=3)

def get_sheet_names(service, spreadsheet_id: str) -> list:
    meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    return [s["properties"]["title"] for s in meta.get("sheets", [])]

def read_sheet(service, spreadsheet_id: str, sheet_name: str) -> list:
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range=f"'{sheet_name}'"
    ).execute()
    return result.get("values", [])


# ── Parsers ────────────────────────────────────────────────────────────────────

def clean(s) -> str:
    if s is None: return ""
    return str(s).strip().replace("\n", " ").replace("  ", " ")

def extract_dept(text: str) -> str:
    m = re.search(r'\((\d{2,3})\)', text)
    return m.group(1) if m else ""

def parse_doctors(service, sheet_id: str) -> list:
    doctors = []
    doc_id = 1
    sheet_names = get_sheet_names(service, sheet_id)

    for sheet_name in sheet_names:
        spec_key = sheet_name.strip().upper()
        spec = None
        for k, v in SHEET_TO_SPEC.items():
            if k.upper() in spec_key or spec_key in k.upper():
                spec = v
                break
        if not spec:
            continue

        rows = read_sheet(service, sheet_id, sheet_name)
        if len(rows) < 2:
            continue

        header_row = 1
        for i, row in enumerate(rows[:3]):
            row_str = " ".join(str(c).lower() for c in row)
            if "nom" in row_str or "mail" in row_str or "email" in row_str:
                header_row = i
                break

        for row in rows[header_row + 1:]:
            if not row or not row[0]:
                continue
            name = clean(row[0])
            if not name or name.lower() in ["nom et prénom", "nom", "ouer", "nan"]:
                continue

            if "PARAMED" in sheet_name.upper():
                mail = clean(row[0]) if len(row) > 0 else ""
                name = clean(row[2]) if len(row) > 2 else ""
                tel  = clean(row[3]) if len(row) > 3 else ""
                notes = ""
                cp   = clean(row[4]) if len(row) > 4 else ""
            else:
                mail  = clean(row[1]) if len(row) > 1 else ""
                tel   = clean(row[2]) if len(row) > 2 else ""
                notes = clean(row[3]) if len(row) > 3 else ""
                cp    = clean(row[4]) if len(row) > 4 else ""

            if not name:
                continue

            if spec == "Médecine d'Urgence" and re.match(r'^\d{4,6}', notes.strip()):
                notes, cp = cp, notes

            doctors.append({
                "id": doc_id,
                "nom": name.replace("\t", " ").strip(),
                "specialite": spec,
                "mail": mail,
                "tel": tel,
                "notes": notes,
                "code_postal": cp,
                "statut": "disponible",
            })
            doc_id += 1

    return doctors


def parse_hospitals(service, sheet_id: str) -> list:
    """
    Parse hospitals from Google Sheets with multiple tab structures.
    
    Tab structures:
    - Hopitaux Publics France: row2=header, col A=prospecteur(ignore), col B=DPT, col C=nom_hopital, col D=nom_contact, col E=tel
    - Hopitaux Privés et Cliniques: row2=header, col A=prospecteur(ignore), col B=etablissement, col C=nom, col D=tel, col E=email
    - Centre de santé: same as Hopitaux Privés
    - Base de donnés FHF: row1=data, col A=region, col B=etablissement, col C=tel, col D=contact
    - ESPIC: row1=data, col A=prospecteur(ignore), col C=nom_hopital
    - EHPAD IDF: row1=data, col A=prospecteur(ignore), col B=nom_hopital, col C=adresse, col D=ville, col E=tel
    - Maisons de retraite: row2=header, col A=prospecteur(ignore), col B=etablissement, col C=tel
    - A classer: col A=prospecteur(ignore), col B=nom_hopital, col C=contact, col D=tel
    - Base de donnés ILE DE FRANCE: col A=type, col B=tel, col C=categorie, col D=nom_hopital, col E=statut, col F=adresse
    """
    hospitals = []
    hop_id = 1
    
    try:
        sheet_names = get_sheet_names(service, sheet_id)
    except Exception as e:
        return hospitals

    # Tabs to skip
    SKIP_TABS = ['Feuille 14']

    for sheet_name in sheet_names:
        if sheet_name in SKIP_TABS:
            continue

        try:
            rows = read_sheet(service, sheet_id, sheet_name)
        except Exception:
            continue

        if not rows:
            continue

        tab = sheet_name.strip()

        # ── Hopitaux Publics France ──────────────────────────────────────────
        if 'Hopitaux Publics' in tab or 'Hôpitaux Publics' in tab:
            for row in rows[2:]:  # Skip rows 1-2 (empty + header)
                if not row or len(row) < 3:
                    continue
                nom = clean(row[2]) if len(row) > 2 else ""
                if not nom or len(nom) < 3:
                    continue
                dept_raw = str(row[1]) if len(row) > 1 and row[1] else ""
                tel = clean(row[4]) if len(row) > 4 else ""
                contact = clean(row[3]) if len(row) > 3 else ""
                dept = dept_raw.strip() if dept_raw else ""
                hospitals.append({
                    "id": hop_id,
                    "nom": nom,
                    "localisation": f"Département {dept}" if dept else "",
                    "departement": dept,
                    "region": "France",
                    "telephone": tel,
                    "contact": contact,
                    "type": "Hôpital Public",
                })
                hop_id += 1

        # ── Hopitaux Privés / Centre de santé ─────────────────────────────────
        elif 'Priv' in tab or 'Centre de sant' in tab:
            for row in rows[2:]:  # Skip rows 1-2
                if not row or len(row) < 2:
                    continue
                nom = clean(row[1]) if len(row) > 1 else ""
                if not nom or len(nom) < 3:
                    continue
                tel = clean(row[3]) if len(row) > 3 else ""
                contact = clean(row[2]) if len(row) > 2 else ""
                email = clean(row[4]) if len(row) > 4 else ""
                hospitals.append({
                    "id": hop_id,
                    "nom": nom,
                    "localisation": "",
                    "departement": "",
                    "region": "Île-de-France",
                    "telephone": tel,
                    "contact": contact,
                    "email": email,
                    "type": "Clinique Privée" if "Priv" in tab else "Centre de Santé",
                })
                hop_id += 1

        # ── Base de donnés FHF ───────────────────────────────────────────────
        elif 'FHF' in tab:
            for row in rows:
                if not row or len(row) < 2:
                    continue
                region = clean(row[0]) if row[0] else ""
                nom = clean(row[1]) if len(row) > 1 else ""
                if not nom or len(nom) < 3:
                    continue
                tel_raw = row[2] if len(row) > 2 else ""
                tel = str(int(tel_raw)) if isinstance(tel_raw, float) else clean(str(tel_raw)) if tel_raw else ""
                contact = clean(row[3]) if len(row) > 3 else ""
                email = clean(row[6]) if len(row) > 6 else ""
                hospitals.append({
                    "id": hop_id,
                    "nom": nom,
                    "localisation": region,
                    "departement": "",
                    "region": region,
                    "telephone": tel,
                    "contact": contact,
                    "email": email,
                    "type": "Hôpital Public (FHF)",
                })
                hop_id += 1

        # ── ESPIC ────────────────────────────────────────────────────────────
        elif 'ESPIC' in tab:
            for row in rows:
                if not row or len(row) < 3:
                    continue
                nom = clean(row[2]) if len(row) > 2 else ""
                if not nom or len(nom) < 3:
                    continue
                contact = clean(row[3]) if len(row) > 3 else ""
                email = clean(row[5]) if len(row) > 5 else ""
                hospitals.append({
                    "id": hop_id,
                    "nom": nom,
                    "localisation": "",
                    "departement": "",
                    "region": "France",
                    "telephone": "",
                    "contact": contact,
                    "email": email,
                    "type": "ESPIC",
                })
                hop_id += 1

        # ── EHPAD IDF ────────────────────────────────────────────────────────
        elif 'EHPAD' in tab:
            for row in rows:
                if not row or len(row) < 2:
                    continue
                nom = clean(row[1]) if len(row) > 1 else ""
                if not nom or len(nom) < 3:
                    continue
                adresse = clean(row[2]) if len(row) > 2 else ""
                ville = clean(row[3]) if len(row) > 3 else ""
                tel = clean(row[4]) if len(row) > 4 else ""
                hospitals.append({
                    "id": hop_id,
                    "nom": nom,
                    "localisation": f"{adresse}, {ville}".strip(", "),
                    "departement": "75" if "Paris" in ville else "",
                    "region": "Île-de-France",
                    "telephone": tel,
                    "contact": "",
                    "type": "EHPAD",
                })
                hop_id += 1

        # ── Maisons de retraite ───────────────────────────────────────────────
        elif 'Maisons' in tab or 'retraite' in tab.lower():
            for row in rows[1:]:  # Skip header row
                if not row or len(row) < 2:
                    continue
                nom = clean(row[1]) if len(row) > 1 else ""
                if not nom or len(nom) < 3:
                    continue
                tel = clean(row[2]) if len(row) > 2 else ""
                hospitals.append({
                    "id": hop_id,
                    "nom": nom,
                    "localisation": "",
                    "departement": "",
                    "region": "Île-de-France",
                    "telephone": tel,
                    "contact": "",
                    "type": "Maison de Retraite",
                })
                hop_id += 1

        # ── A classer / autres ────────────────────────────────────────────────
        elif 'classer' in tab.lower():
            for row in rows:
                if not row or len(row) < 2:
                    continue
                nom = clean(row[1]) if len(row) > 1 else ""
                if not nom or len(nom) < 3:
                    continue
                contact = clean(row[2]) if len(row) > 2 else ""
                tel = clean(row[3]) if len(row) > 3 else ""
                hospitals.append({
                    "id": hop_id,
                    "nom": nom,
                    "localisation": "",
                    "departement": "",
                    "region": "France",
                    "telephone": tel,
                    "contact": contact,
                    "type": "Établissement",
                })
                hop_id += 1

        # ── Base ILE DE FRANCE ────────────────────────────────────────────────
        elif 'ILE DE FRANCE' in tab.upper() or 'IDF' in tab.upper():
            for row in rows:
                if not row or len(row) < 4:
                    continue
                nom = clean(row[3]) if len(row) > 3 else ""
                if not nom or len(nom) < 3:
                    continue
                tel_raw = row[1] if len(row) > 1 else ""
                tel = str(int(tel_raw)) if isinstance(tel_raw, float) else clean(str(tel_raw)) if tel_raw else ""
                adresse = clean(row[5]) if len(row) > 5 else ""
                hospitals.append({
                    "id": hop_id,
                    "nom": nom,
                    "localisation": adresse,
                    "departement": "",
                    "region": "Île-de-France",
                    "telephone": tel,
                    "contact": "",
                    "type": clean(row[0]) if row[0] else "Établissement",
                })
                hop_id += 1

    return hospitals


def parse_offers(service, sheet_id: str) -> list:
    offers = []
    offer_id = 1
    sheet_names = get_sheet_names(service, sheet_id)

    for sheet_name in sheet_names:
        if sheet_name.strip().lower() in ["welcome", "accueil"]:
            continue

        spec = None
        for k, v in OFFER_SHEET_TO_SPEC.items():
            if k.strip().lower() == sheet_name.strip().lower():
                spec = v
                break
        if not spec:
            for k, v in OFFER_SHEET_TO_SPEC.items():
                if k.lower() in sheet_name.lower() or sheet_name.lower() in k.lower():
                    spec = v
                    break
        if not spec:
            spec = sheet_name.strip()

        rows = read_sheet(service, sheet_id, sheet_name)
        if len(rows) < 2:
            continue

        header_row = 1
        for i, row in enumerate(rows[:3]):
            row_str = " ".join(str(c).lower() for c in row)
            if "offre" in row_str or "département" in row_str or "structure" in row_str:
                header_row = i
                break

        for row in rows[header_row + 1:]:
            if not row or len(row) < 2:
                continue

            ref       = clean(row[0]) if len(row) > 0 else ""
            dept_raw  = clean(row[1]) if len(row) > 1 else ""
            structure = clean(row[2]) if len(row) > 2 else ""

            if sheet_name.strip() == "Recrutement":
                poste      = clean(row[3]) if len(row) > 3 else spec
                conditions = clean(row[4]) if len(row) > 4 else ""
                tarif = "Nous contacter"
                dates = ""
                type_contrat = "CDI/CDD"
            else:
                tarif      = clean(row[3]) if len(row) > 3 else "Nous contacter"
                dates      = clean(row[4]) if len(row) > 4 else ""
                conditions = clean(row[5]) if len(row) > 5 else ""
                poste      = ""
                type_contrat = "Intérim / Remplacement"

            if not dept_raw and not structure:
                continue

            dept_num = extract_dept(dept_raw)
            title = poste if poste and poste != spec else spec

            offers.append({
                "id": offer_id,
                "ref": ref,
                "specialite": spec,
                "titre": title,
                "departement": dept_num,
                "localisation": dept_raw,
                "structure": structure,
                "type_contrat": type_contrat,
                "tarif": tarif[:200] if tarif else "Nous contacter",
                "dates": dates[:500] if dates else "",
                "conditions": conditions[:1000] if conditions else "",
                "sheet": sheet_name,
                "hospital_id": None,
            })
            offer_id += 1

    return offers


# ── Main sync function ─────────────────────────────────────────────────────────

def sync_all(config: dict) -> dict:
    if not GOOGLE_AVAILABLE:
        return {"ok": False, "error": "google-auth library not installed."}

    sa_json = config.get("service_account_json")
    if not sa_json:
        return {"ok": False, "error": "Service account JSON not configured"}

    try:
        if isinstance(sa_json, str):
            sa_info = json.loads(sa_json)
        else:
            sa_info = sa_json
        service = get_sheets_service(sa_info)
    except Exception as e:
        return {"ok": False, "error": f"Authentication failed: {str(e)}"}

    results = {"ok": True, "synced": {}, "errors": {}, "timestamp": datetime.now().isoformat()}

    DATA.mkdir(parents=True, exist_ok=True)

    only = config.get("_only")
    if (not only or only == "doctors") and config.get("doctors_sheet_id"):
        try:
            doctors = parse_doctors(service, config["doctors_sheet_id"])
            existing = {}
            existing_path = DATA / "doctors.json"
            if existing_path.exists():
                for d in json.loads(existing_path.read_text(encoding="utf-8")):
                    existing[d["nom"]] = d.get("statut", "disponible")
            for d in doctors:
                if d["nom"] in existing:
                    d["statut"] = existing[d["nom"]]
            (DATA / "doctors.json").write_text(json.dumps(doctors, ensure_ascii=False, indent=2), encoding="utf-8")
            results["synced"]["doctors"] = len(doctors)
        except Exception as e:
            results["errors"]["doctors"] = str(e)
            results["ok"] = False

    if (not only or only == "hospitals") and config.get("hospitals_sheet_id"):
        try:
            hospitals = parse_hospitals(service, config["hospitals_sheet_id"])
            (DATA / "hospitals.json").write_text(json.dumps(hospitals, ensure_ascii=False, indent=2), encoding="utf-8")
            results["synced"]["hospitals"] = len(hospitals)
        except Exception as e:
            results["errors"]["hospitals"] = str(e)
            results["ok"] = False

    if (not only or only == "offers") and config.get("offers_sheet_id"):
        try:
            offers = parse_offers(service, config["offers_sheet_id"])
            (DATA / "offers.json").write_text(json.dumps(offers, ensure_ascii=False, indent=2), encoding="utf-8")
            results["synced"]["offers"] = len(offers)
        except Exception as e:
            results["errors"]["offers"] = str(e)
            results["ok"] = False

    return results




