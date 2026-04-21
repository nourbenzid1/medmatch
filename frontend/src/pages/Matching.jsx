import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Phone, Mail, ChevronDown, ChevronUp, Check, AlertTriangle, X, Calendar, MapPin, Building } from 'lucide-react'
import { matchAPI, offersAPI, doctorsAPI, callsAPI } from '../api'

const STATUTS = [
  {value:'appele',label:'Appelé',color:'#2563eb'},
  {value:'interesse',label:'Intéressé ✓',color:'#16a34a'},
  {value:'pas_interesse',label:'Pas intéressé',color:'#dc2626'},
  {value:'rappel',label:'À rappeler ⏰',color:'#d97706'},
  {value:'place',label:'Placé ✓',color:'#7c3aed'},
]

function ScoreBadge({score,level}) {
  const c=level==='high'?'#16a34a':level==='medium'?'#d97706':'#dc2626'
  const bg=level==='high'?'#f0fdf4':level==='medium'?'#fffbeb':'#fef2f2'
  return (
    <div style={{textAlign:'center',minWidth:56}}>
      <div style={{fontSize:22,fontWeight:700,color:c}}>{score}%</div>
      <div style={{fontSize:10,background:bg,color:c,borderRadius:4,padding:'1px 6px',marginTop:2}}>
        {level==='high'?'Fort':level==='medium'?'Moyen':'Faible'}
      </div>
    </div>
  )
}

function CallModal({match,offer,onClose,onSaved}) {
  const [statut,setStatut]=useState('appele')
  const [notes,setNotes]=useState('')
  const [saving,setSaving]=useState(false)
  const doc=match.doctor

  async function save() {
    setSaving(true)
    await callsAPI.log({doctor_id:doc.id,offer_id:offer?.id||null,statut,notes})
    setSaving(false); onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>📞 Préparer l'appel</h3>
          <button className="btn-ghost" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="modal-body">
          {/* Doctor */}
          <div style={{background:'#f8fafc',borderRadius:10,padding:16,marginBottom:16}}>
            <div style={{fontWeight:600,fontSize:16,marginBottom:8}}>{doc.nom}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:14,fontSize:14}}>
              <span>📞 <strong>{doc.tel||'Pas de tél.'}</strong></span>
              <span>✉️ {doc.mail||'Pas de mail'}</span>
              <span style={{color:'#2563eb'}}>🏥 {doc.specialite}</span>
              {doc.code_postal&&<span>📍 CP {doc.code_postal}</span>}
            </div>
          </div>

          {/* Offer */}
          {offer&&(
            <div style={{background:'#eff6ff',borderRadius:10,padding:14,marginBottom:16,borderLeft:'3px solid #2563eb'}}>
              <div style={{fontSize:13,fontWeight:600,color:'#1d4ed8',marginBottom:4}}>Offre à proposer</div>
              <div style={{fontSize:14,fontWeight:500}}>{offer.ref&&<span style={{fontFamily:'monospace',fontSize:12,marginRight:8,color:'#6b7280'}}>{offer.ref}</span>}{offer.titre}</div>
              <div style={{display:'flex',gap:12,fontSize:13,color:'#4b5563',marginTop:4}}>
                <span><MapPin size={12} style={{marginRight:3}}/>{offer.localisation}</span>
                {offer.structure&&<span><Building size={12} style={{marginRight:3}}/>{offer.structure}</span>}
              </div>
              {offer.dates&&<div style={{marginTop:8,fontSize:12,color:'#059669',background:'#f0fdf4',borderRadius:6,padding:'6px 10px',whiteSpace:'pre-line'}}>{offer.dates.substring(0,300)}</div>}
            </div>
          )}

          {/* Script */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Script d'appel</div>
            <div style={{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:14,fontSize:13,lineHeight:1.9}}>
              <p>1. <strong>Présentation</strong> — "Bonjour Dr {doc.nom.split(' ').slice(-1)[0]}, je vous appelle de la part de Laska Corporate Medical."</p>
              <p>2. <strong>Disponibilité</strong> — "Êtes-vous toujours disponible pour des missions ?"</p>
              {offer&&<p>3. <strong>Offre</strong> — "J'ai une offre qui correspond à votre profil : {offer.titre} à {offer.localisation} ({offer.type_contrat})."</p>}
              <p>{offer?'4':'3'}. <strong>Zone géo</strong> — "Est-ce que la localisation vous convient ?"</p>
              <p>{offer?'5':'4'}. <strong>Tarif</strong> — "{offer?.tarif||'Nous contacter pour la rémunération'}."</p>
              <p>{offer?'6':'5'}. <strong>Suite</strong> — "Je vous envoie les détails par mail si vous êtes intéressé."</p>
            </div>
          </div>

          {/* Score analysis */}
          {(match.reasons.length>0||match.warnings.length>0)&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Pourquoi ce match ?</div>
              {match.reasons.map((r,i)=><div key={i} style={{fontSize:12,color:'#15803d',display:'flex',gap:6,marginBottom:3}}><Check size={12} style={{flexShrink:0,marginTop:1}}/>{r}</div>)}
              {match.warnings.map((w,i)=><div key={i} style={{fontSize:12,color:'#d97706',display:'flex',gap:6,marginBottom:3}}><AlertTriangle size={12} style={{flexShrink:0,marginTop:1}}/>{w}</div>)}
            </div>
          )}

          {/* Vivier notes */}
          {doc.notes&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Notes du vivier</div>
              <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:12,fontSize:13,color:'#78350f',lineHeight:1.5}}>{doc.notes}</div>
            </div>
          )}

          <div className="divider"/>
          <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>Enregistrer le résultat</div>
          <div className="grid-2">
            <div className="form-group">
              <label>Statut</label>
              <select value={statut} onChange={e=>setStatut(e.target.value)}>
                {STATUTS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <input type="text" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Rappeler jeudi, intéressé par..."/>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Enregistrement...':'✓ Confirmer l\'appel'}</button>
        </div>
      </div>
    </div>
  )
}

function MatchCard({match,offer,onRefresh}) {
  const [expanded,setExpanded]=useState(false)
  const [showModal,setShowModal]=useState(false)
  const doc=match.doctor
  const hue=doc.nom.charCodeAt(0)*5%360
  const scColors={high:'#16a34a',medium:'#d97706',low:'#dc2626'}
  const statusLabels={interesse:'Intéressé ✓',place:'Placé',pas_interesse:'Pas intéressé',appele:'Appelé',rappel:'À rappeler ⏰'}
  const statusColors={interesse:'#16a34a',place:'#7c3aed',pas_interesse:'#dc2626',appele:'#2563eb',rappel:'#d97706'}
  const last=match.last_call_status

  function initials(n){const p=n.trim().split(/\s+/);return(p[0][0]+(p[1]?p[1][0]:'')).toUpperCase()}

  return (
    <>
      <div className="card" style={{marginBottom:8,overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',padding:'12px 18px',gap:12,cursor:'pointer'}} onClick={()=>setExpanded(!expanded)}>
          <div style={{width:40,height:40,borderRadius:'50%',flexShrink:0,background:`hsl(${hue},65%,90%)`,color:`hsl(${hue},50%,35%)`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13}}>
            {initials(doc.nom)}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <span style={{fontWeight:600,fontSize:14}}>{doc.nom}</span>
              {last&&<span className="badge" style={{background:`${statusColors[last]}18`,color:statusColors[last]}}>{statusLabels[last]}</span>}
              {match.call_count>0&&<span style={{fontSize:11,color:'#9ca3af'}}>({match.call_count} appel{match.call_count>1?'s':''})</span>}
            </div>
            <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>
              {doc.specialite}{doc.code_postal?` · CP ${doc.code_postal}`:''}
              {doc.tel&&<span style={{marginLeft:10}}>📞 {doc.tel}</span>}
            </div>
          </div>
          <ScoreBadge score={match.score} level={match.level}/>
          {expanded?<ChevronUp size={16} color="var(--muted)"/>:<ChevronDown size={16} color="var(--muted)"/>}
        </div>

        {/* Progress bar */}
        <div style={{height:3,background:'#f3f4f6'}}>
          <div style={{height:'100%',width:`${match.score}%`,background:scColors[match.level],transition:'width .3s'}}/>
        </div>

        {expanded&&(
          <div style={{padding:'14px 18px',background:'#fafafa',borderTop:'1px solid var(--border)'}}>
            <div className="grid-2" style={{marginBottom:12}}>
              <div>
                <div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:4}}>Contact</div>
                <div style={{fontSize:13,display:'flex',flexDirection:'column',gap:3}}>
                  {doc.tel&&<span><Phone size={12} style={{marginRight:5}}/>{doc.tel}</span>}
                  {doc.mail&&<span style={{fontSize:12}}><Mail size={12} style={{marginRight:5}}/>{doc.mail}</span>}
                  {!doc.tel&&!doc.mail&&<span style={{color:'#9ca3af'}}>Pas de contact renseigné</span>}
                </div>
              </div>
              <div>
                <div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:4}}>Analyse</div>
                {match.reasons.slice(0,4).map((r,i)=><div key={i} style={{fontSize:12,color:'#15803d',display:'flex',gap:5,marginBottom:2}}><Check size={11}/>{r}</div>)}
                {match.warnings.slice(0,3).map((w,i)=><div key={i} style={{fontSize:12,color:'#d97706',display:'flex',gap:5,marginBottom:2}}><AlertTriangle size={11}/>{w}</div>)}
              </div>
            </div>
            {doc.notes&&<div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:10,fontSize:12,color:'#78350f',marginBottom:12,lineHeight:1.5}}><strong>Notes : </strong>{doc.notes}</div>}
            <button className="btn btn-primary btn-sm" onClick={e=>{e.stopPropagation();setShowModal(true)}}>
              <Phone size={13}/> Préparer l'appel
            </button>
          </div>
        )}
      </div>
      {showModal&&<CallModal match={match} offer={offer} onClose={()=>setShowModal(false)} onSaved={onRefresh}/>}
    </>
  )
}

export default function Matching() {
  const [searchParams] = useSearchParams()
  const [offers, setOffers] = useState([])
  const [offerSpecs, setOfferSpecs] = useState([])
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filterSpec, setFilterSpec] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterType, setFilterType] = useState('')

  useEffect(()=>{
    offersAPI.list({limit:500}).then(d=>setOffers(d.offers))
    offersAPI.specialites().then(setOfferSpecs)
  },[])

  // Auto-select offer from URL param
  useEffect(()=>{
    const offerId = searchParams.get('offer_id')
    if (offerId && offers.length > 0) {
      const found = offers.find(o=>o.id===parseInt(offerId))
      if (found) { setSelectedOffer(found); runMatchForOffer(found) }
    }
  },[offers, searchParams])

  async function runMatchForOffer(offer) {
    setLoading(true)
    try {
      const data = await matchAPI.byOffer(offer.id, {limit:60})
      setResults(data)
    } finally { setLoading(false) }
  }

  function selectOffer(offer) {
    setSelectedOffer(offer)
    runMatchForOffer(offer)
  }

  const filteredOffers = offers.filter(o=>{
    const ms=!filterSpec||o.specialite===filterSpec
    const md=!filterDept||o.departement===filterDept
    const mt=!filterType||o.type_contrat.includes(filterType)
    return ms&&md&&mt
  })

  // Group filtered offers by specialty
  const bySpec={}
  filteredOffers.forEach(o=>{
    if(!bySpec[o.specialite])bySpec[o.specialite]=[]
    bySpec[o.specialite].push(o)
  })

  const depts=[...new Set(offers.map(o=>o.departement).filter(Boolean))].sort()

  const countByLevel = results ? {
    high:  results.matches.filter(m=>m.level==='high').length,
    medium:results.matches.filter(m=>m.level==='medium').length,
    low:   results.matches.filter(m=>m.level==='low').length,
  } : null

  return (
    <div style={{display:'flex',height:'calc(100vh - 0px)',overflow:'hidden'}}>

      {/* LEFT: offer selector */}
      <div style={{width:340,flexShrink:0,borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',background:'#fff'}}>
        <div style={{padding:'20px 16px 12px',borderBottom:'1px solid #f3f4f6'}}>
          <h2 style={{fontSize:16,fontWeight:700,marginBottom:12}}>Sélectionner une offre</h2>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <select style={{width:'100%'}} value={filterSpec} onChange={e=>setFilterSpec(e.target.value)}>
              <option value="">Toutes spécialités</option>
              {offerSpecs.map(s=><option key={s.specialite} value={s.specialite}>{s.specialite} ({s.count})</option>)}
            </select>
            <div style={{display:'flex',gap:6}}>
              <select style={{flex:1}} value={filterDept} onChange={e=>setFilterDept(e.target.value)}>
                <option value="">Tous départements</option>
                {depts.map(d=><option key={d} value={d}>Dép. {d}</option>)}
              </select>
              <select style={{flex:1}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
                <option value="">Tous types</option>
                <option value="Intérim">Intérim</option>
                <option value="CDI">CDI/CDD</option>
              </select>
            </div>
          </div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>{filteredOffers.length} offre{filteredOffers.length!==1?'s':''}</div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'8px 8px'}}>
          {Object.entries(bySpec).sort((a,b)=>b[1].length-a[1].length).map(([spec,offs])=>(
            <div key={spec} style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'.5px',padding:'4px 8px',marginBottom:4}}>{spec} <span style={{background:'#dbeafe',color:'#1d4ed8',borderRadius:8,padding:'0 6px',fontSize:10}}>{offs.length}</span></div>
              {offs.map(o=>(
                <div key={o.id} onClick={()=>selectOffer(o)}
                  style={{padding:'10px 12px',borderRadius:8,cursor:'pointer',marginBottom:3,
                    background:selectedOffer?.id===o.id?'#eff6ff':'transparent',
                    border:selectedOffer?.id===o.id?'1px solid #bfdbfe':'1px solid transparent',
                    transition:'all .1s'}}>
                  <div style={{fontSize:13,fontWeight:selectedOffer?.id===o.id?600:400,marginBottom:3}}>
                    {o.ref&&<span style={{fontFamily:'monospace',fontSize:10,color:'#9ca3af',marginRight:6}}>{o.ref}</span>}
                    {o.titre!==o.specialite?o.titre:o.specialite}
                  </div>
                  <div style={{display:'flex',gap:8,fontSize:11,color:'#6b7280'}}>
                    <span><MapPin size={10} style={{marginRight:2}}/>{o.localisation||'—'}</span>
                    <span style={{background:o.type_contrat.includes('CDI')?'#dcfce7':'#fef9c3',
                      color:o.type_contrat.includes('CDI')?'#15803d':'#854d0e',
                      borderRadius:4,padding:'0 5px'}}>{o.type_contrat.includes('CDI')?'CDI':'Intérim'}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: results */}
      <div style={{flex:1,overflowY:'auto',padding:28}}>
        {!selectedOffer&&!loading&&(
          <div className="empty-state" style={{padding:80}}>
            <Search size={52} style={{opacity:.3,marginBottom:16}}/>
            <h3 style={{fontSize:18,marginBottom:8}}>Sélectionnez une offre</h3>
            <p>Choisissez une offre à gauche pour voir automatiquement les médecins à appeler en priorité, classés par score de compatibilité.</p>
          </div>
        )}

        {loading&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:80,gap:16}}>
            <div className="spinner" style={{width:32,height:32}}/>
            <p style={{color:'var(--muted)'}}>Calcul des scores en cours...</p>
          </div>
        )}

        {selectedOffer&&results&&!loading&&(
          <>
            {/* Offer summary */}
            <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,padding:20,marginBottom:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  {selectedOffer.ref&&<div style={{fontFamily:'monospace',fontSize:12,color:'#9ca3af',marginBottom:4}}>{selectedOffer.ref}</div>}
                  <h2 style={{fontSize:18,fontWeight:700,marginBottom:6}}>{selectedOffer.titre}</h2>
                  <div style={{display:'flex',gap:16,fontSize:14,color:'#4b5563',flexWrap:'wrap'}}>
                    <span><MapPin size={13} style={{marginRight:4}}/>{selectedOffer.localisation}</span>
                    {selectedOffer.structure&&<span><Building size={13} style={{marginRight:4}}/>{selectedOffer.structure}</span>}
                    <span className={`badge badge-${selectedOffer.type_contrat.includes('CDI')?'green':'yellow'}`}>{selectedOffer.type_contrat}</span>
                  </div>
                  {selectedOffer.dates&&<div style={{marginTop:8,fontSize:12,color:'#059669',background:'#f0fdf4',borderRadius:6,padding:'6px 10px',maxWidth:500,whiteSpace:'pre-line'}}>{selectedOffer.dates.substring(0,300)}</div>}
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:28,fontWeight:700,color:'#2563eb'}}>{results.total}</div>
                  <div style={{fontSize:12,color:'var(--muted)'}}>médecins trouvés</div>
                </div>
              </div>
            </div>

            {/* Score summary pills */}
            <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
              <span style={{background:'#f0fdf4',color:'#15803d',borderRadius:20,padding:'5px 14px',fontSize:13,fontWeight:500}}>🟢 {countByLevel.high} fort{countByLevel.high>1?'s':''}</span>
              <span style={{background:'#fffbeb',color:'#92400e',borderRadius:20,padding:'5px 14px',fontSize:13,fontWeight:500}}>🟡 {countByLevel.medium} moyen{countByLevel.medium>1?'s':''}</span>
              <span style={{background:'#fef2f2',color:'#b91c1c',borderRadius:20,padding:'5px 14px',fontSize:13,fontWeight:500}}>🔴 {countByLevel.low} faible{countByLevel.low>1?'s':''}</span>
              <span style={{fontSize:13,color:'var(--muted)',alignSelf:'center'}}>— Cliquez sur une carte pour voir les détails et préparer l'appel</span>
            </div>

            {results.matches.length===0
              ? <div className="empty-state card" style={{padding:60}}><p>Aucun médecin compatible trouvé pour cette spécialité.</p></div>
              : results.matches.map((m,i)=>(
                  <MatchCard key={`${m.doctor.id}-${i}`} match={m} offer={selectedOffer} onRefresh={()=>runMatchForOffer(selectedOffer)}/>
                ))
            }
          </>
        )}
      </div>
    </div>
  )
}
