'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import FullPanel from './FullPanel'
import { fetchJson } from '@/lib/api'

const AGENTS = ['kenzie', 'adi', 'mia', 'deril', 'gagah', 'nela', 'ale', 'joce', 'hugo']

const AGENT_COLOR: Record<string, string> = {
  kenzie: '#38bdf8', adi: '#34d399', mia: '#f472b6',
  deril: '#a78bfa', gagah: '#fb923c', nela: '#f87171',
  ale: '#4ade80', joce: '#facc15', hugo: '#22d3ee',
}

function colorLine(line: string): string {
  if (line.includes('ERROR') || line.includes('error')) return '#f87171'
  if (line.includes('WARNING') || line.includes('WARN')) return '#fbbf24'
  if (line.includes('API call')) return '#818cf8'
  if (line.includes('tool') && line.includes('completed')) return '#34d399'
  if (line.includes('Turn ended')) return '#4ade80'
  if (line.includes('INFO')) return '#94a3b8'
  return '#64748b'
}

function parseLogLine(line: string): { ts: string; level: string; msg: string } {
  // Format: 2026-10-20 15:03:11,642 INFO module: message
  const m = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+ (\w+)\s+(.+)$/)
  if (m) return { ts: m[1].slice(11), level: m[2], msg: m[3] }
  return { ts: '', level: '', msg: line }
}

export default function AgentLogPanel({
  open,
  onClose,
  initialAgent,
  initialTab,
}: {
  open: boolean
  onClose: () => void
  initialAgent?: string
  initialTab?: 'agent' | 'relay'
}) {
  const [agent, setAgent] = useState(initialAgent ?? 'gagah')
  const [agentLog, setAgentLog] = useState<string[]>([])
  const [relayLog, setRelayLog] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'agent' | 'relay'>(initialTab ?? 'relay')
  const [sending, setSending] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!open) return
    setLoading(true)
    try {
      const res = await fetchJson<{ agentLog: string[]; relayLog: string[] }>(
        `/api/exiom/agent-log?agent=${agent}&lines=80`
      )
      setAgentLog(res.data?.agentLog ?? [])
      setRelayLog(res.data?.relayLog ?? [])
    } catch { /* offline */ } finally {
      setLoading(false)
    }
  }, [open, agent])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 5_000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    if (initialAgent) setAgent(initialAgent)
  }, [initialAgent])

  useEffect(() => {
    if (initialTab) setTab(initialTab)
  }, [initialTab])

  // auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentLog, relayLog, tab])

  async function sendPrompt() {
    if (!prompt.trim()) return
    setSending(true)
    setMsg(null)
    try {
      const res = await fetch('/api/exiom/send-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent, prompt }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setMsg({ type: 'ok', text: `Prompt dikirim ke ${agent}` })
      setPrompt('')
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message })
    } finally {
      setSending(false)
    }
  }

  const lines = tab === 'agent' ? agentLog : relayLog
  const color = AGENT_COLOR[agent] ?? '#94a3b8'

  if (!open) return null

  return (
    <FullPanel
      onClose={onClose}
      label="Agent Log"
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          Log Agent
          <span style={{
            background: color + '22', color, border: `1px solid ${color}44`,
            borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase',
          }}>{agent}</span>
          {loading && <span style={{ fontSize: 10, color: '#475569' }}>↻</span>}
        </span>
      }
      actions={
        <button className="vp-btn vp-btn-ghost" onClick={() => void load()}>
          ↻ Refresh
        </button>
      }
    >
      {/* Agent selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {AGENTS.map(a => (
          <button
            key={a}
            onClick={() => setAgent(a)}
            style={{
              padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: agent === a ? (AGENT_COLOR[a] + '33') : '#1e293b',
              color: agent === a ? AGENT_COLOR[a] : '#64748b',
              outline: agent === a ? `1px solid ${AGENT_COLOR[a]}66` : 'none',
            }}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, borderBottom: '1px solid #1e293b', paddingBottom: 0 }}>
        {(['agent', 'relay'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '5px 12px', fontSize: 12, fontWeight: 600,
              color: tab === t ? color : '#475569',
              borderBottom: tab === t ? `2px solid ${color}` : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t === 'agent' ? `agent.log (${agentLog.length} baris)` : `relay.log (${relayLog.length} baris)`}
          </button>
        ))}
      </div>

      {/* Log output */}
      <div style={{
        background: '#0a0f18',
        border: '1px solid #1e293b',
        borderRadius: 8,
        padding: '10px 12px',
        height: 340,
        overflow: 'auto',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 11,
        lineHeight: 1.55,
      }}>
        {lines.length === 0 ? (
          <div style={{ color: '#334155', padding: '20px 0', textAlign: 'center' }}>
            {loading ? 'Memuat...' : 'Log kosong'}
          </div>
        ) : (
          lines.map((line, i) => {
            const { ts, level, msg: logMsg } = parseLogLine(line)
            const lcolor = colorLine(line)
            return (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 1 }}>
                {ts && <span style={{ color: '#334155', flexShrink: 0, fontSize: 10 }}>{ts}</span>}
                {level && <span style={{ color: level === 'ERROR' ? '#f87171' : level === 'WARNING' ? '#fbbf24' : '#334155', flexShrink: 0, fontSize: 10, width: 32 }}>{level.slice(0,4)}</span>}
                <span style={{ color: lcolor, wordBreak: 'break-all' }}>{logMsg}</span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Send prompt */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          Kirim Prompt ke {agent}
        </div>
        {msg && (
          <div className={msg.type === 'ok' ? 'vp-ok' : 'vp-err'} style={{ marginBottom: 8, fontSize: 12 }}>
            {msg.text}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={`Kirim instruksi ke ${agent}...`}
            rows={2}
            className="vp-input"
            style={{ flex: 1, resize: 'vertical', fontSize: 12 }}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void sendPrompt()
            }}
          />
          <button
            className="vp-btn"
            style={{ alignSelf: 'flex-end', background: color + '33', color, border: `1px solid ${color}66`, minWidth: 64 }}
            disabled={sending || !prompt.trim()}
            onClick={() => void sendPrompt()}
          >
            {sending ? '...' : 'Kirim'}
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#334155', marginTop: 4 }}>Ctrl+Enter untuk kirim</div>
      </div>
    </FullPanel>
  )
}
