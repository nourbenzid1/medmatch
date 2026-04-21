import React, { useState, useEffect } from 'react'
import { Building2, Search, MapPin } from 'lucide-react'
import { hospitalsAPI, offersAPI } from '../api'

export default function Hospitals() {
  const [hospitals, setHospitals] = useState([])
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('')
  const [regions, setRegions] = useState([])

  useEffect(() => {
    hospitalsAPI.list().then(d => {
      setHospitals(d.hospitals)
      const rs = [...new Set(d.hospitals.map(h => h.region).filter(Boolean))].sort()
      setRegions(rs)
    })
  }, [])

  const filtered = hospitals.filter(h => {
    const mq = !search || h.nom.toLowerCase().includes(search.toLowerCase()) || h.localisation.toLowerCase().includes(search.toLowerCase())
    const mr = !region || h.region === region
    return mq && mr
  })

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Établissements conventionnés</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4 }}>{hospitals.length} établissements partenaires</p>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input style={{ paddingLeft: 32, width: '100%' }} type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={region} onChange={e => setRegion(e.target.value)}>
          <option value="">Toutes régions</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {filtered.map(h => (
          <div key={h.id} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={20} color="#2563eb" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{h.nom}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--muted)' }}>
                  <MapPin size={12} />
                  <span>{h.localisation}</span>
                </div>
                {h.departement && <span className="badge badge-blue" style={{ marginTop: 8 }}>Dép. {h.departement}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
