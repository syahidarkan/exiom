'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchJson } from '@/lib/api'

const AGENTS = [
  { name: 'mia',    displayName: 'Mia',    role: 'Marketing Manager',  emoji: '📣' },
  { name: 'deril',  displayName: 'Deril',  role: 'Editor',             emoji: '✏️' },
  { name: 'gagah',  displayName: 'Gagah',  role: 'SEO Researcher',     emoji: '🔍' },
  { name: 'kenzie', displayName: 'Kenzie', role: 'IT Manager',         emoji: '🖥️' },
  { name: 'adi',    displayName: 'Adi',    role: 'Developer',          emoji: '⚙️' },
  { name: 'nela',   displayName: 'Nela',   role: 'PR Manager',         emoji: '📋' },
  { name: 'ale',    displayName: 'Ale',    role: 'Client Relations',   emoji: '💬' },
  { name: 'joce',   displayName: 'Joce',   role: 'Client Acquisition', emoji: '🎯' },
  { name: 'hugo',   displayName: 'Hugo',   role: 'Finance',            emoji: '💰' },
]

const QUICK_PROMPTS: Record<string, string[]> = {
  mia:    ['Cek approval queue kamu dan lanjutkan task yang approved.', 'Buat content calendar 2 minggu ke depan.'],
  deril:  ['Cek approval queue kamu dan lanjutkan produksi konten.', 'Generate video TikTok dari brief terbaru di workspace/mia/brief_deril.md'],
  gagah:  ['Cek approval queue kamu dan lanjutkan riset SEO.', 'Riset 10 keyword prioritas untuk bulan ini.'],
  kenzie: ['Cek approval queue kamu dan lanjutkan task dev aktif.', 'Review status project dan update kanban.'],
  adi:    ['Cek kanban task yang assign ke kamu dan lanjutkan.'],
  nela:   ['Cek approval queue kamu dan lanjutkan QA proposal/PR aktif.'],
  ale:    ['Cek WA/email masuk dan tangani pertanyaan klien aktif.'],
  joce:   ['Riset 5 lead potensial baru dan buat profil singkatnya.'],
  hugo:   ['Cek invoice overdue dan buat reminder payment.', 'Buat laporan keuangan minggu ini.'],
}

type RelayStatus = 'checking' | 'online' | 'offline'

export default function SendPromptPanel() {
  const [selectedAgent, setSelectedAgent] = useState('mia')
  const [prompt, setPrompt]               = useState('')
  const [sending, setSending]             = useState(false)
  const [result, setResult]               = useState<{ ok: boolean; message: string } | null>(null)
  const [relayStatus, setRelayStatus]     = useState<RelayStatus>('checking')

  const checkRelay = useCallback(async () => {
    try {
      const res = await fetchJson<{ status: string }>('/api/exiom/send-prompt')
      setRelayStatus(res.data?.status === 'ok' ? 'online' : 'offline')
    } catch {
      setRelayStatus('offline')
    }
  }, [])

  useEffect(() => {
    void checkRelay()
    const t = setInterval(() => void checkRelay(), 15_000)
    return () => clearInterval(t)
  }, [checkRelay])

  const sendPrompt = async () => {
    if (!prompt.trim() || sending) return
    setSending(true)
    setResult(null)
    try {
      await fetchJson('/api/exiom/send-prompt', {
        method: 'POST',
        body: JSON.stringify({ agent: selectedAgent, prompt: prompt.trim() }),
      })
      setResult({ ok: true, message: `Prompt terkirim ke ${selectedAgent}. Agent akan mengerjakan di background.` })
      setPrompt('')
    } catch (err) {
      setResult({ ok: false, message: (err as Error).message })
    } finally {
      setSending(false)
    }
  }

  const currentAgent = AGENTS.find(a => a.name === selectedAgent)!
  const quickList    = QUICK_PROMPTS[selectedAgent] ?? []

  return (
    <div style={{
      height: '100%', width: '100%', overflow: 'auto',
      background: '#0b0e14', padding: '24px 28px',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
          Kirim Prompt ke Agent
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
          Prompt dikirim ke Hermes lewat relay lokal · agent kerja di background
        </p>
      </div>

      {/* Relay status */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 6, fontSize: 11,
        background: relayStatus === 'online' ? '#22c55e15' : relayStatus === 'offline' ? '#ef444415' : '#64748b15',
        border: `1px solid ${relayStatus === 'online' ? '#22c55e40' : relayStatus === 'offline' ? '#ef444440' : '#64748b40'}`,
        color: relayStatus === 'online' ? '#22c55e' : relayStatus === 'offline' ? '#ef4444' : '#64748b',
        alignSelf: 'flex-start',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: relayStatus === 'online' ? '#22c55e' : relayStatus === 'offline' ? '#ef4444' : '#64748b',
          boxShadow: relayStatus === 'online' ? '0 0 5px #22c55e' : 'none',
        }} />
        {relayStatus === 'online' ? 'hermes-relay online' : relayStatus === 'offline' ? 'hermes-relay offline — jalankan: python3 tools/helpers/hermes-relay.py &' : 'mengecek relay…'}
      </div>

      {/* Agent selector */}
      <div>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Pilih Agent
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {AGENTS.map(a => (
            <button
              key={a.name}
              onClick={() => { setSelectedAgent(a.name); setPrompt(''); setResult(null) }}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                background: selectedAgent === a.name ? '#6366f120' : '#111827',
                border: `1px solid ${selectedAgent === a.name ? '#6366f1' : '#1f2937'}`,
                color: selectedAgent === a.name ? '#a5b4fc' : '#94a3b8',
                transition: 'all 0.15s',
              }}
            >
              <span>{a.emoji}</span>
              <span style={{ fontWeight: selectedAgent === a.name ? 600 : 400 }}>{a.displayName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick prompts */}
      {quickList.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Quick Prompt {currentAgent.emoji} {currentAgent.displayName}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {quickList.map((q, i) => (
              <button
                key={i}
                onClick={() => setPrompt(q)}
                style={{
                  textAlign: 'left', padding: '8px 12px', borderRadius: 7, fontSize: 12,
                  background: '#111827', border: '1px solid #1f2937',
                  color: '#94a3b8', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f160'; e.currentTarget.style.color = '#e2e8f0' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f2937'; e.currentTarget.style.color = '#94a3b8' }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prompt textarea */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Prompt untuk {currentAgent.displayName}
        </div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void sendPrompt() }}
          placeholder={`Tulis instruksi untuk ${currentAgent.displayName}…`}
          rows={5}
          style={{
            background: '#111827', border: '1px solid #1f2937', borderRadius: 8,
            color: '#e2e8f0', fontSize: 13, padding: '12px 14px',
            resize: 'vertical', fontFamily: 'inherit', outline: 'none',
            width: '100%', boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#6366f160' }}
          onBlur={e => { e.currentTarget.style.borderColor = '#1f2937' }}
        />

        {/* Send button */}
        <button
          onClick={() => void sendPrompt()}
          disabled={sending || !prompt.trim() || relayStatus === 'offline'}
          style={{
            padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: sending || !prompt.trim() || relayStatus === 'offline' ? '#1f2937' : '#6366f1',
            border: 'none', color: sending || !prompt.trim() || relayStatus === 'offline' ? '#4b5563' : '#fff',
            cursor: sending || !prompt.trim() || relayStatus === 'offline' ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-end', transition: 'all 0.15s',
          }}
        >
          {sending ? '⏳ Mengirim…' : `Kirim ke ${currentAgent.displayName} →`}
        </button>

        {/* Result feedback */}
        {result && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, fontSize: 12,
            background: result.ok ? '#22c55e15' : '#ef444415',
            border: `1px solid ${result.ok ? '#22c55e40' : '#ef444440'}`,
            color: result.ok ? '#22c55e' : '#ef4444',
          }}>
            {result.ok ? '✓ ' : '✗ '}{result.message}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: '#374151' }}>
        Ctrl+Enter untuk kirim cepat · agent berjalan di terminal background, cek log Hermes untuk progress
      </div>
    </div>
  )
}
