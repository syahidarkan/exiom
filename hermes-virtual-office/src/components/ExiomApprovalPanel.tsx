'use client'

import { useCallback, useEffect, useState } from 'react'
import FullPanel from './FullPanel'
import { fetchJson } from '@/lib/api'

// Extract file path references from action_requested text
function extractFilePaths(text: string): string[] {
  const matches = text.match(/workspace\/[\w/.:\- ]+\.(md|txt|csv|json|py|ts|js|mp4|webm|mp3|wav|png|jpg|jpeg)/g) ?? []
  return [...new Set(matches)]
}

const VIDEO_EXTS = ['.mp4', '.webm', '.mov']
const AUDIO_EXTS = ['.mp3', '.wav']
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp']

interface ApprovalItem {
  id:               string
  agent:            string
  title:            string
  description:      string
  action_requested: string
  priority:         string
  entity_type:      string
  entity_id:        string | null
  status:           string
  created_at:       string
  responded_at?:    string
  owner_response?:  string
  owner_note?:      string
}

const PRIORITY_EMOJI: Record<string, string> = {
  hot_lead:       '🔥',
  crisis:         '🚨',
  budget_change:  '💰',
  proposal:       '📄',
  invoice_overdue:'⏰',
  routine:        '📋',
}

const PRIORITY_COLOR: Record<string, string> = {
  hot_lead:       '#fb923c',
  crisis:         '#f87171',
  budget_change:  '#fbbf24',
  proposal:       '#818cf8',
  invoice_overdue:'#f59e0b',
  routine:        '#64748b',
}

const AGENT_COLOR: Record<string, string> = {
  kenzie: '#38bdf8', adi: '#34d399', mia: '#f472b6',
  deril: '#a78bfa', gagah: '#fb923c', nela: '#f87171',
  ale: '#4ade80', joce: '#facc15', hugo: '#22d3ee',
}

function AgentBadge({ agent }: { agent: string }) {
  const color = AGENT_COLOR[agent.toLowerCase()] ?? '#94a3b8'
  return (
    <span style={{
      background: color + '22', color, border: `1px solid ${color}55`,
      borderRadius: 5, padding: '2px 7px', fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {agent}
    </span>
  )
}

function FilePreview({ path }: { path: string }) {
  const [content, setContent] = useState<string | null>(null)
  const [err, setErr]         = useState<string | null>(null)
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)

  const ext = '.' + path.split('.').pop()!.toLowerCase()
  const isVideo = VIDEO_EXTS.includes(ext)
  const isAudio = AUDIO_EXTS.includes(ext)
  const isImage = IMAGE_EXTS.includes(ext)
  const isBinary = isVideo || isAudio || isImage

  const apiPath = `/api/exiom/workspace-file?path=${encodeURIComponent(path.replace('workspace/', ''))}`

  const load = async () => {
    if (isBinary) { setOpen(v => !v); return }
    if (content !== null) { setOpen(v => !v); return }
    setLoading(true)
    try {
      const res = await fetchJson<{ content: string; lines: number }>(apiPath)
      setContent(res.data?.content ?? '')
      setOpen(true)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const icon = isVideo ? '🎬' : isAudio ? '🎵' : isImage ? '🖼️' : '📄'

  return (
    <div style={{ margin: '6px 14px' }}>
      <button
        onClick={() => void load()}
        style={{
          background: 'none', border: '1px solid #1e293b', borderRadius: 5,
          color: '#818cf8', fontSize: 11, cursor: 'pointer', padding: '3px 10px',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span>{icon}</span>
        <span style={{ fontFamily: 'monospace' }}>{path}</span>
        <span>{loading ? '...' : open ? '▲' : '▼ preview'}</span>
      </button>
      {err && <div style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{err}</div>}
      {open && isVideo && (
        <div style={{ marginTop: 6 }}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            controls
            style={{
              width: '100%', maxHeight: 420, borderRadius: 8,
              background: '#000', border: '1px solid #1e293b',
            }}
          >
            <source src={apiPath} />
            Browser tidak mendukung video.
          </video>
        </div>
      )}
      {open && isAudio && (
        <div style={{ marginTop: 6 }}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls style={{ width: '100%' }}>
            <source src={apiPath} />
          </audio>
        </div>
      )}
      {open && isImage && (
        <div style={{ marginTop: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={apiPath} alt={path}
            style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 8, border: '1px solid #1e293b' }}
          />
        </div>
      )}
      {open && !isBinary && content !== null && (
        <div style={{
          marginTop: 6, background: '#0a0f18', border: '1px solid #1e293b',
          borderRadius: 6, padding: '8px 10px', maxHeight: 320, overflow: 'auto',
          fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
          color: '#94a3b8', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {content}
        </div>
      )}
    </div>
  )
}

export default function ExiomApprovalPanel({
  open, onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [pending, setPending]   = useState<ApprovalItem[]>([])
  const [history, setHistory]   = useState<ApprovalItem[]>([])
  const [tab, setTab]           = useState<'pending' | 'history'>('pending')
  const [loading, setLoading]   = useState(false)
  const [note, setNote]         = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy]         = useState<string | null>(null)
  const [msg, setMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchJson<{ pending: ApprovalItem[]; recent: ApprovalItem[]; count: number }>('/api/exiom/approvals')
      setPending(res.data?.pending ?? [])
      setHistory(res.data?.recent ?? [])
    } catch {
      setPending([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void load()
    const t = setInterval(() => void load(), 15_000)
    return () => clearInterval(t)
  }, [open, load])

  async function respond(id: string, decision: 'approved' | 'rejected') {
    setBusy(id)
    setMsg(null)
    try {
      const res = await fetchJson<{ agentKicked?: string }>('/api/exiom/approvals', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision, note: note[id] || undefined }),
      })
      const item = pending.find(i => i.id === id)
      const kicked = res.data?.agentKicked
      const kickNote = kicked ? ` — ${kicked} dikick untuk lanjut` : ''
      setMsg({ type: 'ok', text: `${decision === 'approved' ? '✅ Diapprove' : '❌ Direject'}: ${item?.title}${kickNote}` })
      setPending(prev => prev.filter(i => i.id !== id))
      setExpanded(null)
      void load()
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  if (!open) return null

  return (
    <FullPanel
      onClose={onClose}
      label="Exiom Approval Queue"
      title={
        <span>
          Approval Queue{' '}
          {pending.length > 0 && (
            <span className="vp-chip" style={{ background: '#ef4444', color: '#fff', marginLeft: 6 }}>
              {pending.length}
            </span>
          )}
        </span>
      }
      actions={
        <button className="vp-btn vp-btn-ghost" onClick={() => void load()} disabled={loading}>
          {loading ? '↻' : '↻ Refresh'}
        </button>
      }
    >
      {msg && (
        <div className={msg.type === 'ok' ? 'vp-ok' : 'vp-err'} style={{ marginBottom: 12 }}>
          {msg.text}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #1e293b', paddingBottom: 0 }}>
        {(['pending', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 14px', fontSize: 13, fontWeight: 600,
              color: tab === t ? '#818cf8' : '#64748b',
              borderBottom: tab === t ? '2px solid #818cf8' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t === 'pending'
              ? `Menunggu${pending.length > 0 ? ` (${pending.length})` : ''}`
              : `Riwayat${history.length > 0 ? ` (${history.length})` : ''}`
            }
          </button>
        ))}
      </div>

      {/* ── PENDING TAB ── */}
      {tab === 'pending' && (
        <>
          {pending.length === 0 && !loading && (
            <div className="vp-muted" style={{ padding: '2rem', textAlign: 'center' }}>
              ✓ Tidak ada yang menunggu approval
            </div>
          )}
          <div className="flex flex-col gap-3">
            {pending.map(item => {
              const pColor = PRIORITY_COLOR[item.priority] ?? '#64748b'
              const isExpanded = expanded === item.id
              const isBusy = busy === item.id
              return (
                <div
                  key={item.id}
                  style={{
                    background: '#111827',
                    border: `1px solid ${isExpanded ? '#3b4a6b' : '#1e293b'}`,
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  {/* Header */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 14px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>
                      {PRIORITY_EMOJI[item.priority] ?? '📋'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 5, lineHeight: 1.3 }}>
                        {item.title}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <AgentBadge agent={item.agent} />
                        <span style={{
                          fontSize: 11, padding: '2px 7px', borderRadius: 5,
                          background: pColor + '22', color: pColor, border: `1px solid ${pColor}44`,
                          fontWeight: 600,
                        }}>
                          {item.priority}
                        </span>
                        <span style={{ fontSize: 11, color: '#475569' }}>
                          {new Date(item.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <span style={{ color: '#475569', flexShrink: 0, fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #1e293b' }}>
                      <div style={{ padding: '12px 14px 0', color: '#94a3b8', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                        {item.description}
                      </div>
                      {/* Action box — prominent */}
                      <div style={{
                        margin: '12px 14px',
                        background: '#0f172a',
                        border: '1px solid #312e81',
                        borderRadius: 8,
                        padding: '10px 12px',
                      }}>
                        <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                          Action yang Diminta
                        </div>
                        <div style={{ color: '#c7d2fe', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {item.action_requested}
                        </div>
                      </div>
                      {/* File preview for any workspace/ paths mentioned */}
                      {extractFilePaths(item.action_requested + ' ' + item.description).map(fp => (
                        <FilePreview key={fp} path={fp} />
                      ))}
                      <div style={{ padding: '0 14px 14px' }}>
                        <textarea
                          placeholder="Catatan untuk agent (opsional)..."
                          value={note[item.id] ?? ''}
                          onChange={e => setNote(prev => ({ ...prev, [item.id]: e.target.value }))}
                          rows={2}
                          className="vp-input"
                          style={{ width: '100%', resize: 'vertical', marginBottom: 10, fontSize: 13, boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="vp-btn"
                            style={{ background: '#16a34a', flex: 1, fontWeight: 700 }}
                            disabled={isBusy}
                            onClick={() => respond(item.id, 'approved')}
                          >
                            {isBusy ? '...' : '✅ Approve'}
                          </button>
                          <button
                            className="vp-btn"
                            style={{ background: '#dc2626', flex: 1, fontWeight: 700 }}
                            disabled={isBusy}
                            onClick={() => respond(item.id, 'rejected')}
                          >
                            {isBusy ? '...' : '❌ Reject'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <>
          {history.length === 0 && !loading && (
            <div className="vp-muted" style={{ padding: '2rem', textAlign: 'center' }}>
              Belum ada riwayat approval
            </div>
          )}
          <div className="flex flex-col gap-2">
            {history.map(item => {
              const approved = item.status === 'approved'
              const isExpanded = expanded === item.id
              return (
                <div
                  key={item.id}
                  style={{
                    background: '#111827',
                    border: `1px solid ${isExpanded ? '#2a3040' : '#1e293b'}`,
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 14px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>
                      {approved ? '✅' : '❌'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: approved ? '#86efac' : '#fca5a5', fontSize: 13, lineHeight: 1.3 }}>
                        {item.title}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                        <AgentBadge agent={item.agent} />
                        {item.responded_at && (
                          <span style={{ fontSize: 11, color: '#475569' }}>
                            {new Date(item.responded_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ color: '#475569', flexShrink: 0, fontSize: 11 }}>{isExpanded ? '▲' : '▼'}</span>
                  </button>
                  {isExpanded && (
                    <div style={{ padding: '0 14px 12px', borderTop: '1px solid #1e293b' }}>
                      <div style={{ paddingTop: 10, color: '#94a3b8', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                        {item.description}
                      </div>
                      <div style={{
                        background: '#0f172a', border: '1px solid #1e293b',
                        borderRadius: 6, padding: '8px 10px',
                      }}>
                        <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                          Action
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {item.action_requested}
                        </div>
                      </div>
                      {item.owner_note && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                          Catatan Owner: {item.owner_note}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </FullPanel>
  )
}
