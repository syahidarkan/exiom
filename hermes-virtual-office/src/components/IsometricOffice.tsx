'use client'
/**
 * Exiom Isometric Office
 * Same approach as openclaw-office: pixel-art PNG background + HTML label overlays.
 * office.png = 2816×1536 pixel-art scene from openclaw-office repo.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useOffice } from '@/lib/store'

/* ─── Agent default positions (% of container w/h) ─────────── */
const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  kenzie: { x: 22, y: 38 },
  adi:    { x: 37, y: 42 },
  mia:    { x: 54, y: 38 },
  deril:  { x: 69, y: 33 },
  gagah:  { x: 14, y: 55 },
  nela:   { x: 30, y: 58 },
  ale:    { x: 48, y: 55 },
  joce:   { x: 63, y: 58 },
  hugo:   { x: 79, y: 50 },
}

const STATUS_COLOR: Record<string, string> = {
  working: '#ffd700',
  review:  '#f59e0b',
  blocked: '#ef4444',
  meeting: '#a855f7',
  done:    '#22c55e',
  idle:    '#94a3b8',
}

const AGENT_LABELS: Record<string, { label: string; role: string; color: string }> = {
  kenzie: { label: 'Kenzie', role: 'IT Manager',       color: '#00c8ff' },
  adi:    { label: 'Adi',    role: 'Developer',         color: '#3b82f6' },
  mia:    { label: 'Mia',    role: 'Marketing',         color: '#a855f7' },
  deril:  { label: 'Deril', role: 'Editor',             color: '#ec4899' },
  gagah:  { label: 'Gagah', role: 'SEO',                color: '#8b5cf6' },
  nela:   { label: 'Nela',  role: 'PR Manager',         color: '#f59e0b' },
  ale:    { label: 'Ale',   role: 'Client Relations',   color: '#f97316' },
  joce:   { label: 'Joce',  role: 'Acquisition',        color: '#ef4444' },
  hugo:   { label: 'Hugo',  role: 'Finance',            color: '#22c55e' },
}

const LS_KEY = 'exiom-office-label-pos'

function loadSavedPositions(): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

/* ─── Single draggable agent label ─────────────────────────── */
function AgentLabel({
  name, position, isWorking, status, onDragEnd, onClick,
}: {
  name: string
  position: { x: number; y: number }
  isWorking: boolean
  status: string
  onDragEnd: (name: string, x: number, y: number) => void
  onClick: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)
  const info = AGENT_LABELS[name]
  if (!info) return null

  const statusColor = STATUS_COLOR[status] ?? STATUS_COLOR.idle

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: position.x, oy: position.y }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current || !containerRef.current) return
    const parent = containerRef.current.parentElement!.getBoundingClientRect()
    const dx = ((e.clientX - dragStart.current.mx) / parent.width) * 100
    const dy = ((e.clientY - dragStart.current.my) / parent.height) * 100
    const nx = Math.max(2, Math.min(98, dragStart.current.ox + dx))
    const ny = Math.max(2, Math.min(98, dragStart.current.oy + dy))
    onDragEnd(name, nx, ny)
  }
  function onPointerUp(e: React.PointerEvent) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragStart.current = null
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, 0)',
        cursor: 'grab',
        userSelect: 'none',
        zIndex: 20,
      }}
    >
      <div
        style={{
          padding: '4px 10px 4px 6px',
          borderRadius: 20,
          background: 'rgba(10,10,26,0.92)',
          border: `2px solid ${info.color}`,
          boxShadow: isWorking
            ? `0 0 14px ${info.color}, 0 2px 8px rgba(0,0,0,.7)`
            : '0 2px 8px rgba(0,0,0,.7)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(4px)',
          position: 'relative',
        }}
      >
        {/* Status dot */}
        <span style={{
          width: 9, height: 9, borderRadius: '50%',
          background: statusColor,
          display: 'inline-block', flexShrink: 0,
          boxShadow: `0 0 6px ${statusColor}`,
        }} />

        <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>
          {info.label}
        </span>
        <span style={{ color: info.color, fontSize: 10, opacity: 0.85 }}>
          {info.role}
        </span>
      </div>

      {/* Working pulse ring */}
      {isWorking && (
        <div style={{
          position: 'absolute', inset: -4,
          borderRadius: 24,
          border: `2px solid ${info.color}`,
          animation: 'pulse-ring 1.4s ease-out infinite',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}

/* ─── Main component ────────────────────────────────────────── */
export default function IsometricOffice({
  onOpenChat,
}: {
  onOpenChat?: (agentName?: string) => void
}) {
  const agents = useOffice(s => s.agents)
  const [mounted, setMounted] = useState(false)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(DEFAULT_POSITIONS)
  const [time, setTime] = useState('')

  useEffect(() => {
    setMounted(true)
    setTime(new Date().toLocaleTimeString())
    const saved = loadSavedPositions()
    if (Object.keys(saved).length) {
      setPositions(prev => ({ ...prev, ...saved }))
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(t)
  }, [mounted])

  const handleDragEnd = useCallback((name: string, x: number, y: number) => {
    setPositions(prev => {
      const next = { ...prev, [name]: { x, y } }
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const statusOf = useCallback((name: string) => {
    return agents.find(a => a.name === name)?.status ?? 'idle'
  }, [agents])

  const isWorking = useCallback((name: string) => {
    const s = statusOf(name)
    return s === 'working' || s === 'review' || s === 'meeting'
  }, [statusOf])

  if (!mounted) {
    return (
      <div style={{
        position: 'absolute', inset: 0,
        background: '#0d1117',
      }} />
    )
  }

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.6); }
        }
      `}</style>

      <div style={{
        position: 'absolute', inset: 0,
        overflow: 'hidden',
        userSelect: 'none',
      }}>
        {/* Background — pixel-art office PNG */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sprites/office.png"
          alt="Exiom Office"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          draggable={false}
        />

        {/* Agent labels — draggable, same approach as openclaw-office */}
        {Object.keys(AGENT_LABELS).map(name => (
          <AgentLabel
            key={name}
            name={name}
            position={positions[name] ?? DEFAULT_POSITIONS[name] ?? { x: 50, y: 50 }}
            isWorking={isWorking(name)}
            status={statusOf(name)}
            onDragEnd={handleDragEnd}
            onClick={() => onOpenChat?.(name)}
          />
        ))}

        {/* Top-left: LIVE + time */}
        <div style={{
          position: 'absolute', top: 10, left: 12,
          display: 'flex', gap: 8, alignItems: 'center', zIndex: 30,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20,
            background: 'rgba(20,40,20,.8)', border: '1px solid rgba(34,197,94,.5)',
            backdropFilter: 'blur(4px)',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
              animation: 'pulse-ring .9s ease-out infinite', display: 'inline-block',
            }} />
            <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 11, fontFamily: 'monospace' }}>LIVE</span>
          </div>
          <div style={{
            padding: '4px 12px', borderRadius: 8,
            background: 'rgba(10,10,26,.8)', border: '1px solid rgba(0,200,255,.3)',
            backdropFilter: 'blur(4px)',
          }}>
            <span style={{ color: '#00c8ff', fontFamily: 'monospace', fontSize: 11 }}>{time}</span>
          </div>
        </div>

        {/* Top-right: agent count */}
        <div style={{
          position: 'absolute', top: 10, right: 12, zIndex: 30,
        }}>
          <div style={{
            padding: '4px 12px', borderRadius: 8,
            background: 'rgba(10,10,26,.8)', border: '1px solid rgba(139,92,246,.3)',
            backdropFilter: 'blur(4px)',
          }}>
            <span style={{ color: '#a78bfa', fontFamily: 'monospace', fontSize: 11 }}>
              ⚡ {agents.filter(a => a.status === 'working' || a.status === 'review').length} agent aktif
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
