import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Building2, Briefcase, Phone, Search, Menu, X, Settings as SettingsIcon, RefreshCw } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Matching from './pages/Matching'
import Doctors from './pages/Doctors'
import Hospitals from './pages/Hospitals'
import Offers from './pages/Offers'
import Calls from './pages/Calls'
import Settings from './pages/Settings'
import { statsAPI } from './api'
import api from './api'

export default function App() {
  const [sideOpen, setSideOpen] = useState(window.innerWidth > 768)
  const isMobile = window.innerWidth <= 768
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth <= 768) setSideOpen(false) }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [stats, setStats] = useState({})
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const location = useLocation()

  useEffect(() => {
    statsAPI.get().then(setStats).catch(() => {})
    api.get('/sheets/status').then(r => setSyncStatus(r.data)).catch(() => {})
  }, [location.pathname])

  async function quickSync() {
    setSyncing(true)
    try {
      await api.post('/sheets/sync')
      statsAPI.get().then(setStats)
      api.get('/sheets/status').then(r => setSyncStatus(r.data))
    } catch(e) {}
    setSyncing(false)
  }

  const nav = [
    { to: '/',           label: 'Dashboard',       icon: LayoutDashboard },
    { to: '/matching',   label: 'Matching',         icon: Search },
    { to: '/offers',     label: 'Offres',           icon: Briefcase,  badge: stats.offers_total },
    { to: '/doctors',    label: 'Vivier Médecins',  icon: Users,      badge: stats.doctors_total },
    { to: '/hospitals',  label: 'Établissements',   icon: Building2,  badge: stats.hospitals_total },
    { to: '/calls',      label: 'Suivi Appels',     icon: Phone,      badge: stats.to_recall || null, badgeRed: true },
    { to: '/settings',   label: 'Google Sheets',    icon: SettingsIcon },
  ]

  const sheetConfigured = syncStatus?.configured && syncStatus?.doctors_sheet_id && syncStatus?.offers_sheet_id

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: sideOpen ? 244 : 60, minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', transition: 'width .2s', flexShrink: 0, zIndex: 50 }}>
        {/* Logo */}
        <div style={{ padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #1e293b' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>L</span>
          </div>
          {sideOpen && <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Laska Corporate</div>
            <div style={{ color: '#64748b', fontSize: 11 }}>Medical Matching</div>
          </div>}
          <button onClick={() => setSideOpen(!sideOpen)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}>
            {sideOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>

        {/* Sync button — show if sheets configured */}
        {sideOpen && sheetConfigured && (
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e293b' }}>
            <button onClick={quickSync} disabled={syncing}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: syncing ? '#1e293b' : '#0f3460', border: '1px solid #1e3a5f', color: '#60a5fa', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              <RefreshCw size={14} style={{ animation: syncing ? 'spin .6s linear infinite' : 'none' }} />
              {syncing ? 'Sync...' : 'Synchroniser Sheets'}
              {syncStatus?.last_sync_status === 'ok' && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#4ade80' }}>✓</span>}
            </button>
          </div>
        )}

        {/* Nav links */}
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          {nav.map(({ to, label, icon: Icon, badge, badgeRed }) => (
            <NavLink key={to} to={to} end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                borderRadius: 8, marginBottom: 2, color: isActive ? '#fff' : '#94a3b8',
                background: isActive ? '#1e40af' : 'transparent',
                textDecoration: 'none', fontSize: 14, fontWeight: isActive ? 600 : 400, transition: 'all .12s'
              })}>
              <Icon size={17} style={{ flexShrink: 0 }} />
              {sideOpen && <>
                <span style={{ flex: 1 }}>{label}</span>
                {badge != null && badge !== 0 && (
                  <span style={{ background: badgeRed ? '#dc2626' : 'rgba(255,255,255,.15)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{badge}</span>
                )}
                {to === '/settings' && !sheetConfigured && (
                  <span style={{ background: '#d97706', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 600 }}>Config</span>
                )}
              </>}
            </NavLink>
          ))}
        </nav>

        {sideOpen && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid #1e293b', color: '#475569', fontSize: 11 }}>
            v2.0 · <a href="http://localhost:8000/docs" target="_blank" style={{ color: '#60a5fa' }}>API Docs</a>
          </div>
        )}
      </aside>

      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/matching"  element={<Matching />} />
          <Route path="/offers"    element={<Offers />} />
          <Route path="/doctors"   element={<Doctors />} />
          <Route path="/hospitals" element={<Hospitals />} />
          <Route path="/calls"     element={<Calls />} />
          <Route path="/settings"  element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

