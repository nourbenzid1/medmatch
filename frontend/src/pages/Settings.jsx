import React, { useState, useEffect } from 'react'
import { RefreshCw, Check, AlertTriangle, X, ExternalLink, ChevronDown, ChevronUp, Save, Wifi, WifiOff } from 'lucide-react'
import api from '../api'

function StatusDot({ ok }) {
  return (
    <span style={{
      display:'inline-block', width:10, height:10, borderRadius:'50%',
      background: ok ? '#16a34a' : '#dc2626', marginRight:8, flexShrink:0
    }}/>
  )
}

function StepCard({ num, title, children, defaultOpen=false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{border:'1px solid #e5e7eb', borderRadius:10, marginBottom:12, overflow:'hidden'}}>
      <div onClick={()=>setOpen(!open)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',cursor:'pointer',background:'#f9fafb'}}>
        <div style={{width:28,height:28,borderRadius:'50%',background:'#2563eb',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0}}>{num}</div>
        <span style={{fontWeight:600,fontSize:14,flex:1}}>{title}</span>
        {open ? <ChevronUp size={16} color="#6b7280"/> : <ChevronDown size={16} color="#6b7280"/>}
      </div>
      {open && <div style={{padding:'16px 18px',borderTop:'1px solid #f3f4f6'}}>{children}</div>}
    </div>
  )
}

export default function Settings() {
  const [status, setStatus]     = useState(null)
  const [form, setForm]         = useState({ doctors_sheet_id:'', hospitals_sheet_id:'', offers_sheet_id:'', service_account_json:'', auto_sync:false })
  const [syncing, setSyncing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [showJson, setShowJson] = useState(false)

  useEffect(() => {
    api.get('/sheets/status').then(r => {
      setStatus(r.data)
      setForm(f => ({
        ...f,
        doctors_sheet_id:   r.data.doctors_sheet_id   || '',
        hospitals_sheet_id: r.data.hospitals_sheet_id || '',
        offers_sheet_id:    r.data.offers_sheet_id    || '',
        auto_sync:          r.data.auto_sync          || false,
      }))
    }).catch(()=>{})
  }, [])

  async function save() {
    setSaving(true)
    try {
      await api.post('/sheets/config', form)
      const r = await api.get('/sheets/status')
      setStatus(r.data)
      setSyncResult({ok:true, message:'Configuration sauvegardée !'})
    } catch(e) {
      setSyncResult({ok:false, message: e.response?.data?.detail || 'Erreur de sauvegarde'})
    }
    setSaving(false)
  }

  async function runSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const r = await api.post('/sheets/sync')
      setSyncResult(r.data)
      const s = await api.get('/sheets/status')
      setStatus(s.data)
    } catch(e) {
      setSyncResult({ok:false, error: e.response?.data?.detail || 'Erreur de synchronisation'})
    }
    setSyncing(false)
  }

  function extractSheetId(input) {
    const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
    return m ? m[1] : input
  }

  const configured = status?.configured
  const allSheets  = form.doctors_sheet_id && form.hospitals_sheet_id && form.offers_sheet_id

  return (
    <div style={{padding:32, maxWidth:800}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:24,fontWeight:700}}>Connexion Google Sheets</h1>
        <p style={{color:'var(--muted)',marginTop:4}}>Synchronisez vos données directement depuis vos fichiers Google Sheets.</p>
      </div>

      {/* Status bar */}
      {status && (
        <div style={{background: configured&&allSheets ? '#f0fdf4':'#fffbeb', border:`1px solid ${configured&&allSheets?'#bbf7d0':'#fde68a'}`, borderRadius:10, padding:'14px 18px', marginBottom:24, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
          {configured && allSheets
            ? <><Wifi size={18} color="#16a34a"/><span style={{fontWeight:500,color:'#15803d'}}>Connexion configurée</span></>
            : <><WifiOff size={18} color="#d97706"/><span style={{fontWeight:500,color:'#92400e'}}>Configuration incomplète</span></>
          }
          {status.last_sync && (
            <span style={{fontSize:13,color:'var(--muted)',marginLeft:'auto'}}>
              Dernière sync : {new Date(status.last_sync).toLocaleString('fr-FR')}
              <span style={{marginLeft:8}} className={`badge badge-${status.last_sync_status==='ok'?'green':'red'}`}>
                {status.last_sync_status==='ok'?'✓ OK':'✗ Erreur'}
              </span>
            </span>
          )}
        </div>
      )}

      {/* STEP 1 — Create service account */}
      <StepCard num="1" title="Créer un compte de service Google" defaultOpen={!configured}>
        <div style={{fontSize:14,lineHeight:1.8,color:'#374151'}}>
          <ol style={{paddingLeft:20,display:'flex',flexDirection:'column',gap:10}}>
            <li>Va sur <a href="https://console.cloud.google.com" target="_blank" style={{color:'#2563eb',display:'inline-flex',alignItems:'center',gap:4}}>Google Cloud Console <ExternalLink size={12}/></a></li>
            <li>Crée un <strong>nouveau projet</strong> (ou sélectionne un projet existant)</li>
            <li>Va dans <strong>APIs & Services → Library</strong> et active l'API <strong>"Google Sheets API"</strong></li>
            <li>Va dans <strong>APIs & Services → Credentials</strong></li>
            <li>Clique <strong>"Create Credentials" → "Service account"</strong></li>
            <li>Donne-lui un nom (ex: <code style={{background:'#f3f4f6',padding:'1px 6px',borderRadius:4}}>medmatch-sync</code>), puis clique <strong>Done</strong></li>
            <li>Clique sur le compte créé → onglet <strong>Keys</strong> → <strong>Add Key → Create new key → JSON</strong></li>
            <li>Un fichier <code>.json</code> est téléchargé — <strong>colle son contenu</strong> dans le champ ci-dessous</li>
          </ol>
        </div>

        <div style={{marginTop:16}}>
          <div className="form-group">
            <label style={{display:'flex',alignItems:'center',gap:8}}>
              <StatusDot ok={configured}/>
              Colle ici le contenu du fichier JSON du compte de service
            </label>
            <div style={{position:'relative'}}>
              <textarea
                rows={showJson ? 10 : 3}
                style={{width:'100%',fontFamily:'monospace',fontSize:12,resize:'vertical'}}
                placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'}
                value={form.service_account_json}
                onChange={e=>setForm(f=>({...f,service_account_json:e.target.value}))}
              />
              <button onClick={()=>setShowJson(!showJson)} style={{position:'absolute',bottom:8,right:8,background:'none',border:'none',fontSize:12,color:'#6b7280',cursor:'pointer'}}>
                {showJson?'Réduire':'Agrandir'}
              </button>
            </div>
            {configured && <div style={{fontSize:12,color:'#15803d',marginTop:4}}>✓ Clé de service configurée</div>}
          </div>
        </div>
      </StepCard>

      {/* STEP 2 — Share sheets */}
      <StepCard num="2" title="Partager vos Google Sheets avec le compte de service" defaultOpen={configured&&!allSheets}>
        <div style={{fontSize:14,lineHeight:1.8,color:'#374151',marginBottom:12}}>
          Pour chaque Google Sheet (Vivier, Établissements, Offres) :
          <ol style={{paddingLeft:20,marginTop:8,display:'flex',flexDirection:'column',gap:6}}>
            <li>Ouvre le fichier dans Google Sheets</li>
            <li>Clique <strong>Partager</strong> (bouton en haut à droite)</li>
            <li>Ajoute l'email du compte de service — il ressemble à <code style={{background:'#f3f4f6',padding:'1px 6px',borderRadius:4}}>medmatch-sync@ton-projet.iam.gserviceaccount.com</code></li>
            <li>Donne-lui le rôle <strong>"Lecteur"</strong> (pas besoin d'éditeur)</li>
          </ol>
        </div>
        {form.service_account_json && (() => {
          try {
            const sa = JSON.parse(form.service_account_json)
            return sa.client_email ? (
              <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'10px 14px',fontSize:13}}>
                <strong>Email à ajouter dans le partage :</strong><br/>
                <code style={{fontSize:13,color:'#1d4ed8'}}>{sa.client_email}</code>
                <button onClick={()=>navigator.clipboard.writeText(sa.client_email)} style={{marginLeft:10,background:'none',border:'1px solid #bfdbfe',borderRadius:6,padding:'2px 8px',fontSize:11,cursor:'pointer',color:'#2563eb'}}>Copier</button>
              </div>
            ) : null
          } catch { return null }
        })()}
      </StepCard>

      {/* STEP 3 — Sheet IDs */}
      <StepCard num="3" title="Renseigner les IDs de vos Google Sheets" defaultOpen={configured}>
        <p style={{fontSize:13,color:'var(--muted)',marginBottom:16}}>
          L'ID se trouve dans l'URL de votre feuille : <code style={{background:'#f3f4f6',padding:'2px 6px',borderRadius:4,fontSize:12}}>docs.google.com/spreadsheets/d/<strong style={{color:'#dc2626'}}>VOTRE_ID</strong>/edit</code><br/>
          Vous pouvez coller l'URL complète — l'ID sera extrait automatiquement.
        </p>

        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {[
            {key:'doctors_sheet_id',   label:'Vivier Médecins',               placeholder:'ID ou URL du Google Sheet'},
            {key:'hospitals_sheet_id', label:'Liste des Établissements',       placeholder:'ID ou URL du Google Sheet'},
            {key:'offers_sheet_id',    label:'Offres LASKA CORPORATE MEDICAL', placeholder:'ID ou URL du Google Sheet'},
          ].map(({key,label,placeholder})=>(
            <div key={key} className="form-group">
              <label style={{display:'flex',alignItems:'center',gap:6}}>
                <StatusDot ok={!!form[key]}/>
                {label}
              </label>
              <input
                type="text"
                value={form[key]}
                placeholder={placeholder}
                onChange={e=>setForm(f=>({...f,[key]:extractSheetId(e.target.value)}))}
                style={{fontFamily: form[key].length > 30 ? 'monospace' : 'inherit', fontSize:13}}
              />
              {form[key] && (
                <div style={{fontSize:11,color:'#6b7280',marginTop:3,fontFamily:'monospace'}}>
                  ID: {form[key]}
                </div>
              )}
            </div>
          ))}

          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'#f9fafb',borderRadius:8}}>
            <input type="checkbox" id="auto_sync" checked={form.auto_sync} onChange={e=>setForm(f=>({...f,auto_sync:e.target.checked}))} style={{width:16,height:16,cursor:'pointer'}}/>
            <label htmlFor="auto_sync" style={{fontSize:14,cursor:'pointer'}}>
              <strong>Sync automatique</strong> au démarrage de l'application
            </label>
          </div>
        </div>
      </StepCard>

      {/* Save + Sync buttons */}
      <div style={{display:'flex',gap:12,marginTop:8,flexWrap:'wrap'}}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          <Save size={15}/> {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
        </button>
        <button
          className="btn"
          onClick={runSync}
          disabled={syncing || !configured || !allSheets}
          style={{opacity: (!configured||!allSheets)?0.5:1}}
        >
          <RefreshCw size={15} style={{animation:syncing?'spin .6s linear infinite':undefined}}/>
          {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
        </button>
        {(!configured||!allSheets) && !syncing && (
          <span style={{fontSize:12,color:'var(--muted)',alignSelf:'center'}}>Complétez les étapes 1–3 pour activer la sync</span>
        )}
      </div>

      {/* Result */}
      {syncResult && (
        <div style={{marginTop:16,padding:'14px 18px',borderRadius:10,border:`1px solid ${syncResult.ok?'#bbf7d0':'#fca5a5'}`,background:syncResult.ok?'#f0fdf4':'#fef2f2'}}>
          {syncResult.ok ? (
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,fontWeight:600,color:'#15803d',marginBottom:8}}>
                <Check size={18}/> Synchronisation réussie !
              </div>
              {syncResult.synced && Object.entries(syncResult.synced).map(([k,v])=>(
                <div key={k} style={{fontSize:13,color:'#166534',marginBottom:3}}>
                  ✓ <strong>{k}</strong> : {v} entrées importées
                </div>
              ))}
              {syncResult.message && <div style={{fontSize:13,color:'#15803d'}}>{syncResult.message}</div>}
            </div>
          ) : (
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,fontWeight:600,color:'#b91c1c',marginBottom:8}}>
                <AlertTriangle size={18}/> Erreur de synchronisation
              </div>
              <div style={{fontSize:13,color:'#7f1d1d'}}>{syncResult.error || syncResult.message}</div>
              {syncResult.errors && Object.entries(syncResult.errors).map(([k,v])=>(
                <div key={k} style={{fontSize:13,color:'#7f1d1d',marginTop:4}}>• <strong>{k}</strong> : {v}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Help box */}
      <div style={{marginTop:28,background:'#f8fafc',border:'1px solid #e5e7eb',borderRadius:10,padding:'16px 20px'}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:10}}>❓ Problèmes fréquents</div>
        <div style={{fontSize:13,color:'#374151',display:'flex',flexDirection:'column',gap:8,lineHeight:1.6}}>
          <div><strong>The caller does not have permission</strong> → Le sheet n'est pas partagé avec l'email du compte de service</div>
          <div><strong>Unable to parse range</strong> → Le nom de l'onglet ne correspond pas exactement (vérifiez les espaces)</div>
          <div><strong>Invalid JSON</strong> → Le contenu du fichier JSON n'a pas été copié entièrement</div>
          <div><strong>API not enabled</strong> → Activez "Google Sheets API" dans votre projet Google Cloud</div>
        </div>
      </div>
    </div>
  )
}
