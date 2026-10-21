'use client'
/**
 * Exiom Virtual Office — main visual
 * Aesthetic: cyberpunk neon-dark (openclaw-office) + agent desks (Claude-Office)
 * Fonts: Orbitron (display), JetBrains Mono (body) via next/font or CDN
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchJson } from '@/lib/api'
import { useOffice } from '@/lib/store'

/* ─── Types ─────────────────────────────────────────────────── */
interface ApprovalItem {
  id: string
  agent: string
  title: string
  priority: string
  created_at: string
}

interface ActivityEntry {
  id: string
  time: string
  agent: string
  message: string
  type: 'task' | 'approval' | 'info' | 'success'
}

interface FlyingCard { id: string; from: string; to: string; label: string; x: number; y: number; tx: number; ty: number }

/* ─── Agent definitions ──────────────────────────────────────── */
const AGENTS = [
  { name: 'kenzie', label: 'Kenzie',  role: 'IT Manager',         color: '#00f5ff', group: 'dev'       },
  { name: 'adi',    label: 'Adi',     role: 'Developer',           color: '#00f5ff', group: 'dev'       },
  { name: 'mia',    label: 'Mia',     role: 'Marketing Mgr',       color: '#9d4edd', group: 'marketing' },
  { name: 'deril',  label: 'Deril',   role: 'Editor',              color: '#9d4edd', group: 'marketing' },
  { name: 'gagah',  label: 'Gagah',   role: 'SEO Researcher',      color: '#9d4edd', group: 'marketing' },
  { name: 'nela',   label: 'Nela',    role: 'PR Manager',          color: '#ffd700', group: 'pr'        },
  { name: 'ale',    label: 'Ale',     role: 'Client Relations',    color: '#ffd700', group: 'pr'        },
  { name: 'joce',   label: 'Joce',    role: 'Acquisition',         color: '#ffd700', group: 'pr'        },
  { name: 'hugo',   label: 'Hugo',    role: 'Finance',             color: '#39ff14', group: 'finance'   },
]

const PRIORITY_COLOR: Record<string, string> = {
  hot_lead: '#ff6b35', crisis: '#ff0040', budget_change: '#ffd700',
  proposal: '#00f5ff', invoice_overdue: '#ff6b35', routine: '#9d4edd',
}

/* ─── Utils ─────────────────────────────────────────────────── */
function now() {
  return new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/* ─── Component ─────────────────────────────────────────────── */
export default function ExiomOffice({
  onOpenApproval,
  onOpenChat,
}: {
  onOpenApproval?: () => void
  onOpenChat?: () => void
}) {
  const tasks   = useOffice(s => s.tasks)
  const agents  = useOffice(s => s.agents)

  const [pending,   setPending]   = useState<ApprovalItem[]>([])
  const [activity,  setActivity]  = useState<ActivityEntry[]>([])
  const [flying,    setFlying]    = useState<FlyingCard[]>([])
  const [clock,     setClock]     = useState(now())
  const [scanning,  setScanning]  = useState(false)
  const officeRef = useRef<HTMLDivElement>(null)

  /* clock */
  useEffect(() => {
    const t = setInterval(() => setClock(now()), 1000)
    return () => clearInterval(t)
  }, [])

  /* approval queue */
  const loadApprovals = useCallback(async () => {
    try {
      const r = await fetchJson<{ pending: ApprovalItem[] }>('/api/exiom/approvals')
      setPending(r.data?.pending ?? [])
    } catch { /* offline */ }
  }, [])
  useEffect(() => {
    void loadApprovals()
    const t = setInterval(() => void loadApprovals(), 20_000)
    return () => clearInterval(t)
  }, [loadApprovals])

  /* fake activity feed seeded from real tasks + approvals */
  useEffect(() => {
    const entries: ActivityEntry[] = []
    const live = tasks.filter(t => t.status !== 'archived').slice(0, 4)
    live.forEach((t, i) => {
      entries.push({
        id: `t${i}`,
        time: now(),
        agent: (t as unknown as Record<string, string>).agentId ?? t.assignee ?? 'system',
        message: `[${t.status.toUpperCase()}] ${t.title}`,
        type: t.status === 'done' ? 'success' : t.status === 'blocked' ? 'approval' : 'task',
      })
    })
    pending.slice(0, 3).forEach((p, i) => {
      entries.push({
        id: `p${i}`, time: now(), agent: p.agent,
        message: `PENDING APPROVAL: ${p.title}`,
        type: 'approval',
      })
    })
    if (entries.length === 0)
      entries.push({ id: 'boot', time: now(), agent: 'system', message: 'Exiom Virtual Office online', type: 'info' })
    setActivity(entries.slice(0, 8))
  }, [tasks, pending])

  /* flying task card trigger (demo: every 12s pick two random agents) */
  useEffect(() => {
    const spawn = () => {
      if (!officeRef.current) return
      const rect   = officeRef.current.getBoundingClientRect()
      const from   = AGENTS[Math.floor(Math.random() * AGENTS.length)]
      const to     = AGENTS.filter(a => a.name !== from.name)[Math.floor(Math.random() * 8)]
      const labels = ['TASK', 'REVIEW', 'BRIEF', 'REPORT', 'APPROVAL', 'UPDATE']
      const card: FlyingCard = {
        id: `f${Date.now()}`,
        from: from.name, to: to.name,
        label: labels[Math.floor(Math.random() * labels.length)],
        x: 20 + Math.random() * 40,
        y: 20 + Math.random() * 50,
        tx: 20 + Math.random() * 40,
        ty: 20 + Math.random() * 50,
      }
      setFlying(prev => [...prev.slice(-4), card])
      setTimeout(() => setFlying(prev => prev.filter(f => f.id !== card.id)), 2500)
    }
    const t = setInterval(spawn, 12_000)
    return () => clearInterval(t)
  }, [])

  const running = tasks.filter(t => t.status === 'running').length
  const done    = tasks.filter(t => t.status === 'done').length
  const live    = tasks.filter(t => t.status !== 'archived').length

  return (
    <div
      ref={officeRef}
      style={{
        position: 'relative', width: '100%', height: '100%',
        background: '#050508',
        overflow: 'hidden',
        fontFamily: '"JetBrains Mono", "Fira Mono", monospace',
      }}
    >
      {/* ── Grid overlay ────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(0,245,255,.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* ── Scanline overlay ────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.1) 2px, rgba(0,0,0,.1) 4px)',
      }} />

      {/* ── Top-left HUD: clock + live indicator ─────────── */}
      <div style={{
        position: 'absolute', top: 18, left: 20, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,0,0,.7)', border: '1px solid #00f5ff30',
          borderRadius: 6, padding: '5px 12px',
          boxShadow: '0 0 12px #00f5ff20',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: '#39ff14',
            boxShadow: '0 0 8px #39ff14', animation: 'pulse 1.4s ease infinite',
            display: 'inline-block',
          }} />
          <span style={{ color: '#39ff14', fontSize: 11, letterSpacing: '0.15em' }}>LIVE</span>
          <span style={{ color: '#00f5ff', fontSize: 11, fontFamily: 'monospace' }}>{clock} WIB</span>
        </div>
        <div style={{ color: '#ffffff40', fontSize: 10, paddingLeft: 4, letterSpacing: '0.1em' }}>
          EXIOM VIRTUAL OFFICE
        </div>
      </div>

      {/* ── Top-right HUD: pending approvals ─────────────── */}
      {pending.length > 0 && (
        <button
          onClick={onOpenApproval}
          style={{
            position: 'absolute', top: 18, right: 20, zIndex: 10,
            background: 'rgba(0,0,0,.8)', border: '1px solid #ff6b3560',
            borderRadius: 6, padding: '6px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 0 16px #ff6b3530',
            animation: 'borderGlow 2s ease infinite',
          }}
        >
          <span style={{ fontSize: 14 }}>⚠</span>
          <span style={{ color: '#ff6b35', fontSize: 11, letterSpacing: '0.1em' }}>
            {pending.length} PENDING
          </span>
        </button>
      )}

      {/* ── Main office area ─────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: '60px', left: 0, right: '260px', bottom: '80px',
        zIndex: 5,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: '0 20px',
      }}>
        {/* Office title */}
        <div style={{
          fontSize: 11, color: '#ffffff20', letterSpacing: '0.3em',
          textTransform: 'uppercase', marginBottom: 4,
          fontFamily: '"Orbitron", sans-serif',
        }}>
          ◈ 9 AI AGENTS ONLINE ◈
        </div>

        {/* Agent desks 3×3 grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          width: '100%',
          maxWidth: 760,
        }}>
          {AGENTS.map(agent => {
            const hermesAgent = agents.find(a => a.name === agent.name)
            const status = hermesAgent?.status ?? 'idle'
            const hasPending = pending.some(p => p.agent === agent.name)
            const isWorking  = status === 'working'
            const dotColor   = isWorking ? '#39ff14'
              : status === 'review'  ? '#ffd700'
              : status === 'blocked' ? '#ff0040'
              : agent.color + '60'

            return (
              <div
                key={agent.name}
                onClick={onOpenChat}
                style={{
                  background: 'rgba(0,0,0,.75)',
                  border: `1px solid ${hasPending ? '#ff6b3560' : agent.color + '25'}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'border-color .2s, box-shadow .2s',
                  boxShadow: isWorking ? `0 0 18px ${agent.color}20` : 'none',
                  backdropFilter: 'blur(4px)',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = agent.color
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 24px ${agent.color}40`
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = hasPending ? '#ff6b3560' : agent.color + '25'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = isWorking ? `0 0 18px ${agent.color}20` : 'none'
                }}
              >
                {/* Status dot */}
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 8, height: 8, borderRadius: '50%',
                  background: dotColor,
                  boxShadow: isWorking ? `0 0 8px ${dotColor}` : 'none',
                }} />

                {/* Pending badge */}
                {hasPending && (
                  <div style={{
                    position: 'absolute', top: -6, right: 20,
                    background: '#ff6b35', borderRadius: 3,
                    fontSize: 9, color: '#000', padding: '1px 4px',
                    fontWeight: 700, letterSpacing: '0.05em',
                  }}>
                    PENDING
                  </div>
                )}

                {/* Agent name */}
                <div style={{
                  fontSize: 13, fontWeight: 700, color: agent.color,
                  letterSpacing: '0.05em', marginBottom: 2,
                  fontFamily: '"Orbitron", "JetBrains Mono", monospace',
                  textShadow: `0 0 8px ${agent.color}60`,
                }}>
                  {agent.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 10, color: '#ffffff40', letterSpacing: '0.05em' }}>
                  {agent.role}
                </div>

                {/* Current task if known */}
                {hermesAgent?.currentTaskId && (
                  <div style={{
                    marginTop: 6, fontSize: 9, color: '#ffffff30',
                    borderTop: `1px solid ${agent.color}15`, paddingTop: 5,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {isWorking ? '▶ ' : '• '}{tasks.find(t => t.id === hermesAgent.currentTaskId)?.title ?? ''}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Flying task cards ────────────────────────────── */}
      {flying.map(card => (
        <div
          key={card.id}
          style={{
            position: 'absolute',
            left: `${card.x}%`, top: `${card.y}%`,
            zIndex: 20,
            background: 'rgba(0,245,255,.12)',
            border: '1px solid #00f5ff80',
            borderRadius: 4,
            padding: '3px 8px',
            fontSize: 9,
            color: '#00f5ff',
            letterSpacing: '0.15em',
            boxShadow: '0 0 12px #00f5ff40',
            animation: 'flyCard 2.2s ease forwards',
            pointerEvents: 'none',
            backdropFilter: 'blur(2px)',
          }}
        >
          ▶ {card.label}
        </div>
      ))}

      {/* ── Right panel: Activity Log ─────────────────────── */}
      <div style={{
        position: 'absolute',
        top: 0, right: 0, width: 256,
        bottom: 0, zIndex: 8,
        background: 'rgba(5,5,8,.92)',
        borderLeft: '1px solid #00f5ff15',
        display: 'flex', flexDirection: 'column',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          padding: '14px 14px 10px',
          borderBottom: '1px solid #00f5ff15',
          fontSize: 10, color: '#00f5ff',
          letterSpacing: '0.2em',
          fontFamily: '"Orbitron", monospace',
        }}>
          ◈ ACTIVITY LOG
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {activity.map(a => {
            const c = a.type === 'success' ? '#39ff14'
              : a.type === 'approval' ? '#ff6b35'
              : a.type === 'task' ? '#00f5ff'
              : '#ffffff40'
            return (
              <div key={a.id} style={{ padding: '6px 14px', borderBottom: '1px solid #ffffff05' }}>
                <div style={{ fontSize: 9, color: '#ffffff25', marginBottom: 2 }}>
                  {a.time} · <span style={{ color: c + 'cc' }}>{a.agent}</span>
                </div>
                <div style={{ fontSize: 10, color: c, lineHeight: 1.4 }}>
                  {a.message}
                </div>
              </div>
            )
          })}
        </div>

        {/* Approval CTA in activity panel */}
        {pending.length > 0 && (
          <button
            onClick={onOpenApproval}
            style={{
              margin: 10, padding: '8px',
              background: 'rgba(255,107,53,.15)',
              border: '1px solid #ff6b3560',
              borderRadius: 6, cursor: 'pointer',
              color: '#ff6b35', fontSize: 10,
              letterSpacing: '0.1em',
              boxShadow: '0 0 12px #ff6b3520',
            }}
          >
            ⚠ {pending.length} PENDING APPROVAL
          </button>
        )}
      </div>

      {/* ── Bottom stats bar ─────────────────────────────── */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 256,
        height: 72, zIndex: 8,
        background: 'rgba(5,5,8,.92)',
        borderTop: '1px solid #00f5ff15',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 24,
        backdropFilter: 'blur(8px)',
      }}>
        {[
          { label: 'TASKS LIVE',  value: String(live),     color: '#00f5ff' },
          { label: 'RUNNING',     value: String(running),   color: '#39ff14' },
          { label: 'DONE',        value: String(done),       color: '#9d4edd' },
          { label: 'APPROVALS',   value: String(pending.length), color: pending.length > 0 ? '#ff6b35' : '#ffffff30' },
          { label: 'AGENTS',      value: '9',                color: '#00f5ff' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 80 }}>
            <div style={{
              fontSize: 18, fontWeight: 700, color: s.color,
              fontFamily: '"Orbitron", monospace',
              textShadow: `0 0 10px ${s.color}60`,
            }}>
              {s.value}
            </div>
            <div style={{ fontSize: 9, color: '#ffffff30', letterSpacing: '0.15em' }}>
              {s.label}
            </div>
          </div>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={onOpenChat}
            style={{
              padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
              background: 'rgba(0,245,255,.1)', border: '1px solid #00f5ff40',
              color: '#00f5ff', fontSize: 10, letterSpacing: '0.1em',
              boxShadow: '0 0 8px #00f5ff20',
            }}
          >
            ◈ CHAT
          </button>
          {pending.length > 0 && (
            <button
              onClick={onOpenApproval}
              style={{
                padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(255,107,53,.15)', border: '1px solid #ff6b3560',
                color: '#ff6b35', fontSize: 10, letterSpacing: '0.1em',
                animation: 'borderGlow 2s ease infinite',
              }}
            >
              ⚠ APPROVE
            </button>
          )}
        </div>
      </div>

      {/* ── CSS animations ──────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .5; transform: scale(.8); }
        }
        @keyframes borderGlow {
          0%, 100% { box-shadow: 0 0 8px #ff6b3520; }
          50% { box-shadow: 0 0 20px #ff6b3550; }
        }
        @keyframes flyCard {
          0%   { opacity: 0; transform: translateY(4px) scale(.9); }
          15%  { opacity: 1; transform: translateY(0) scale(1); }
          80%  { opacity: 1; transform: translateY(-8px) scale(1); }
          100% { opacity: 0; transform: translateY(-20px) scale(.85); }
        }
      `}</style>
    </div>
  )
}
