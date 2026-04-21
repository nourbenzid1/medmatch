import React, { useState, useEffect } from 'react'
import { Phone, Trash2, Search, Filter } from 'lucide-react'
import { callsAPI } from '../api'

const STATUT_CONFIG = {
  'appelé': { label: 'Appelé', bg: '#eff6ff', color: '#1d4ed8' },
  'intéressé': { label: 'Intéressé ✓', bg: '#f0fdf4', color: '#15803d' },
  'pas_intéressé': { label: 'Pas intéressé', bg: '#fef2f2', color: '#b91c1c' },
  'rappel': { label: 'À rappeler ⏰', bg: '#fffbeb', color: '#92400e' },
  'placé': { label: 'Placé ✓', bg: '#f3e8ff', color: '#7e22ce' },
}

export default function Calls() {
  const [calls, setCalls] = useState([])
  const [filters, setFilters] = useState({ statut: '', search: '' })
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    callsAPI.list({ statut: filters.statut || undefined }).then(d => {
      setCalls(d.calls)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filters.statut])

  async function del(id) {
    await callsAPI.delete(id)
    load()
  }

  const filtered = calls.filter(c => {
    if (!filters.search) return true
    const q = filters.search.toLowerCase()
    return (c.doctor_nom || '').toLowerCase().includes(q) || (c.hospital_nom || '').toLowerCase().includes(q)
  })

  // Group by status for summary
  const summary = calls.reduce((acc, c) => { acc[c.statut] = (acc[c.statut] || 0) + 1; return acc }, {})

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Suivi des appels</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4 }}>{calls.length} appel{calls.length !== 1 ? 's' : ''} enregistré{calls.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {Object.entries(STATUT_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilters(f => ({ ...f, statut: f.statut === key ? '' : key }))}
            style={{
              padding: '6px 14px', borderRadius: 20, border: `1px solid ${filters.statut === key ? cfg.color : 'var(--border)'}`,
              background: filters.statut === key ? cfg.bg : 'var(--surface)', color: filters.statut === key ? cfg.color : 'var(--muted)',
              cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6
            }}>
            {cfg.label}
            {summary[key] != null && <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 10, padding: '0 6px', fontSize: 11, fontWeight: 700 }}>{summary[key]}</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="card" style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input style={{ paddingLeft: 32, width: '100%' }} type="text" placeholder="Rechercher médecin, établissement..."
            value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        </div>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div> :
        filtered.length === 0 ? (
          <div className="empty-state card" style={{ padding: 60 }}>
            <Phone size={48} />
            <h3 style={{ marginTop: 12, marginBottom: 8 }}>Aucun appel enregistré</h3>
            <p>Les appels que vous effectuez depuis l'outil de Matching apparaîtront ici.</p>
          </div>
        ) : (
          <div className="card">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Médecin', 'Spécialité', 'Établissement', 'Offre', 'Statut', 'Notes', 'Date', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, color: 'var(--muted)', fontWeight: 600, background: '#f9fafb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const cfg = STATUT_CONFIG[c.statut] || { label: c.statut, bg: '#f3f4f6', color: '#374151' }
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{c.doctor_nom || `Médecin #${c.doctor_id}`}</div>
                        {c.doctor_tel && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.doctor_tel}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{c.doctor_specialite}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{c.hospital_nom || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{c.offer_titre !== '—' ? c.offer_titre : '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#555', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button className="btn-ghost btn-sm" onClick={() => del(c.id)} style={{ color: '#dc2626' }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}
