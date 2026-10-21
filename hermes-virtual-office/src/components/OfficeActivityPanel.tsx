'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { fetchJson } from '@/lib/api'
import { useOffice } from '@/lib/store'
import AgentLogPanel from './AgentLogPanel'

// ── Types ──────────────────────────────────────────────────────────────────

type Message = {
  role: 'user' | 'assistant' | 'tool' | 'system'
  content: string
  ts: number
}
type Session = {
  id: string
  agent: string
  title: string
  updatedAt: string
  messageCount: number
}
type FeedEntry = Message & { agent: string }
type ObsUsage = {
  knownCostUsd?: number
  sessions?: number
  tokensIn?: number
  tokensOut?: number
  failure?: boolean
}
type ExiomUsage = {
  totalCostUsd: number
  totalTokensIn: number
  totalTokensOut: number
  perAgent: { agent: string; tokensIn: number; tokensOut: number; costUsd: number }[]
}
type AgentSettingRow = { agent: string; enabled: boolean; updated_at: string }
type TokenPoint = { ts: number; cost: number }    // for sparkline
type AgentActivity = {
  agent: string
  status: 'running' | 'idle' | 'blocked' | 'done'
  lastAction: string
  lastSeen: string | null
  apiCalls: number
  sessionId: string | null
}
type AgentSummary = {
  agent: string
  lastSummary: string
  sessionId: string
  mtime: string | null
  hasLog: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────

const AGENT_COLOR: Record<string, string> = {
  kenzie: '#6366f1', adi: '#10b981', mia: '#e879f9', deril: '#f59e0b',
  gagah: '#8b5cf6', nela: '#ef4444', ale: '#22c55e', joce: '#06b6d4', hugo: '#3b82f6',
}
const AGENT_MODEL: Record<string, string> = {
  kenzie: 'sonnet-5-5', adi: 'haiku-5-5', mia: 'sonnet-5-5', deril: 'haiku-5-5',
  gagah: 'haiku-5-5', nela: 'sonnet-5-5', ale: 'haiku-5-5', joce: 'haiku-5-5', hugo: 'sonnet-5-5',
}
const ALL_AGENTS = ['kenzie','adi','mia','deril','gagah','nela','ale','joce','hugo']

function agentColor(name: string) { return AGENT_COLOR[name.toLowerCase()] ?? '#64748b' }
function initials(name: string) { return name.slice(0, 2).toUpperCase() }
function briefText(text: string, max = 120) {
  const clean = text.replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').trim()
  return clean.length > max ? clean.slice(0, max) + '…' : clean
}
function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
function fmtCost(usd: number) {
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}m`
  return `$${usd.toFixed(4)}`
}

// ── Avatar ─────────────────────────────────────────────────────────────────

function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  const color = agentColor(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color + '33', border: `1.5px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color, flexShrink: 0,
      fontFamily: 'ui-monospace, monospace',
    }}>
      {initials(name)}
    </div>
  )
}

// ── Meter bar ──────────────────────────────────────────────────────────────

function MeterBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 3, background: '#1e2130', borderRadius: 2, overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 2, transition: 'width 0.4s' }} />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function OfficeActivityPanel() {
  const agents  = useOffice(s => s.agents)
  const [sessions, setSessions]         = useState<Session[]>([])
  const [feed, setFeed]                 = useState<FeedEntry[]>([])
  const [usage, setUsage]               = useState<ObsUsage>({})
  const [openAgent, setOpenAgent]       = useState<string | null>(null)
  const [openMsgs, setOpenMsgs]         = useState<Message[]>([])
  const [input, setInput]               = useState('')
  const [sending, setSending]           = useState(false)
  const [tokRate, setTokRate]           = useState(0)
  const [agentEnabled, setAgentEnabled] = useState<Record<string, boolean>>({})
  const [togglingAll, setTogglingAll]   = useState(false)
  const [costHistory, setCostHistory]   = useState<TokenPoint[]>([])
  const [apiStatus, setApiStatus]       = useState<'checking' | 'live' | 'offline'>('checking')
  const [exiomUsage, setExiomUsage]     = useState<ExiomUsage | null>(null)
  const [logAgent, setLogAgent]         = useState<string | null>(null)
  const [logAgentTab, setLogAgentTab]   = useState<'agent' | 'relay'>('relay')
  const [agentActivity, setAgentActivity] = useState<AgentActivity[]>([])
  const [agentSummaries, setAgentSummaries] = useState<AgentSummary[]>([])
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null)
  const prevTokRef = useRef({ val: 0, ts: Date.now(), cost: 0 })
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── Agent settings (enabled/disabled) ────────────────────────────────────
  const loadAgentSettings = useCallback(async () => {
    const res = await fetchJson<{ agents: AgentSettingRow[] }>('/api/exiom/agents')
    if (!res.ok || !res.data?.agents) return
    const map: Record<string, boolean> = {}
    for (const r of res.data.agents) map[r.agent] = r.enabled
    setAgentEnabled(map)
  }, [])

  const toggleAgent = useCallback(async (ag: string, val: boolean) => {
    setAgentEnabled(prev => ({ ...prev, [ag]: val }))
    await fetchJson('/api/exiom/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: ag, enabled: val }),
    })
  }, [])

  const toggleAll = useCallback(async (val: boolean) => {
    setTogglingAll(true)
    const next: Record<string, boolean> = {}
    for (const ag of ALL_AGENTS) next[ag] = val
    setAgentEnabled(next)
    await fetchJson('/api/exiom/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: 'all', enabled: val }),
    })
    setTogglingAll(false)
  }, [])

  // ── LiteLLM health check ─────────────────────────────────────────────────
  const loadHealth = useCallback(async () => {
    const res = await fetchJson<{ live: boolean }>('/api/exiom/litellm-health')
    setApiStatus(res.ok && res.data?.live ? 'live' : 'offline')
  }, [])

  // ── Agent activity from Hermes logs ──────────────────────────────────────
  const loadActivity = useCallback(async () => {
    const res = await fetchJson<{ agents: AgentActivity[] }>('/api/exiom/agent-activity')
    if (res.ok && res.data?.agents) setAgentActivity(res.data.agents)
  }, [])

  // ── Agent work summaries from relay logs ──────────────────────────────────
  const loadSummaries = useCallback(async () => {
    const res = await fetchJson<{ summaries: AgentSummary[] }>('/api/exiom/agent-summaries')
    if (res.ok && res.data?.summaries) setAgentSummaries(res.data.summaries)
  }, [])

  // ── Exiom usage (reads all 9 profile state.db) ────────────────────────────
  const loadExiomUsage = useCallback(async () => {
    const res = await fetchJson<ExiomUsage>('/api/exiom/usage')
    if (res.ok && res.data) {
      setExiomUsage(res.data)
      const cost = res.data.totalCostUsd
      const toks = res.data.totalTokensIn + res.data.totalTokensOut
      const now  = Date.now()
      const dtMin = (now - prevTokRef.current.ts) / 60000
      if (dtMin > 0.1) {
        setTokRate(Math.round((toks - prevTokRef.current.val) / dtMin))
        prevTokRef.current = { val: toks, ts: now, cost }
      }
      setCostHistory(prev => [...prev, { ts: now, cost }].slice(-20))
    }
  }, [])

  // ── Observability ─────────────────────────────────────────────────────────
  const loadObs = useCallback(async () => {
    const res = await fetchJson<{ usage: ObsUsage }>('/api/hermes/observability?days=1&hours=1')
    if (!res.ok || !res.data) return
    const u = res.data.usage ?? {}
    setUsage(u)
    const totalTok = (u.tokensIn ?? 0) + (u.tokensOut ?? 0)
    const costUsdNow = u.knownCostUsd ?? 0
    const now = Date.now()
    const dtMin = (now - prevTokRef.current.ts) / 60000
    if (dtMin > 0.1) {
      setTokRate(Math.round((totalTok - prevTokRef.current.val) / dtMin))
      prevTokRef.current = { val: totalTok, ts: now, cost: costUsdNow }
    }
    // Append to cost history (keep last 20 points)
    setCostHistory(prev => {
      const next = [...prev, { ts: now, cost: costUsdNow }].slice(-20)
      return next
    })
  }, [])

  // ── Sessions + feed ───────────────────────────────────────────────────────
  const loadFeed = useCallback(async () => {
    const res = await fetchJson<{ sessions: Session[] }>('/api/hermes/chat')
    if (!res.ok || !res.data?.sessions) return
    setSessions(res.data.sessions)

    const entries: FeedEntry[] = []
    await Promise.all(
      res.data.sessions.slice(0, 9).map(async (s) => {
        const r = await fetchJson<{ messages: Message[] }>(`/api/hermes/chat?agent=${encodeURIComponent(s.agent)}`)
        if (!r.ok || !r.data?.messages?.length) return
        const last = r.data.messages[r.data.messages.length - 1]
        if (last) entries.push({ ...last, agent: s.agent })
      })
    )
    entries.sort((a, b) => b.ts - a.ts)
    setFeed(entries)
  }, [])

  // ── Open agent chat ───────────────────────────────────────────────────────
  const loadMsgs = useCallback(async (agent: string) => {
    const res = await fetchJson<{ messages: Message[] }>(`/api/hermes/chat?agent=${encodeURIComponent(agent)}`)
    if (res.ok && res.data?.messages) setOpenMsgs(res.data.messages.slice(-40))
  }, [])

  useEffect(() => {
    void loadExiomUsage()
    void loadFeed()
    void loadAgentSettings()
    void loadHealth()
    void loadActivity()
    void loadSummaries()
    const t1 = setInterval(loadExiomUsage, 10_000)
    const t2 = setInterval(loadFeed, 5_000)
    const t3 = setInterval(loadHealth, 30_000)
    const t4 = setInterval(loadActivity, 4_000)
    const t5 = setInterval(loadSummaries, 15_000)
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); clearInterval(t4); clearInterval(t5) }
  }, [loadExiomUsage, loadFeed, loadAgentSettings, loadHealth, loadActivity, loadSummaries])

  useEffect(() => {
    if (!openAgent) return
    void loadMsgs(openAgent)
    const t = setInterval(() => loadMsgs(openAgent), 4000)
    return () => clearInterval(t)
  }, [openAgent, loadMsgs])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [openMsgs])

  const send = async () => {
    if (!input.trim() || sending || !openAgent) return
    setSending(true)
    const msg = input.trim()
    setInput('')
    setOpenMsgs(prev => [...prev, { role: 'user', content: msg, ts: Date.now() }])
    await fetchJson('/api/hermes/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: openAgent, message: msg }),
    })
    setSending(false)
    await loadMsgs(openAgent)
  }

  // Agent status from store
  const agentStatusMap = new Map(agents.map(a => [a.name.toLowerCase(), a.status]))
  const sessionMap = new Map(sessions.map(s => [s.agent.toLowerCase(), s]))
  const summaryMap = new Map(agentSummaries.map(s => [s.agent, s]))

  const BUDGET     = 50
  const totalTok   = exiomUsage
    ? exiomUsage.totalTokensIn + exiomUsage.totalTokensOut
    : (usage.tokensIn ?? 0) + (usage.tokensOut ?? 0)
  const costUsd    = exiomUsage?.totalCostUsd ?? usage.knownCostUsd ?? 0
  const remaining  = Math.max(0, BUDGET - costUsd)
  const activeSessions = sessions.filter(s => {
    const upd = Date.parse(s.updatedAt)
    return Number.isFinite(upd) && Date.now() - upd < 300_000
  })
  const runningAgents = ALL_AGENTS.filter(ag => {
    const enabled  = agentEnabled[ag] !== false
    const activity = agentActivity.find(a => a.agent === ag)
    return enabled && activity?.status === 'running'
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
    <aside className="px-side right" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-sh" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {openAgent ? (
          <>
            <button
              onClick={() => { setOpenAgent(null); setOpenMsgs([]) }}
              style={{ background: 'none', border: 'none', color: 'var(--px-muted)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}
            >←</button>
            <Avatar name={openAgent} size={18} />
            <span className="px-sh-title" style={{ color: agentColor(openAgent) }}>{openAgent.toUpperCase()}</span>
            <span style={{ fontSize: 9, color: 'var(--px-muted)', marginLeft: 2 }}>
              {AGENT_MODEL[openAgent] ?? 'haiku'}
            </span>
          </>
        ) : (
          <>
            <span className="px-sh-title">OFFICE FEED</span>
            <span style={{ marginLeft: 'auto', fontSize: 9, color: activeSessions.length ? '#4ec94e' : 'var(--px-muted)' }}>
              {activeSessions.length} aktif
            </span>
          </>
        )}
      </div>

      {openAgent ? (
        // ── Single agent chat view ──────────────────────────────────────────
        <>
          <div className="px-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {openMsgs.length === 0 && (
              <div style={{ padding: 16, fontSize: 11, color: 'var(--px-muted)', textAlign: 'center' }}>
                Belum ada pesan dari {openAgent}
              </div>
            )}
            {openMsgs.map((m, i) => {
              const isUser = m.role === 'user'
              const color  = isUser ? '#6366f1' : agentColor(openAgent)
              const label  = isUser ? 'Kamu' : openAgent
              return (
                <div key={i} style={{ padding: '6px 12px', borderBottom: '1px solid var(--px-line)' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: color + '33', border: `1.5px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color, flexShrink: 0 }}>
                      {initials(label)}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color }}>{label}</span>
                    {m.role === 'tool' && (
                      <span style={{ fontSize: 9, background: '#1e2130', color: 'var(--px-muted)', padding: '1px 5px', borderRadius: 3 }}>tool</span>
                    )}
                    <span style={{ fontSize: 9, color: 'var(--px-muted)', marginLeft: 'auto' }}>{fmtTime(m.ts)}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--px-text)', lineHeight: 1.5, paddingLeft: 22, wordBreak: 'break-word' }}>
                    {m.role === 'tool'
                      ? <span style={{ color: 'var(--px-muted)', fontStyle: 'italic' }}>{briefText(m.content, 80)}</span>
                      : briefText(m.content, 400)
                    }
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Chat input */}
          <div className="px-chat-input-wrap">
            <input
              className="px-chat-input"
              placeholder={`→ ${openAgent}…`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
              disabled={sending}
            />
            <button className="px-chat-send" onClick={() => void send()} disabled={sending}>
              {sending ? '…' : '↑'}
            </button>
          </div>
        </>
      ) : (
        // ── Office overview ─────────────────────────────────────────────────
        <div className="px-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* ── OFFICE METERS ──────────────────────────────────────────────── */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--px-line)', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Header row: title + API status pill + ALL ON/OFF */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: 'var(--px-muted)' }}>OFFICE METERS</span>
              {/* API status pill */}
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                background: apiStatus === 'live' ? '#4ec94e22' : apiStatus === 'offline' ? '#ef444422' : '#64748b22',
                color:      apiStatus === 'live' ? '#4ec94e'   : apiStatus === 'offline' ? '#ef4444'   : '#64748b',
                border: `1px solid ${apiStatus === 'live' ? '#4ec94e44' : apiStatus === 'offline' ? '#ef444444' : '#64748b44'}`,
                letterSpacing: '.08em',
              }}>
                {apiStatus === 'live' ? '● TOKEN API LIVE' : apiStatus === 'offline' ? '● TOKEN API OFFLINE' : '○ CHECKING…'}
              </span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                <button
                  onClick={() => void toggleAll(true)}
                  disabled={togglingAll}
                  style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, border: '1px solid #4ec94e33', background: '#4ec94e11', color: '#4ec94e', cursor: 'pointer', fontWeight: 600 }}
                >ALL ON</button>
                <button
                  onClick={() => void toggleAll(false)}
                  disabled={togglingAll}
                  style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, border: '1px solid #ef444433', background: '#ef444411', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}
                >ALL OFF</button>
              </span>
            </div>

            {/* Cost + tokens grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
              {/* Budget / cost */}
              <div>
                <div style={{ fontSize: 9, color: 'var(--px-muted)', marginBottom: 3 }}>BIAYA TERPAKAI</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'ui-monospace, monospace', lineHeight: 1,
                  color: costUsd > BUDGET * 0.8 ? '#ef4444' : costUsd > BUDGET * 0.5 ? '#f59e0b' : '#4ec94e',
                }}>
                  {fmtCost(costUsd)}
                </div>
                <div style={{ fontSize: 9, color: 'var(--px-muted)', marginTop: 1 }}>
                  sisa: {fmtCost(remaining)} / ${BUDGET}
                </div>
                <div style={{ marginTop: 5 }}>
                  <MeterBar
                    pct={Math.min(100, costUsd / BUDGET * 100)}
                    color={costUsd / BUDGET > 0.8 ? '#ef4444' : costUsd / BUDGET > 0.5 ? '#f59e0b' : '#4ec94e'}
                  />
                </div>
                {costHistory.length > 1 && (
                  <svg width="100%" height="20" style={{ marginTop: 4, overflow: 'visible' }}>
                    {(() => {
                      const maxC = Math.max(...costHistory.map(p => p.cost), 0.0001)
                      const pts  = costHistory.map((p, i) => {
                        const x = (i / (costHistory.length - 1)) * 100
                        const y = 18 - (p.cost / maxC) * 16
                        return `${x},${y}`
                      }).join(' ')
                      return <polyline points={pts} fill="none" stroke="#4ec94e" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                    })()}
                  </svg>
                )}
              </div>

              {/* Tokens */}
              <div>
                <div style={{ fontSize: 9, color: 'var(--px-muted)', marginBottom: 3 }}>TOKENS (24h)</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b', fontFamily: 'ui-monospace, monospace', lineHeight: 1 }}>
                  {totalTok > 999 ? `${(totalTok / 1000).toFixed(1)}k` : totalTok}
                </div>
                <div style={{ fontSize: 9, color: 'var(--px-muted)', marginTop: 1 }}>
                  {tokRate > 0 ? `~${tokRate.toLocaleString()} tok/min` : 'idle'}
                </div>
                <div style={{ marginTop: 5 }}>
                  <MeterBar pct={Math.min(100, totalTok / 500000 * 100)} color="#f59e0b" />
                </div>
              </div>
            </div>

            {/* Running agents row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, color: 'var(--px-muted)', flexShrink: 0 }}>RUNNING:</span>
              {runningAgents.length === 0 ? (
                <span style={{ fontSize: 9, color: 'var(--px-muted)' }}>tidak ada</span>
              ) : runningAgents.map(ag => (
                <span key={ag} style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                  background: agentColor(ag) + '22', color: agentColor(ag),
                  border: `1px solid ${agentColor(ag)}44`,
                }}>
                  ● {ag}
                </span>
              ))}
            </div>

            <div style={{ fontSize: 9, color: 'var(--px-muted)' }}>
              {sessions.length} session · {activeSessions.length} aktif (5m) ·{' '}
              {ALL_AGENTS.filter(a => agentEnabled[a] !== false).length}/9 enabled
            </div>
          </div>

          {/* ── Agent Status Board (from Hermes logs) ─────────────────────── */}
          <div style={{ borderBottom: '1px solid var(--px-line)' }}>
            <div style={{ padding: '6px 14px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: 'var(--px-muted)' }}>
              STATUS AGENT
            </div>
            {ALL_AGENTS.map(ag => {
              const activity  = agentActivity.find(a => a.agent === ag)
              const sess      = sessionMap.get(ag)
              const color     = agentColor(ag)
              const enabled   = agentEnabled[ag] !== false
              const logStatus = activity?.status ?? 'idle'
              const isRunning = enabled && logStatus === 'running'
              const isBlocked = enabled && logStatus === 'blocked'
              const isDone    = enabled && logStatus === 'done'

              const statusDotColor = isRunning ? color : isBlocked ? '#ef4444' : isDone ? '#f59e0b' : '#2d3748'
              const statusLabel    = isRunning ? 'running' : isBlocked ? 'BLOCKED' : isDone ? 'done' : 'idle'
              const lastActionText = activity?.lastAction ?? (sess ? `${sess.messageCount} msg` : '—')

              return (
                <div key={ag} style={{ borderBottom: '1px solid var(--px-line)11' }}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 14px', opacity: enabled ? 1 : 0.35,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {/* Toggle */}
                    <button
                      onClick={e => { e.stopPropagation(); void toggleAgent(ag, !enabled) }}
                      title={enabled ? 'Matikan' : 'Nyalakan'}
                      style={{
                        width: 24, height: 12, borderRadius: 6, border: 'none', cursor: 'pointer', flexShrink: 0,
                        background: enabled ? agentColor(ag) + '88' : '#2d3748',
                        position: 'relative', transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 2, width: 8, height: 8, borderRadius: '50%',
                        background: enabled ? agentColor(ag) : '#4a5568',
                        left: enabled ? 13 : 3, transition: 'left 0.2s, background 0.2s',
                      }} />
                    </button>

                    {/* Status dot */}
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: statusDotColor,
                      boxShadow: isRunning ? `0 0 6px ${color}` : isBlocked ? '0 0 6px #ef4444' : 'none',
                      animation: isRunning ? 'pulse 1.5s infinite' : 'none',
                    }} />

                    {/* Name */}
                    <button
                      onClick={() => setOpenAgent(ag)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontSize: 11, fontWeight: 700,
                        color: isRunning ? color : isBlocked ? '#ef4444' : isDone ? '#f59e0b66' : 'var(--px-muted)',
                        width: 44, textAlign: 'left', flexShrink: 0,
                      }}
                    >
                      {ag}
                    </button>

                    {/* Status badge */}
                    <span style={{
                      fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
                      background: isRunning ? color + '22' : isBlocked ? '#ef444422' : isDone ? '#f59e0b22' : '#2d374855',
                      color: isRunning ? color : isBlocked ? '#ef4444' : isDone ? '#f59e0b88' : '#4a5568',
                      flexShrink: 0, letterSpacing: '.06em',
                    }}>
                      {statusLabel}
                    </span>

                    {/* API calls counter */}
                    {(activity?.apiCalls ?? 0) > 0 && (
                      <span style={{ fontSize: 8, color: 'var(--px-muted)', flexShrink: 0 }}>
                        #{activity!.apiCalls}
                      </span>
                    )}

                    {/* Summary expand button */}
                    {summaryMap.get(ag)?.hasLog && (
                      <button
                        onClick={e => { e.stopPropagation(); setExpandedSummary(expandedSummary === ag ? null : ag) }}
                        title="Lihat laporan terakhir"
                        style={{
                          flexShrink: 0,
                          background: expandedSummary === ag ? color + '33' : 'none',
                          border: `1px solid ${color}44`,
                          borderRadius: 3, padding: '1px 5px',
                          fontSize: 8, fontWeight: 700, color: color + '99',
                          cursor: 'pointer', letterSpacing: '.06em',
                        }}
                      >
                        {expandedSummary === ag ? '▲' : '▼'}
                      </button>
                    )}

                    {/* CLI Log button */}
                    <button
                      onClick={e => { e.stopPropagation(); setLogAgentTab('relay'); setLogAgent(ag) }}
                      title={`Lihat log kerja ${ag}`}
                      style={{
                        marginLeft: summaryMap.get(ag)?.hasLog ? 0 : 'auto', flexShrink: 0,
                        background: 'none', border: `1px solid ${color}44`,
                        borderRadius: 3, padding: '1px 5px',
                        fontSize: 8, fontWeight: 700, color: color + '99',
                        cursor: 'pointer', letterSpacing: '.06em',
                      }}
                    >
                      LOG
                    </button>
                    {!summaryMap.get(ag)?.hasLog && <span style={{ marginLeft: 'auto' }} />}
                  </div>

                  {/* Inline expanded summary */}
                  {expandedSummary === ag && summaryMap.get(ag)?.hasLog && (
                    <div style={{
                      margin: '0 14px 8px 14px',
                      background: '#0d1117',
                      border: `1px solid ${color}33`,
                      borderRadius: 5,
                      padding: '8px 10px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 8, fontWeight: 700, color: color, letterSpacing: '.1em' }}>
                          LAPORAN TERAKHIR — {summaryMap.get(ag)!.sessionId}
                        </span>
                        {summaryMap.get(ag)!.mtime && (
                          <span style={{ fontSize: 8, color: 'var(--px-muted)' }}>
                            {new Date(summaryMap.get(ag)!.mtime!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 10, color: 'var(--px-text)', lineHeight: 1.6,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        maxHeight: 200, overflowY: 'auto',
                      }}>
                        {summaryMap.get(ag)!.lastSummary}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setLogAgentTab('relay'); setLogAgent(ag) }}
                        style={{
                          marginTop: 6, fontSize: 9, color: color,
                          background: 'none', border: `1px solid ${color}44`,
                          borderRadius: 3, padding: '2px 8px', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        Lihat lengkap →
                      </button>
                    </div>
                  )}

                  {/* Last action — shown when running/blocked */}
                  {enabled && logStatus !== 'idle' && lastActionText !== '—' && expandedSummary !== ag && (
                    <div style={{
                      padding: '0 14px 5px 57px',
                      fontSize: 9, color: isBlocked ? '#ef444488' : 'var(--px-muted)',
                      fontStyle: 'italic', lineHeight: 1.4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {lastActionText}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Agent work history timeline ────────────────────────────── */}
          {agentSummaries.filter(s => s.hasLog).length > 0 && (
            <div style={{ borderBottom: '1px solid var(--px-line)' }}>
              <div style={{ padding: '6px 14px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: 'var(--px-muted)' }}>
                RINGKASAN KERJA TERAKHIR
              </div>
              {agentSummaries
                .filter(s => s.hasLog)
                .sort((a, b) => (b.mtime ?? '').localeCompare(a.mtime ?? ''))
                .map(s => {
                  const color = agentColor(s.agent)
                  const firstLine = s.lastSummary.split('\n').find(l => l.trim().length > 0) ?? ''
                  const isExpanded = expandedSummary === ('summary_' + s.agent)
                  return (
                    <div key={s.agent} style={{ borderBottom: '1px solid var(--px-line)11' }}>
                      <button
                        onClick={() => setExpandedSummary(isExpanded ? null : ('summary_' + s.agent))}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'flex-start', gap: 8,
                          padding: '5px 14px', border: 'none', background: 'none', cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <Avatar name={s.agent} size={18} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 2 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color }}>{s.agent}</span>
                            {s.mtime && (
                              <span style={{ fontSize: 9, color: 'var(--px-muted)', marginLeft: 'auto', flexShrink: 0 }}>
                                {new Date(s.mtime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: 10, color: 'var(--px-text)', lineHeight: 1.4,
                            overflow: 'hidden', display: '-webkit-box',
                            WebkitLineClamp: isExpanded ? 999 : 2,
                            WebkitBoxOrient: 'vertical' as const,
                            whiteSpace: isExpanded ? 'pre-wrap' : undefined,
                          }}>
                            {isExpanded ? s.lastSummary : firstLine}
                          </div>
                        </div>
                        <span style={{ fontSize: 9, color: 'var(--px-muted)', flexShrink: 0, alignSelf: 'center' }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </button>
                      {isExpanded && (
                        <div style={{ padding: '0 14px 8px 14px' }}>
                          <button
                            onClick={e => { e.stopPropagation(); setLogAgentTab('relay'); setLogAgent(s.agent) }}
                            style={{
                              fontSize: 9, color, background: 'none',
                              border: `1px solid ${color}44`, borderRadius: 3,
                              padding: '2px 8px', cursor: 'pointer', fontWeight: 600,
                            }}
                          >
                            Lihat log lengkap →
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}

          {/* ── Unified feed ──────────────────────────────────────────────── */}
          <div style={{ padding: '6px 14px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: 'var(--px-muted)' }}>
            # OFFICE-GENERAL
          </div>
          {feed.length === 0 && (
            <div style={{ padding: '12px 14px', fontSize: 11, color: 'var(--px-muted)' }}>
              Belum ada aktivitas. Mulai agent untuk melihat feed.
            </div>
          )}
          {feed.map((m, i) => {
            const color = agentColor(m.agent)
            return (
              <button
                key={i}
                onClick={() => setOpenAgent(m.agent)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '6px 14px', border: 'none', background: 'none', cursor: 'pointer',
                  textAlign: 'left', borderBottom: '1px solid var(--px-line)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <Avatar name={m.agent} size={22} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color }}>{m.agent}</span>
                    <span style={{ fontSize: 9, color: 'var(--px-muted)' }}>{AGENT_MODEL[m.agent] ?? ''}</span>
                    <span style={{ fontSize: 9, color: 'var(--px-muted)', marginLeft: 'auto' }}>{fmtTime(m.ts)}</span>
                  </div>
                  <div style={{
                    fontSize: 10, color: m.role === 'tool' ? 'var(--px-muted)' : 'var(--px-text)',
                    lineHeight: 1.5, fontStyle: m.role === 'tool' ? 'italic' : 'normal',
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                  }}>
                    {m.role === 'user' && <span style={{ color: 'var(--px-muted)' }}>↑ </span>}
                    {briefText(m.content)}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </aside>

    {/* Log panel — opens when user clicks LOG button on any agent row */}
    <AgentLogPanel
      open={!!logAgent}
      onClose={() => setLogAgent(null)}
      initialAgent={logAgent ?? 'kenzie'}
      initialTab={logAgentTab}
    />
    </>
  )
}
