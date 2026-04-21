import React, { useState, useEffect } from 'react'
import { Briefcase, Plus, Trash2, Search, X, Phone, ChevronDown, ChevronUp, MapPin, Calendar, Info } from 'lucide-react'
import { offersAPI, doctorsAPI } from '../api'
import { useNavigate } from 'react-router-dom'

const TYPE_COLORS = {
  'Intérim / Remplacement': 'yellow',
  'CDI/CDD': 'green',
  'Interim / Remplacement': 'yellow',
}

function OfferCard({ offer, onDelete, onMatch }) {
  const [expanded, setExpanded] = useState(false)
  const color = TYPE_COLORS[offer.type_contrat] || 'gray'

  return (
    <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,overflow:'hidden',display:'flex',flexDirection:'column'}}>
      {/* Card header */}
      <div style={{padding:'16px 20px',flex:1}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
            {offer.ref && <span style={{fontSize:11,fontFamily:'monospace',background:'#f3f4f6',padding:'2px 8px',borderRadius:4,color:'#374151'}}>{offer.ref}</span>}
            <span className={`badge badge-${color}`}>{offer.type_contrat}</span>
          </div>
          <button onClick={()=>onDelete(offer.id)} style={{background:'none',border:'none',color:'#dc2626',cursor:'pointer',padding:4}}><Trash2 size={14}/></button>
        </div>

        <div style={{fontWeight:600,fontSize:15,marginBottom:6}}>{offer.titre !== offer.specialite ? offer.titre : offer.specialite}</div>

        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'#2563eb',marginBottom:4}}>
          <MapPin size={13}/>{offer.localisation || '—'}
        </div>
        {offer.structure && <div style={{fontSize:13,color:'#6b7280',marginBottom:4}}>{offer.structure}</div>}

        {offer.dates && (
          <div style={{display:'flex',alignItems:'flex-start',gap:6,fontSize:12,color:'#059669',background:'#f0fdf4',borderRadius:6,padding:'6px 10px',marginTop:8,whiteSpace:'pre-line'}}>
            <Calendar size={12} style={{marginTop:2,flexShrink:0}}/><span style={{lineHeight:1.5}}>{offer.dates.substring(0,200)}{offer.dates.length>200?'…':''}</span>
          </div>
        )}

        {offer.conditions && (
          <div style={{marginTop:8}}>
            <button onClick={()=>setExpanded(!expanded)} style={{background:'none',border:'none',cursor:'pointer',fontSize:12,color:'#6b7280',display:'flex',alignItems:'center',gap:4,padding:0}}>
              <Info size={12}/> Détails {expanded?<ChevronUp size={12}/>:<ChevronDown size={12}/>}
            </button>
            {expanded && (
              <div style={{marginTop:8,fontSize:12,color:'#374151',background:'#f9fafb',borderRadius:6,padding:10,lineHeight:1.6,maxHeight:200,overflowY:'auto',whiteSpace:'pre-line'}}>
                {offer.conditions.substring(0,800)}{offer.conditions.length>800?'…':''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div style={{padding:'10px 16px',borderTop:'1px solid #f3f4f6',display:'flex',gap:8}}>
        <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={()=>onMatch(offer)}>
          <Search size={13}/> Trouver qui appeler
        </button>
      </div>
    </div>
  )
}

function CreateModal({ specialites, onClose, onCreated }) {
  const [form, setForm] = useState({
    specialite:'', titre:'', localisation:'', departement:'',
    structure:'', type_contrat:'Intérim / Remplacement',
    tarif:'Nous contacter', dates:'', conditions:'', ref:''
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.specialite || !form.titre) return
    setSaving(true)
    await offersAPI.create(form)
    setSaving(false); onCreated(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Nouvelle offre</h3>
          <button className="btn-ghost" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="modal-body">
          <div className="grid-2" style={{marginBottom:16}}>
            <div className="form-group">
              <label>Spécialité *</label>
              <select value={form.specialite} onChange={e=>setForm(f=>({...f,specialite:e.target.value}))}>
                <option value="">— Choisir —</option>
                {specialites.map(s=><option key={s.specialite} value={s.specialite}>{s.specialite}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Titre du poste *</label>
              <input type="text" value={form.titre} onChange={e=>setForm(f=>({...f,titre:e.target.value}))} placeholder="Ex: Médecin urgentiste"/>
            </div>
            <div className="form-group">
              <label>Localisation</label>
              <input type="text" value={form.localisation} onChange={e=>setForm(f=>({...f,localisation:e.target.value}))} placeholder="Ex: Aisne (02)"/>
            </div>
            <div className="form-group">
              <label>Département (n°)</label>
              <input type="text" value={form.departement} onChange={e=>setForm(f=>({...f,departement:e.target.value}))} placeholder="02, 33, 75..."/>
            </div>
            <div className="form-group">
              <label>Structure</label>
              <input type="text" value={form.structure} onChange={e=>setForm(f=>({...f,structure:e.target.value}))} placeholder="Hôpital public, Clinique..."/>
            </div>
            <div className="form-group">
              <label>Type de contrat</label>
              <select value={form.type_contrat} onChange={e=>setForm(f=>({...f,type_contrat:e.target.value}))}>
                <option>Intérim / Remplacement</option>
                <option>CDI/CDD</option>
                <option>Gardes ponctuelles</option>
              </select>
            </div>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label>Dates de disponibilité</label>
              <textarea rows={3} value={form.dates} onChange={e=>setForm(f=>({...f,dates:e.target.value}))} placeholder="Ex: Garde 24h le 15 avril..."/>
            </div>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label>Conditions / Description</label>
              <textarea rows={4} value={form.conditions} onChange={e=>setForm(f=>({...f,conditions:e.target.value}))} placeholder="Détails du poste, équipement, profil recherché..."/>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={save} disabled={saving||!form.specialite||!form.titre}>{saving?'Création...':'+ Créer'}</button>
        </div>
      </div>
    </div>
  )
}

export default function Offers() {
  const [offers, setOffers] = useState([])
  const [specialites, setSpecialites] = useState([])
  const [filters, setFilters] = useState({ search:'', specialite:'', type_contrat:'' })
  const [showCreate, setShowCreate] = useState(false)
  const [total, setTotal] = useState(0)
  const navigate = useNavigate()

  function load() {
    offersAPI.list({ specialite:filters.specialite||undefined, search:filters.search||undefined,
                     type_contrat:filters.type_contrat||undefined })
      .then(d=>{ setOffers(d.offers); setTotal(d.total) })
  }

  useEffect(()=>{ offersAPI.specialites().then(setSpecialites) },[])
  useEffect(()=>{ load() },[filters])

  async function deleteOffer(id) {
    if (!confirm('Supprimer cette offre ?')) return
    await offersAPI.delete(id); load()
  }

  function goMatch(offer) {
    navigate(`/matching?offer_id=${offer.id}`)
  }

  // Group by specialty
  const bySpec = {}
  offers.forEach(o => {
    if (!bySpec[o.specialite]) bySpec[o.specialite] = []
    bySpec[o.specialite].push(o)
  })

  return (
    <div style={{padding:32}}>
      <div style={{marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700}}>Offres de poste</h1>
          <p style={{color:'var(--muted)',marginTop:4}}>{total} offre{total!==1?'s':''} — issues de votre fichier LASKA CORPORATE MEDICAL V2.0</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowCreate(true)}><Plus size={16}/> Nouvelle offre</button>
      </div>

      {/* Filters */}
      <div className="card" style={{padding:16,marginBottom:20,display:'flex',gap:12,flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input style={{paddingLeft:32,width:'100%'}} type="text" placeholder="Rechercher ref, lieu, poste..." value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))}/>
        </div>
        <select value={filters.specialite} onChange={e=>setFilters(f=>({...f,specialite:e.target.value}))}>
          <option value="">Toutes spécialités</option>
          {specialites.map(s=><option key={s.specialite} value={s.specialite}>{s.specialite} ({s.count})</option>)}
        </select>
        <select value={filters.type_contrat} onChange={e=>setFilters(f=>({...f,type_contrat:e.target.value}))}>
          <option value="">Tous types</option>
          <option value="Intérim">Intérim / Remplacement</option>
          <option value="CDI">CDI/CDD</option>
        </select>
      </div>

      {/* Grouped by specialty */}
      {Object.entries(bySpec).length === 0
        ? <div className="empty-state card" style={{padding:60}}><Briefcase size={48}/><p style={{marginTop:12}}>Aucune offre trouvée</p></div>
        : Object.entries(bySpec).sort((a,b)=>b[1].length-a[1].length).map(([spec,offs])=>(
          <div key={spec} style={{marginBottom:28}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <h3 style={{fontSize:15,fontWeight:700}}>{spec}</h3>
              <span className="badge badge-blue">{offs.length} offre{offs.length>1?'s':''}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:12}}>
              {offs.map(o=>(
                <OfferCard key={o.id} offer={o} onDelete={deleteOffer} onMatch={goMatch}/>
              ))}
            </div>
          </div>
        ))
      }

      {showCreate && <CreateModal specialites={specialites} onClose={()=>setShowCreate(false)} onCreated={load}/>}
    </div>
  )
}
