import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Building2, Briefcase, Phone, TrendingUp, Clock, CheckCircle2, ArrowRight } from 'lucide-react'
import { statsAPI } from '../api'
import NetworkBanner from '../components/NetworkBanner'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const navigate = useNavigate()
  useEffect(() => { statsAPI.get().then(setStats).catch(() => {}) }, [])
  if (!stats) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>

  const statusColor = { appele: '#2563eb', interesse: '#16a34a', place: '#7c3aed', pas_interesse: '#dc2626', rappel: '#d97706' }
  const statusLabel = { appele: 'Appelé', interesse: 'Intéressé', place: 'Placé ✓', pas_interesse: 'Pas intéressé', rappel: 'À rappeler' }

  return (
    <div style={{ padding: 32 }}>
      {/* Network banner — shows team URL automatically */}
      <NetworkBanner />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Tableau de bord</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4 }}>Laska Corporate Medical — Placement médical</p>
      </div>

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { icon: Users,     label: 'Médecins dans le vivier',      value: stats.doctors_total,   color: '#2563eb' },
          { icon: Briefcase, label: 'Offres actives',               value: stats.offers_total,    color: '#7c3aed' },
          { icon: Building2, label: 'Établissements conventionnés', value: stats.hospitals_total, color: '#0891b2' },
          { icon: Phone,     label: 'Appels enregistrés',           value: stats.calls_total,     color: '#059669' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Activity */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Résumé activité</h3>
          {[
            { icon: CheckCircle2, label: 'Placements confirmés', value: stats.placed,     color: '#16a34a' },
            { icon: TrendingUp,   label: 'Médecins intéressés', value: stats.interested, color: '#2563eb' },
            { icon: Clock,        label: 'À rappeler',           value: stats.to_recall,  color: '#d97706' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Icon size={18} color={color} /><span style={{ fontSize: 14 }}>{label}</span></div>
              <span style={{ fontSize: 20, fontWeight: 700, color }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Top offers */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Offres avec le plus de candidats potentiels</h3>
          {(stats.top_offers || []).slice(0, 5).map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.offer.ref && <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#9ca3af', marginRight: 6 }}>{item.offer.ref}</span>}
                  {item.offer.specialite}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.offer.localisation}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb' }}>{item.potential_doctors}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>médecins</div>
              </div>
            </div>
          ))}
          {(!stats.top_offers || stats.top_offers.length === 0) && <div style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: 20 }}>Aucune offre créée</div>}
        </div>
      </div>

      {/* Recent calls */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Derniers appels</h3>
          <button className="btn btn-sm" onClick={() => navigate('/calls')}>Voir tout <ArrowRight size={13} /></button>
        </div>
        {(stats.recent_calls || []).length === 0
          ? <div className="empty-state" style={{ padding: 32 }}>
              <Phone size={36} style={{ opacity: .3 }} />
              <p style={{ marginTop: 8 }}>Aucun appel. Allez dans <strong>Matching</strong> pour commencer.</p>
            </div>
          : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  {['Médecin', 'Statut', 'Date'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {stats.recent_calls.slice(0, 8).map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 500 }}>
                      {c.doctor_id}
                      {c.offer_titre && c.offer_titre !== '—' && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.offer_titre}</div>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="badge" style={{ background: `${statusColor[c.statut] || '#6b7280'}18`, color: statusColor[c.statut] || '#6b7280' }}>
                        {statusLabel[c.statut] || c.statut}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--muted)' }}>{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate('/matching')}>🔍 Lancer un matching</button>
        <button className="btn" onClick={() => navigate('/offers')}>📋 Voir les offres ({stats.offers_total})</button>
        <button className="btn" onClick={() => navigate('/calls')}>📞 Suivi appels</button>
        {stats.to_recall > 0 && (
          <button className="btn btn-sm" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}
            onClick={() => navigate('/calls?statut=rappel')}>
            ⏰ {stats.to_recall} rappel{stats.to_recall > 1 ? 's' : ''} en attente
          </button>
        )}
      </div>
    </div>
  )
}
