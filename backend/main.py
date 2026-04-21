from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
import json, re, os

app = FastAPI(title="MedMatch — Laska Corporate Medical", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Support custom data dir via env var (used by Electron)
_data_env = os.environ.get("MEDMATCH_DATA_DIR")
DATA = Path(_data_env) if _data_env else Path(__file__).parent.parent / "data"
DATA.mkdir(parents=True, exist_ok=True)

def load(f): 
    p = DATA / f
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []

def save(f, data):
    (DATA / f).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

doctors_db   = load("doctors.json")
hospitals_db = load("hospitals.json")
offers_db    = load("offers.json")
calls_db     = load("calls.json")

class CallLog(BaseModel):
    doctor_id: int
    offer_id: Optional[int] = None
    statut: str
    notes: Optional[str] = ""

class DoctorUpdate(BaseModel):
    statut: Optional[str] = None
    notes: Optional[str] = None
    tel: Optional[str] = None
    mail: Optional[str] = None

class OfferCreate(BaseModel):
    specialite: str
    titre: str
    localisation: Optional[str] = ""
    departement: Optional[str] = ""
    structure: Optional[str] = ""
    type_contrat: Optional[str] = "Interim / Remplacement"
    tarif: Optional[str] = "Nous contacter"
    dates: Optional[str] = ""
    conditions: Optional[str] = ""
    ref: Optional[str] = ""

def score_doctor(doctor: dict, offer: dict, calls: list) -> dict:
    score = 0
    reasons = []
    warnings = []
    notes_l = (doctor.get("notes") or "").lower()
    cp = str(doctor.get("code_postal") or "").strip()
    dept = str(offer.get("departement") or "").strip()
    loc_l = (offer.get("localisation") or "").lower()

    if doctor["specialite"] == offer["specialite"]:
        score += 60
        reasons.append(f"Specialite exacte : {offer['specialite']}")
    else:
        warnings.append(f"Specialite differente ({doctor['specialite']})")

    cp_num = re.sub(r'\D', '', cp)[:2]
    if dept and cp_num and cp_num == dept[:2]:
        score += 25
        reasons.append(f"Meme departement ({dept})")
    elif dept and dept in notes_l:
        score += 18
        reasons.append("Departement dans les notes")
    elif loc_l:
        region_words = [w for w in re.split(r'[\s\-\(\)]+', loc_l) if len(w) > 3]
        if any(w in notes_l for w in region_words):
            score += 12
            reasons.append("Region compatible")
        elif cp_num:
            score += 4

    NON_DISPO = [r"non dispo", r"pas dispo", r"pas inter", r"n.est pas dispo",
                 r"pas disponible", r"occup", r"planning charg", r"complet pour",
                 r"sous contrat", r"en vacances"]
    DISPO = [r"\bdispo\b", r"disponible", r"interess", r"ouvert"]

    if any(re.search(p, notes_l) for p in NON_DISPO):
        score -= 25
        warnings.append("Semble non disponible")
    elif any(re.search(p, notes_l) for p in DISPO):
        score += 15
        reasons.append("Disponibilite signalee")

    contrat_l = (offer.get("type_contrat") or "").lower()
    if "interim" in contrat_l or "remplacement" in contrat_l:
        if any(p in notes_l for p in ["interim", "courte duree", "mission", "garde", "remplacement"]):
            score += 10
            reasons.append("Preference interim confirmee")
    elif "cdi" in contrat_l and "cdi" in notes_l:
        score += 10

    if any(p in notes_l for p in ["exp positive", "experiences positives"]):
        score += 5
        reasons.append("Experiences positives en interim")

    if doctor.get("tel") and len(str(doctor["tel"])) >= 8:
        score += 3
    if doctor.get("mail"):
        score += 2

    doc_calls = [c for c in calls if c.get("doctor_id") == doctor.get("id")]
    if doc_calls:
        last = sorted(doc_calls, key=lambda x: x.get("created_at", ""))[-1]
        if last["statut"] == "pas_interessé":
            score -= 40
            warnings.append("Precedemment pas interesse")
        elif last["statut"] == "place":
            score -= 50
            warnings.append("Deja place")
        elif last["statut"] == "interesse":
            score += 15
            reasons.append("Deja marque interesse !")
        elif last["statut"] == "rappel":
            score += 8
            reasons.append("A rappeler")

    score = max(0, min(100, score))
    level = "high" if score >= 70 else "medium" if score >= 40 else "low"
    return {"score": score, "level": level, "reasons": reasons, "warnings": warnings}


@app.get("/api/doctors")
def get_doctors(specialite: Optional[str]=None, search: Optional[str]=None,
                statut: Optional[str]=None, limit: int=300):
    r = doctors_db
    if specialite: r = [d for d in r if d["specialite"]==specialite]
    if search:
        q=search.lower()
        r=[d for d in r if q in d["nom"].lower() or q in (d.get("mail") or "").lower() or q in (d.get("notes") or "").lower()]
    if statut: r=[d for d in r if d.get("statut")==statut]
    return {"total": len(r), "doctors": r[:limit]}

@app.get("/api/doctors/{doctor_id}")
def get_doctor(doctor_id: int):
    doc = next((d for d in doctors_db if d["id"]==doctor_id), None)
    if not doc: raise HTTPException(404)
    calls = sorted([c for c in calls_db if c.get("doctor_id")==doctor_id],
                   key=lambda x: x.get("created_at",""), reverse=True)
    return {**doc, "call_history": calls}

@app.patch("/api/doctors/{doctor_id}")
def update_doctor(doctor_id: int, update: DoctorUpdate):
    doc = next((d for d in doctors_db if d["id"]==doctor_id), None)
    if not doc: raise HTTPException(404)
    for k,v in update.dict(exclude_none=True).items(): doc[k]=v
    save("doctors.json", doctors_db)
    return doc

@app.get("/api/specialites")
def get_specialites():
    from collections import Counter
    c = Counter(d["specialite"] for d in doctors_db)
    return [{"specialite":s,"count":n} for s,n in c.most_common()]

@app.get("/api/hospitals")
def get_hospitals(search: Optional[str]=None, region: Optional[str]=None):
    r = hospitals_db
    if search:
        q=search.lower()
        r=[h for h in r if q in h["nom"].lower() or q in h["localisation"].lower()]
    if region: r=[h for h in r if region in h.get("region","")]
    return {"total":len(r),"hospitals":r}

@app.get("/api/offers")
def get_offers(specialite: Optional[str]=None, search: Optional[str]=None,
               type_contrat: Optional[str]=None, departement: Optional[str]=None):
    r = offers_db
    if specialite: r=[o for o in r if o["specialite"]==specialite]
    if search:
        q=search.lower()
        r=[o for o in r if q in o.get("titre","").lower() or q in o.get("localisation","").lower()
           or q in o.get("ref","").lower() or q in o.get("conditions","").lower()]
    if type_contrat: r=[o for o in r if type_contrat in o.get("type_contrat","")]
    if departement: r=[o for o in r if o.get("departement","")==departement]
    return {"total":len(r),"offers":r}

@app.get("/api/offers/{offer_id}")
def get_offer(offer_id: int):
    o = next((o for o in offers_db if o["id"]==offer_id), None)
    if not o: raise HTTPException(404)
    return o

@app.post("/api/offers")
def create_offer(offer: OfferCreate):
    nid = max((o["id"] for o in offers_db), default=0)+1
    new = {"id":nid,"created_at":datetime.now().isoformat(),**offer.dict()}
    offers_db.append(new); save("offers.json",offers_db)
    return new

@app.delete("/api/offers/{offer_id}")
def delete_offer(offer_id: int):
    global offers_db
    offers_db=[o for o in offers_db if o["id"]!=offer_id]
    save("offers.json",offers_db)
    return {"ok":True}

@app.get("/api/offer-specialites")
def offer_specialites():
    from collections import Counter
    c=Counter(o["specialite"] for o in offers_db)
    return [{"specialite":s,"count":n} for s,n in c.most_common()]

# ── MATCHING ────────────────────────────────────────────────────────────────
@app.get("/api/match/offer/{offer_id}")
def match_offer(offer_id: int, limit: int=50):
    offer = next((o for o in offers_db if o["id"]==offer_id), None)
    if not offer: raise HTTPException(404)
    results=[]
    for doc in doctors_db:
        s=score_doctor(doc, offer, calls_db)
        doc_calls=[c for c in calls_db if c.get("doctor_id")==doc["id"]]
        last=sorted(doc_calls,key=lambda x:x.get("created_at",""))[-1] if doc_calls else None
        results.append({
            "doctor":doc,"score":s["score"],"level":s["level"],
            "reasons":s["reasons"],"warnings":s["warnings"],
            "already_called":len(doc_calls)>0,"call_count":len(doc_calls),
            "last_call_status":last["statut"] if last else None,
            "last_call_date":last["created_at"] if last else None,
        })
    results.sort(key=lambda x:x["score"],reverse=True)
    top=[r for r in results if r["score"]>10]
    return {"offer":offer,"total":len(top),"matches":top[:limit]}

@app.get("/api/match/doctor/{doctor_id}")
def match_doctor(doctor_id: int, limit: int=20):
    doc = next((d for d in doctors_db if d["id"]==doctor_id), None)
    if not doc: raise HTTPException(404)
    results=[]
    for offer in offers_db:
        s=score_doctor(doc, offer, calls_db)
        if s["score"]>20:
            results.append({"offer":offer,"score":s["score"],"level":s["level"],
                             "reasons":s["reasons"],"warnings":s["warnings"]})
    results.sort(key=lambda x:x["score"],reverse=True)
    return {"doctor":doc,"total":len(results),"matching_offers":results[:limit]}

@app.get("/api/match/overview")
def match_overview(specialite: Optional[str]=None):
    from collections import Counter
    spec_doc_count = Counter(d["specialite"] for d in doctors_db)
    filtered = [o for o in offers_db if (not specialite or o["specialite"]==specialite)]
    results=[]
    for offer in filtered:
        doc_count=spec_doc_count.get(offer["specialite"],0)
        results.append({"offer":offer,"potential_doctors":doc_count})
    results.sort(key=lambda x:x["potential_doctors"],reverse=True)
    return {"total":len(results),"results":results}

# ── CALLS ───────────────────────────────────────────────────────────────────
@app.get("/api/calls")
def get_calls(doctor_id: Optional[int]=None, offer_id: Optional[int]=None,
              statut: Optional[str]=None, limit: int=500):
    r=calls_db
    if doctor_id: r=[c for c in r if c.get("doctor_id")==doctor_id]
    if offer_id:  r=[c for c in r if c.get("offer_id")==offer_id]
    if statut:    r=[c for c in r if c.get("statut")==statut]
    enriched=[]
    for c in sorted(r,key=lambda x:x.get("created_at",""),reverse=True)[:limit]:
        doc  =next((d for d in doctors_db if d["id"]==c.get("doctor_id")),{})
        offer=next((o for o in offers_db  if o["id"]==c.get("offer_id")),None)
        enriched.append({**c,
            "doctor_nom":doc.get("nom","—"),"doctor_tel":doc.get("tel",""),
            "doctor_mail":doc.get("mail",""),"doctor_specialite":doc.get("specialite",""),
            "offer_ref":offer.get("ref","—") if offer else "—",
            "offer_titre":offer.get("titre","—") if offer else "—",
            "offer_localisation":offer.get("localisation","") if offer else "",
        })
    return {"total":len(enriched),"calls":enriched}

@app.post("/api/calls")
def log_call(call: CallLog):
    nid=max((c["id"] for c in calls_db),default=0)+1
    new={"id":nid,"created_at":datetime.now().isoformat(),**call.dict()}
    calls_db.append(new); save("calls.json",calls_db)
    doc=next((d for d in doctors_db if d["id"]==call.doctor_id),None)
    if doc:
        m={"place":"place","pas_interesse":"pas_interesse",
           "interesse":"interesse","appele":"contacte","rappel":"contacte"}
        if call.statut in m: doc["statut"]=m[call.statut]; save("doctors.json",doctors_db)
    return new

@app.delete("/api/calls/{call_id}")
def delete_call(call_id: int):
    global calls_db
    calls_db=[c for c in calls_db if c["id"]!=call_id]
    save("calls.json",calls_db); return {"ok":True}

@app.get("/api/stats")
def get_stats():
    from collections import Counter
    return {
        "doctors_total":len(doctors_db),
        "hospitals_total":len(hospitals_db),
        "offers_total":len(offers_db),
        "calls_total":len(calls_db),
        "placed":sum(1 for c in calls_db if c["statut"]=="place"),
        "interested":sum(1 for c in calls_db if c["statut"]=="interesse"),
        "to_recall":sum(1 for c in calls_db if c["statut"]=="rappel"),
        "calls_by_specialty":dict(Counter(
            next((d["specialite"] for d in doctors_db if d["id"]==c.get("doctor_id")),"?")
            for c in calls_db).most_common(10)),
        "recent_calls":sorted(calls_db,key=lambda x:x.get("created_at",""),reverse=True)[:10],
    }

# ── Network info endpoint ──────────────────────────────────────────────────────
import socket

@app.get("/api/network")
def get_network_info():
    """Returns the local IP so the frontend can display team access URL."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = "localhost"
    return {
        "local_ip": local_ip,
        "port": 8000,
        "team_url": f"http://{local_ip}:8000",
        "local_url": "http://localhost:8000"
    }

# ── Serve built frontend ────────────────────────────────────────────────────────
# Frontend is built into backend/static via: npm run build
static_dir = Path(__file__).parent / "static"
if not static_dir.exists():
    static_dir.mkdir(exist_ok=True)
    # Create a simple placeholder if not built yet
    (static_dir / "index.html").write_text("""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>MedMatch</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:#fff;}
.box{text-align:center;padding:40px;background:#1e293b;border-radius:16px;max-width:500px;}
h1{color:#60a5fa;margin-bottom:16px;}code{background:#0f172a;padding:4px 10px;border-radius:6px;font-size:14px;}
</style></head><body><div class="box">
<h1>MedMatch</h1><p>Le frontend n'a pas encore été compilé.</p>
<p>Dans le dossier <code>frontend</code>, lancez :<br><br>
<code>npm install</code><br><code>npm run build</code></p>
<p style="margin-top:20px;font-size:13px;color:#64748b;">L'API backend tourne correctement.<br>
<a href="/docs" style="color:#60a5fa;">Voir la documentation API</a></p>
</div></body></html>""", encoding="utf-8")

app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)


# ══════════════════════════════════════════════════════════════════════════════
# GOOGLE SHEETS SYNC
# ══════════════════════════════════════════════════════════════════════════════
from sheets_sync import load_config, save_config, sync_all, GOOGLE_AVAILABLE

class SheetsConfig(BaseModel):
    doctors_sheet_id: Optional[str] = ""
    hospitals_sheet_id: Optional[str] = ""
    offers_sheet_id: Optional[str] = ""
    service_account_json: Optional[str] = ""
    auto_sync: Optional[bool] = False

@app.get("/api/sheets/config")
def get_sheets_config():
    config = load_config()
    # Never expose the full service account key in the response
    safe = {k: v for k, v in config.items() if k != "service_account_json"}
    safe["has_credentials"] = bool(config.get("service_account_json"))
    return safe

@app.post("/api/sheets/config")
def update_sheets_config(cfg: SheetsConfig):
    config = load_config()
    if cfg.doctors_sheet_id is not None:
        config["doctors_sheet_id"] = cfg.doctors_sheet_id
    if cfg.hospitals_sheet_id is not None:
        config["hospitals_sheet_id"] = cfg.hospitals_sheet_id
    if cfg.offers_sheet_id is not None:
        config["offers_sheet_id"] = cfg.offers_sheet_id
    if cfg.service_account_json:
        # Validate it's valid JSON
        import json as _json
        try:
            _json.loads(cfg.service_account_json)
            config["service_account_json"] = cfg.service_account_json
        except Exception:
            raise HTTPException(400, "Invalid JSON for service account")
    if cfg.auto_sync is not None:
        config["auto_sync"] = cfg.auto_sync
    save_config(config)
    return {"ok": True, "has_credentials": bool(config.get("service_account_json"))}

@app.post("/api/sheets/sync")
def trigger_sync():
    config = load_config()
    result = sync_all(config)
    # Update last sync info
    config["last_sync"] = result.get("timestamp")
    config["last_sync_status"] = "ok" if result["ok"] else "error"
    save_config(config)
    # Reload in-memory data if sync succeeded
    if result["ok"]:
        global doctors_db, hospitals_db, offers_db
        if "doctors" in result.get("synced", {}):
            doctors_db = load("doctors.json")
        if "hospitals" in result.get("synced", {}):
            hospitals_db = load("hospitals.json")
        if "offers" in result.get("synced", {}):
            offers_db = load("offers.json")
    return result

@app.get("/api/sheets/status")
def sheets_status():
    config = load_config()
    return {
        "configured": bool(config.get("service_account_json")),
        "doctors_sheet_id": config.get("doctors_sheet_id", ""),
        "hospitals_sheet_id": config.get("hospitals_sheet_id", ""),
        "offers_sheet_id": config.get("offers_sheet_id", ""),
        "auto_sync": config.get("auto_sync", False),
        "last_sync": config.get("last_sync"),
        "last_sync_status": config.get("last_sync_status"),
        "google_library_available": GOOGLE_AVAILABLE,
    }
