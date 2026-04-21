import React, { useEffect, useState } from 'react'
import { Wifi, Copy, Check } from 'lucide-react'
import api from '../api'

export default function NetworkBanner() {
  const [info, setInfo] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get('/network').then(r => setInfo(r.data)).catch(() => {})
  }, [])

  if (!info || info.local_ip === 'localhost') return null

  function copy() {
    navigator.clipboard.writeText(info.team_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      background: '#1e3a5f', borderRadius: 10, padding: '14px 20px',
      marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      border: '1px solid #1e40af'
    }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Wifi size={18} color="#60a5fa" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
          Application accessible sur votre réseau
        </div>
        <div style={{ color: '#93c5fd', fontSize: 13 }}>
          Partagez ce lien avec vos collègues (même WiFi / réseau bureau) :&nbsp;
          <strong style={{ color: '#60a5fa' }}>{info.team_url}</strong>
        </div>
      </div>
      <button onClick={copy} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: copied ? '#16a34a' : '#2563eb',
        border: 'none', borderRadius: 8, padding: '8px 14px',
        color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, flexShrink: 0
      }}>
        {copied ? <><Check size={14} /> Copié !</> : <><Copy size={14} /> Copier le lien</>}
      </button>
    </div>
  )
}
