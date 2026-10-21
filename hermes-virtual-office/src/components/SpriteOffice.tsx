'use client'

import { useState, useEffect } from 'react'
import type { Agent, Task } from '@/types/hermes'
import { useOffice } from '@/lib/store'

// Exported for selftest — wraps a speech bubble string into ≤3 lines of ≤26 chars
export function wrapBubble(text: string, maxLen = 26, maxLines = 3): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const word of words) {
    const slice = word.length > maxLen ? word.slice(0, maxLen) : word
    if (!cur) { cur = slice; continue }
    if (cur.length + 1 + slice.length <= maxLen) {
      cur += ' ' + slice
    } else {
      lines.push(cur)
      if (lines.length >= maxLines) return lines
      cur = slice
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur)
  return lines
}

// ── Agent spots taken from Claude-Office rooms.ts main-office agentSpots ──
// x/y are percentages of the 800×600 room background
const DESK_SPOTS = [
  { id: 'spot-1',  x: 25.8, y: 71.0, facing: 'rear-left'  },
  { id: 'spot-2',  x: 37.9, y: 68.2, facing: 'rear-right' },
  { id: 'spot-3',  x: 26.9, y: 59.2, facing: 'front-left' },
  { id: 'spot-4',  x: 38.5, y: 55.2, facing: 'rear-left'  },
  { id: 'spot-5',  x: 48.9, y: 52.9, facing: 'rear-right' },
  { id: 'spot-6',  x: 38.8, y: 43.6, facing: 'front-left' },
  { id: 'spot-7',  x: 52.7, y: 78.8, facing: 'rear-left'  },
  { id: 'spot-8',  x: 65.9, y: 75.8, facing: 'rear-right' },
  { id: 'spot-9',  x: 55.2, y: 66.8, facing: 'front-left' },
]

// ── Our 9 agents → character sprite base names ──
// sprites live at /sprites/characters/{base}-{facing}.png
// For the 9 Exiom agents we use the generic character set
const AGENT_CHAR: Record<string, string> = {
  kenzie: 'dev-1',
  adi:    'employee-1',   // swapped with mia
  mia:    'dev-2',        // swapped with adi
  deril:  'employee-3',   // swapped with nela
  gagah:  'explore-1',
  nela:   'employee-2',   // swapped with deril
  ale:    'Frontend-dev-1',
  joce:   'security-audit-1',
  hugo:   'Me-1',
}

// ── Furniture items positioned on the room (from Claude-Office rooms.ts) ──
// x/y are percentages of the room; zIndex determines render order
const FURNITURE = [
  { src: '/sprites/furniture/standing-desk-left-rear.png',  x: 42.4, y: 50.4, w: 84, z: 49 },
  { src: '/sprites/furniture/standing-desk-left-front.png', x: 46.7, y: 53.0, w: 84, z: 52 },
  { src: '/sprites/furniture/standing-desk-right-front.png',x: 39.9, y: 55.2, w: 84, z: 54 },
  { src: '/sprites/furniture/standing-desk-left-rear.png',  x: 31.4, y: 64.8, w: 84, z: 63 },
  { src: '/sprites/furniture/standing-desk-left-front.png', x: 35.4, y: 67.5, w: 84, z: 66 },
  { src: '/sprites/furniture/standing-desk-right-front.png',x: 27.9, y: 70.0, w: 84, z: 69 },
  { src: '/sprites/furniture/standing-desk-left-rear.png',  x: 59.0, y: 73.7, w: 84, z: 72 },
  { src: '/sprites/furniture/standing-desk-left-front.png', x: 62.6, y: 76.0, w: 84, z: 75 },
  { src: '/sprites/furniture/standing-desk-right-front.png',x: 55.4, y: 78.7, w: 84, z: 77 },
  { src: '/sprites/furniture/standing-desk-right-rear.png', x: 66.6, y: 71.1, w: 84, z: 70 },
  { src: '/sprites/appliances/coffee-off.png',              x: 78.5, y: 50.2, w: 40, z: 49 },
  { src: '/sprites/furniture/filling-closed.png',           x: 45.0, y: 56.5, w: 42, z: 55 },
  { src: '/sprites/decoration/monstera-plant.png',          x: 91.9, y: 64.7, w: 50, z: 63 },
  { src: '/sprites/decoration/snake-plant.png',             x: 43.2, y: 37.9, w: 40, z: 37 },
  { src: '/sprites/decoration/money-tree.png',              x: 32.0, y: 71.2, w: 42, z: 70 },
  { src: '/sprites/decoration/money-tree.png',              x: 89.2, y: 65.7, w: 42, z: 64 },
  { src: '/sprites/decoration/monstera-plant.png',          x: 60.2, y: 80.4, w: 50, z: 79 },
  { src: '/sprites/decoration/printer-working.png',         x: 85.4, y: 56.8, w: 55, z: 55 },
  { src: '/sprites/culture/todo-board.png',                 x: 80.0, y: 42.0, w: 55, z: 41 },
  { src: '/sprites/decoration/white-board.png',             x: 8.0,  y: 45.0, w: 65, z: 44 },
]

// ── Effect sprites by agent status ──
const STATUS_EFFECT: Record<string, string | null> = {
  working:  '/sprites/effects/typing.png',
  review:   '/sprites/effects/post-it.png',
  blocked:  '/sprites/effects/build-failed.png',
  meeting:  '/sprites/effects/star.png',
  done:     '/sprites/effects/thumb-up.png',
  idle:     null,
}

// ── Status dot colour ──
const STATUS_COLOR: Record<string, string> = {
  working: '#4ec94e',
  review:  '#e8a555',
  blocked: '#e85555',
  meeting: '#9d86e8',
  done:    '#4ec9a0',
  idle:    '#3a3b48',
}

function spriteSrc(agentName: string, facing: string): string {
  const base = AGENT_CHAR[agentName.toLowerCase()] ?? 'employee-1'
  return `/sprites/characters/${base}-${facing}.png`
}

function getTaskText(agentName: string, tasks: Task[]): string {
  const active = tasks.find(
    t => t.assignee?.toLowerCase() === agentName.toLowerCase() &&
         (t.status === 'running' || t.status === 'review'),
  )
  return active?.title ?? ''
}

interface CharProps {
  agent: Agent
  spot: typeof DESK_SPOTS[number]
  tasks: Task[]
  selected: boolean
  onSelect: (name: string) => void
}

function CharSprite({ agent, spot, tasks, selected, onSelect }: CharProps) {
  const facing = spot.facing
  const src = spriteSrc(agent.name, facing)
  const status = (agent as any).status ?? 'idle'
  const effectSrc = STATUS_EFFECT[status] ?? null
  const taskText = getTaskText(agent.name, tasks)
  const dotColor = STATUS_COLOR[status] ?? STATUS_COLOR.idle
  const zIndex = Math.round(spot.y)

  return (
    <div
      style={{
        position: 'absolute',
        left: `${spot.x}%`,
        top: `${spot.y}%`,
        transform: 'translate(-50%, -100%)',
        zIndex: selected ? 120 : zIndex,
        cursor: 'pointer',
      }}
      onClick={() => onSelect(agent.name)}
      title={agent.name}
    >
      {/* Effect bubble */}
      {effectSrc && (
        <img
          src={effectSrc}
          alt={status}
          style={{
            position: 'absolute',
            top: -28,
            right: -14,
            width: 22,
            height: 22,
            zIndex: 2,
            pointerEvents: 'none',
          }}
          draggable={false}
        />
      )}

      {/* Speech bubble (task text) */}
      {taskText && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            background: '#13141acc',
            border: '1px solid #22232d',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 9,
            whiteSpace: 'nowrap',
            color: '#e8a555',
            fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
            pointerEvents: 'none',
            maxWidth: 140,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            zIndex: 3,
          }}
        >
          {taskText}
        </div>
      )}

      {/* Character sprite */}
      <div style={{ position: 'relative' }}>
        {/* selection ring */}
        {selected && (
          <div
            style={{
              position: 'absolute',
              bottom: 2,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 32,
              height: 10,
              borderRadius: '50%',
              background: 'transparent',
              border: '2px solid #9d86e8',
              opacity: 0.8,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        )}

        {/* drop shadow */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 24,
            height: 8,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)',
            pointerEvents: 'none',
          }}
        />

        <img
          src={src}
          alt={agent.name}
          className={status === 'idle' ? 'char-idle-anim' : undefined}
          style={{
            height: 78,
            width: 'auto',
            display: 'block',
            filter: `drop-shadow(0 0 1px ${dotColor}) drop-shadow(0 0 0.5px #000)`,
            imageRendering: 'pixelated',
            animationDelay: `${(agent.name.charCodeAt(0) * 0.37) % 3}s`,
          }}
          draggable={false}
          onError={(e) => {
            // Fallback to employee-1 if sprite not found
            const img = e.currentTarget
            if (!img.src.includes('employee-1')) {
              img.src = `/sprites/characters/employee-1-${facing}.png`
            }
          }}
        />
      </div>

      {/* Name tag */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 9,
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
          letterSpacing: '0.08em',
          color: '#e0e0e6',
          textShadow: '0 1px 3px #000, 0 0 6px #000',
          pointerEvents: 'none',
          marginTop: 2,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: dotColor,
            marginRight: 3,
            verticalAlign: 'middle',
            boxShadow: status !== 'idle' ? `0 0 4px ${dotColor}` : undefined,
          }}
        />
        {agent.name}
      </div>
    </div>
  )
}

export default function SpriteOffice({
  onSelect,
  className,
  hideHud = false,
}: {
  onSelect: (name: string) => void
  className?: string
  hideHud?: boolean
}) {
  const agents   = useOffice(s => s.agents)
  const tasks    = useOffice(s => s.tasks)
  const selected = useOffice(s => s.selectedAgent)
  const isDark   = true // always dark for now; can hook into system preference later

  const bg = isDark ? '/rooms/office-night.png' : '/rooms/office-day.png'

  // Assign each agent to a desk spot in order
  const agentList = agents.slice(0, DESK_SPOTS.length)

  return (
    <div
      className={className ?? 'absolute inset-0 overflow-hidden'}
      aria-label="Kantor pixel 2D"
    >
      {/* Room background */}
      <img
        src={bg}
        alt="Office"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center top',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
        draggable={false}
      />

      {/* HUD overlay */}
      {!hideHud && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 12,
            fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.16em',
            color: '#e0e0e6',
            textShadow: '0 1px 4px #000',
            pointerEvents: 'none',
            zIndex: 200,
          }}
        >
          HERMES OFFICE
        </div>
      )}

      {/* Furniture */}
      {FURNITURE.map((f, i) => (
        <img
          key={i}
          src={f.src}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: f.w,
            transform: 'translate(-50%, -100%)',
            zIndex: f.z,
            imageRendering: 'pixelated',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          draggable={false}
        />
      ))}

      {/* Characters */}
      {agentList.map((agent, i) => (
        <CharSprite
          key={agent.name}
          agent={agent}
          spot={DESK_SPOTS[i]}
          tasks={tasks}
          selected={selected?.toLowerCase() === agent.name.toLowerCase()}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
