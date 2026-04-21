"""
sheets_sync.py — Google Sheets integration for MedMatch
Reads doctors, hospitals and offers from Google Sheets using a Service Account.
"""

import json, re, os
from pathlib import Path
from datetime import datetime
from typing import Optional

try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

DATA = Path(__file__).parent.parent / "data"
CONFIG_FILE = DATA / "sheets_config.json"

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

# ── Sheet name → specialite mapping (doctors vivier) ──────────────────────────
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
    if CONFIG_FILE.exists():
        return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
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
    CONFIG_FILE.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")


# ── Google Sheets client ───────────────────────────────────────────────────────

def get_sheets_service(service_account_info: dict):
    if not GOOGLE_AVAILABLE:
        raise RuntimeError("google-auth not installed. Run: pip install google-auth google-api-python-client")
    creds = Credentials.from_service_account_info(service_account_info, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds, cache_discovery=False)

def get_sheet_names(service, spreadsheet_id: str) -> list:
    meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    return [s["properties"]["title"] for s in meta.get("sheets", [])]

def read_sheet(service, spreadsheet_id: str, sheet_name: str) -> list:
    """Returns list of rows (each row is a list of cell values)."""
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
    """Parse the Vivier Médical spreadsheet (multi-tab)."""
    doctors = []
    doc_id = 1
    sheet_names = get_sheet_names(service, sheet_id)

    for sheet_name in sheet_names:
        # Match sheet to specialty (strip trailing spaces)
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

        # Find header row
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

            # Handle PARAMED sheet (different column order: email, spec, nom, tel, cp)
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

            # Fix Urgence column swap (cp and notes were swapped in original)
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
    """Parse the établissements conventionnés spreadsheet."""
    hospitals = []
    sheet_names = get_sheet_names(service, sheet_id)
    sheet_name = sheet_names[0]  # First sheet
    rows = read_sheet(service, sheet_id, sheet_name)

    hop_id = 1
    for row in rows:
        if not row or not row[0]:
            continue
        name = clean(row[0])
        loc  = clean(row[1]) if len(row) > 1 else ""
        if not name or "offre" in name.lower() or "centre hospitalier" not in name.lower() and len(name) < 5:
            # Skip header / junk rows — keep only actual hospital names
            if len(name) < 5:
                continue
        dept = extract_dept(loc)
        region = loc.split("—")[-1].strip() if "—" in loc else loc
        hospitals.append({
            "id": hop_id,
            "nom": name.replace("\n", "").strip(),
            "localisation": loc,
            "departement": dept,
            "region": region,
        })
        hop_id += 1

    return hospitals


def parse_offers(service, sheet_id: str) -> list:
    """Parse the OFFRES LASKA spreadsheet (multi-tab)."""
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
            # Try partial match
            for k, v in OFFER_SHEET_TO_SPEC.items():
                if k.lower() in sheet_name.lower() or sheet_name.lower() in k.lower():
                    spec = v
                    break
        if not spec:
            spec = sheet_name.strip()

        rows = read_sheet(service, sheet_id, sheet_name)
        if len(rows) < 2:
            continue

        # Find header row
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
    """
    Full sync: fetch all 3 sheets and save to data/*.json
    Returns a status dict with counts and any errors.
    """
    if not GOOGLE_AVAILABLE:
        return {"ok": False, "error": "google-auth library not installed. Run: pip install google-auth google-api-python-client"}

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

    # Sync doctors
    if config.get("doctors_sheet_id"):
        try:
            doctors = parse_doctors(service, config["doctors_sheet_id"])
            # Preserve existing statuses and call history
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

    # Sync hospitals
    if config.get("hospitals_sheet_id"):
        try:
            hospitals = parse_hospitals(service, config["hospitals_sheet_id"])
            (DATA / "hospitals.json").write_text(json.dumps(hospitals, ensure_ascii=False, indent=2), encoding="utf-8")
            results["synced"]["hospitals"] = len(hospitals)
        except Exception as e:
            results["errors"]["hospitals"] = str(e)
            results["ok"] = False

    # Sync offers
    if config.get("offers_sheet_id"):
        try:
            offers = parse_offers(service, config["offers_sheet_id"])
            (DATA / "offers.json").write_text(json.dumps(offers, ensure_ascii=False, indent=2), encoding="utf-8")
            results["synced"]["offers"] = len(offers)
        except Exception as e:
            results["errors"]["offers"] = str(e)
            results["ok"] = False

    return results
