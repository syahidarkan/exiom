'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchJson } from '@/lib/api'

interface AgentCard {
  name: string
  displayName: string
  role: string
  group: 'dev' | 'marketing' | 'pr' | 'finance'
  emoji: string
  status?: 'idle' | 'working' | 'review' | 'blocked' | 'offline'
  currentTask?: string
}

interface ApprovalItem {
  id: string
  agent: string
  title: string
  priority: string
  created_at: string
}

const AGENTS: AgentCard[] = [
  { name: 'kenzie', displayName: 'Kenzie',  role: 'IT Manager',         group: 'dev',       emoji: '🖥️'  },
  { name: 'adi',    displayName: 'Adi',     role: 'Developer',           group: 'dev',       emoji: '⚙️'  },
  { name: 'mia',    displayName: 'Mia',     role: 'Marketing Manager',   group: 'marketing', emoji: '📣'  },
  { name: 'deril',  displayName: 'Deril',   role: 'Editor',              group: 'marketing', emoji: '✏️'  },
  { name: 'gagah',  displayName: 'Gagah',   role: 'SEO Researcher',      group: 'marketing', emoji: '🔍'  },
  { name: 'nela',   displayName: 'Nela',    role: 'PR Manager',          group: 'pr',        emoji: '📋'  },
  { name: 'ale',    displayName: 'Ale',     role: 'Client Relations',    group: 'pr',        emoji: '💬'  },
  { name: 'joce',   displayName: 'Joce',    role: 'Client Acquisition',  group: 'pr',        emoji: '🎯'  },
  { name: 'hugo',   displayName: 'Hugo',    role: 'Finance',             group: 'finance',   emoji: '💰'  },
]

const GROUP_LABEL: Record<string, string> = {
  dev:       'Dev',
  marketing: 'Marketing',
  pr:        'PR & Sales',
  finance:   'Finance',
}

const GROUP_COLOR: Record<string, string> = {
  dev:       '#6366f1',
  marketing: '#10b981',
  pr:        '#f59e0b',
  finance:   '#3b82f6',
}

const PRIORITY_EMOJI: Record<string, string> = {
  hot_lead:       '🔥',
  crisis:         '🚨',
  budget_change:  '💰',
  proposal:       '📄',
  invoice_overdue:'⏰',
  routine:        '📋',
}

function StatusDot({ status }: { status?: string }) {
  const color = status === 'working' ? '#22c55e'
    : status === 'review'   ? '#f59e0b'
    : status === 'blocked'  ? '#ef4444'
    : status === 'offline'  ? '#374151'
    : '#4b5563'  // idle/unknown
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8,
      borderRadius: '50%', background: color, flexShrink: 0,
      boxShadow: status === 'working' ? `0 0 6px ${color}` : 'none',
    }} />
  )
}

export default function ExiomDashboard({
  onOpenChat,
  onOpenApproval,
}: {
  onOpenChat?: (agentName?: string) => void
  onOpenApproval?: () => void
}) {
  const [pending, setPending] = useState<ApprovalItem[]>([])
  const [agentStatus, setAgentStatus] = useState<Record<string, AgentCard['status']>>({})
  const [clock, setClock] = useState('')

  // WIB clock
  useEffect(() => {
    const tick = () => {
      setClock(new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const loadApprovals = useCallback(async () => {
    try {
      const res = await fetchJson<{ pending: ApprovalItem[] }>('/api/exiom/approvals')
      setPending(res.data?.pending ?? [])
    } catch { setPending([]) }
  }, [])

  useEffect(() => {
    void loadApprovals()
    const t = setInterval(() => void loadApprovals(), 20_000)
    return () => clearInterval(t)
  }, [loadApprovals])

  const groups = ['dev', 'marketing', 'pr', 'finance'] as const

  return (
    <div style={{
      height: '100%', width: '100%', overflow: 'auto',
      background: '#0b0e14',
      padding: '24px 28px',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>

      {/* ── Header ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.5px' }}>
            Exiom <span style={{ color: '#6366f1' }}>Virtual Office</span>
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#475569' }}>
            9 AI agents · semua siap saat LiteLLM port 4001 aktif
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: '#64748b', fontFamily: 'monospace' }}>{clock} WIB</div>
          {pending.length > 0 && (
            <button
              onClick={() => onOpenApproval?.()}
              style={{
                marginTop: 4, padding: '4px 12px', fontSize: 12,
                background: '#ef444420', border: '1px solid #ef4444',
                borderRadius: 6, color: '#ef4444', cursor: 'pointer',
              }}
            >
              🔔 {pending.length} pending approval
            </button>
          )}
        </div>
      </div>

      {/* ── Agent Groups ─────────────────────────── */}
      {groups.map(group => {
        const groupAgents = AGENTS.filter(a => a.group === group)
        const color = GROUP_COLOR[group]
        return (
          <div key={group}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            }}>
              <div style={{ width: 3, height: 16, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {GROUP_LABEL[group]}
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
            }}>
              {groupAgents.map(agent => {
                const status = agentStatus[agent.name] ?? 'idle'
                const hasPending = pending.some(p => p.agent === agent.name)
                return (
                  <div
                    key={agent.name}
                    style={{
                      background: '#111827',
                      border: `1px solid ${hasPending ? '#f59e0b40' : '#1f2937'}`,
                      borderRadius: 12,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                      position: 'relative',
                    }}
                    onClick={() => onOpenChat?.(agent.name)}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = `${color}60`)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = hasPending ? '#f59e0b40' : '#1f2937')}
                  >
                    {hasPending && (
                      <div style={{
                        position: 'absolute', top: 10, right: 12,
                        fontSize: 10, background: '#f59e0b20', color: '#f59e0b',
                        border: '1px solid #f59e0b40', borderRadius: 4, padding: '1px 5px',
                      }}>
                        pending
                      </div>
                    )}
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{agent.emoji}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <StatusDot status={status} />
                      <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>
                        {agent.displayName}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{agent.role}</div>
                    {agent.currentTask && (
                      <div style={{
                        marginTop: 8, fontSize: 11, color: '#94a3b8',
                        borderTop: '1px solid #1f2937', paddingTop: 8,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        → {agent.currentTask}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* ── Pending Approvals Preview ─────────────── */}
      {pending.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: '#ef4444' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Approval Queue ({pending.length})
            </span>
            <button
              onClick={() => onOpenApproval?.()}
              style={{
                marginLeft: 'auto', padding: '3px 10px', fontSize: 11,
                background: 'transparent', border: '1px solid #374151',
                borderRadius: 5, color: '#94a3b8', cursor: 'pointer',
              }}
            >
              Lihat semua →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pending.slice(0, 5).map(item => (
              <div
                key={item.id}
                style={{
                  background: '#111827', border: '1px solid #1f2937', borderRadius: 8,
                  padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer',
                }}
                onClick={() => onOpenApproval?.()}
              >
                <span style={{ fontSize: 16 }}>{PRIORITY_EMOJI[item.priority] ?? '📋'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>dari {item.agent}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── System Status ─────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: '#475569' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Infrastruktur
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {[
            { label: 'LiteLLM (4001)', hint: 'Proxy model bisnis' },
            { label: 'PostgreSQL (5432)', hint: 'Approval queue, leads' },
            { label: 'Dashboard (3001)', hint: 'Next.js web UI' },
            { label: 'WAHA WA (3000)', hint: 'WhatsApp Ale (CS)' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#111827', border: '1px solid #1f2937',
              borderRadius: 8, padding: '10px 12px',
            }}>
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: '#475569' }}>{s.hint}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: '#374151' }}>
          Jalankan <code style={{ background: '#1f2937', padding: '1px 5px', borderRadius: 3, color: '#94a3b8' }}>bash scripts/start-exiom.sh</code> setelah restart PC
        </div>
      </div>
    </div>
  )
}
