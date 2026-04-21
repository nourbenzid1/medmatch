import React, { useState, useEffect } from 'react'
import { Search, ChevronDown, ChevronUp, Phone, Mail, RefreshCw } from 'lucide-react'
import { doctorsAPI, callsAPI } from '../api'

export default function Doctors() {
  const [doctors, setDoctors] = useState([])
  const [specialites, setSpecialites] = useState([])
  const [filters, setFilters] = useState({ search: '', specialite: '', statut: '' })
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    doctorsAPI.specialites().then(setSpecialites)
  }, [])

  useEffect(() => {
    setLoading(true)
    doctorsAPI.list({ search: filters.search || undefined, specialite: filters.specialite || undefined, statut: filters.statut || undefined, limit: 200 })
      .then(d => { setDoctors(d.doctors); setTotal(d.total) })
      .finally(() => setLoading(false))
  }, [filters])

  function initials(name) {
    const p = name.trim().split(/\s+/)
    return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase()
  }

  const statutBadge = { 'disponible': { bg: '#f0fdf4', color: '#15803d', label: 'Disponible' }, 'contacté': { bg: '#eff6ff', color: '#1d4ed8', label: 'Contacté' }, 'intéressé': { bg: '#f0fdf4', color: '#15803d', label: 'Intéressé' }, 'placé': { bg: '#f3e8ff', color: '#7e22ce', label: 'Placé' }, 'pas_intéressé': { bg: '#fef2f2', color: '#b91c1c', label: 'Pas intéressé' } }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Vivier Médical</h1>
          <p style={{ color: 'var(--muted)', marginTop: 4 }}>{total} médecin{total > 1 ? 's' : ''} au total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input style={{ paddingLeft: 32, width: '100%' }} type="text" placeholder="Rechercher nom, email, notes..."
            value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        </div>
        <select value={filters.specialite} onChange={e => setFilters(f => ({ ...f, specialite: e.target.value }))}>
          <option value="">Toutes spécialités</option>
          {specialites.map(s => <option key={s.specialite} value={s.specialite}>{s.specialite} ({s.count})</option>)}
        </select>
        <select value={filters.statut} onChange={e => setFilters(f => ({ ...f, statut: e.target.value }))}>
          <option value="">Tous statuts</option>
          <option value="disponible">Disponible</option>
          <option value="contacté">Contacté</option>
          <option value="intéressé">Intéressé</option>
          <option value="placé">Placé</option>
          <option value="pas_intéressé">Pas intéressé</option>
        </select>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div> :
        doctors.length === 0 ? <div className="empty-state card"><p>Aucun médecin trouvé</p></div> :
        doctors.map(doc => {
          const hue = doc.nom.charCodeAt(0) * 5 % 360
          const sb = statutBadge[doc.statut] || statutBadge['disponible']
          const isOpen = expanded === doc.id
          return (
            <div key={doc.id} className="card" style={{ marginBottom: 6, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', gap: 12, cursor: 'pointer' }}
                onClick={() => setExpanded(isOpen ? null : doc.id)}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: `hsl(${hue},70%,90%)`, color: `hsl(${hue},50%,35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                  {initials(doc.nom)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{doc.nom}</span>
                    <span className="badge" style={{ background: sb.bg, color: sb.color }}>{sb.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {doc.specialite}{doc.code_postal ? ` · CP ${doc.code_postal}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 14, alignItems: 'center' }}>
                  {doc.tel && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} />{doc.tel}</span>}
                  {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </div>
              {isOpen && (
                <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', background: '#fafafa' }}>
                  <div className="grid-2" style={{ marginBottom: 12 }}>
                    <div><span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Téléphone</span><div style={{ fontSize: 14, marginTop: 3 }}>{doc.tel || '—'}</div></div>
                    <div><span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Email</span><div style={{ fontSize: 13, marginTop: 3 }}>{doc.mail || '—'}</div></div>
                    <div><span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Code postal</span><div style={{ fontSize: 14, marginTop: 3 }}>{doc.code_postal || '—'}</div></div>
                    <div><span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Spécialité</span><div style={{ fontSize: 14, marginTop: 3 }}>{doc.specialite}</div></div>
                  </div>
                  {doc.notes && <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 10, fontSize: 13, color: '#78350f' }}><strong>Notes : </strong>{doc.notes}</div>}
                </div>
              )}
            </div>
          )
        })
      }
    </div>
  )
}
