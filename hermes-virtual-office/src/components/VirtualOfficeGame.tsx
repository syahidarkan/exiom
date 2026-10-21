'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useOffice } from '@/lib/store'
import type { Activity, ActivityType } from '@/lib/office/behavior'
import { buildGrid, findPath } from '@/lib/office/pathfind'

const WORLD_W = 8349
const WORLD_H = 4498
const CHAR_H  = 345   // 230 * 1.5
const STORAGE_KEY = 'exiom-map-data-v2'
const AGENT_STATE_KEY = 'exiom-agent-state-v1'
const ACTIVITY_POLL_MS = 3000
/** World-pixels per second character walk speed */
const WALK_SPEED = 320

// ── Types ──────────────────────────────────────────────────────────────────

type EditorMode = 'view' | 'wall' | 'place' | 'spot' | 'erase'
type ObjType =
  | 'desk' | 'chair' | 'sofa' | 'pray_mat' | 'wudu' | 'dining'
  | 'swim' | 'bar' | 'kanban' | 'server' | 'whiteboard' | 'plant' | 'locker'

interface Wall   { id: string; x1: number; y1: number; x2: number; y2: number }
interface Placed { id: string; type: ObjType; x: number; y: number }
interface MapData {
  walls: Wall[]
  objects: Placed[]
  agentSpots: Record<string, { x: number; y: number }>
}

// ── Object palette ─────────────────────────────────────────────────────────

const OBJ: Record<ObjType, { label: string; color: string; emoji: string; size: number }> = {
  desk:       { label: 'Desk',         color: '#3b82f6', emoji: '🖥',  size: 160 },
  chair:      { label: 'Kursi',        color: '#6b7280', emoji: '🪑',  size: 100 },
  sofa:       { label: 'Sofa',         color: '#8b5cf6', emoji: '🛋',  size: 200 },
  pray_mat:   { label: 'Sajadah',      color: '#22c55e', emoji: '🟩',  size: 130 },
  wudu:       { label: 'Keran Wudu',   color: '#06b6d4', emoji: '💧',  size: 110 },
  dining:     { label: 'Meja Makan',   color: '#f59e0b', emoji: '🍽',  size: 180 },
  swim:       { label: 'Kolam',        color: '#0ea5e9', emoji: '🏊',  size: 350 },
  bar:        { label: 'Bar Counter',  color: '#8b5cf6', emoji: '🍹',  size: 180 },
  kanban:     { label: 'Kanban Board', color: '#f97316', emoji: '📋',  size: 160 },
  server:     { label: 'Server Rack',  color: '#64748b', emoji: '🗄',  size: 130 },
  whiteboard: { label: 'Papan Tulis',  color: '#e879f9', emoji: '🪟',  size: 180 },
  plant:      { label: 'Tanaman',      color: '#16a34a', emoji: '🌿',  size: 80  },
  locker:     { label: 'Loker',        color: '#b45309', emoji: '🔐',  size: 120 },
}

const OBJ_KEYS = Object.keys(OBJ) as ObjType[]

// ── Rooms ──────────────────────────────────────────────────────────────────

interface RoomDef {
  id: string; label: string; asset: string
  x: number; y: number; w: number; h: number
  defaultSpots: Record<string, { xPct: number; yPct: number }>
}

const ROOMS: RoomDef[] = [
  { id: 'ruang_bos',               label: 'Ruang Bos',              asset: '/rooms/ruang_bos.png',               x: 1307, y: 0,    w: 2433, h: 1358, defaultSpots: { owner:  { xPct: 0.50, yPct: 0.52 } } },
  { id: 'ruang_creator',           label: 'Ruang Creator',          asset: '/rooms/ruang_creator.png',           x: 3358, y: 58,   w: 2220, h: 1239, defaultSpots: { deril:  { xPct: 0.50, yPct: 0.55 } } },
  { id: 'ruang_editor',            label: 'Ruang Editor',           asset: '/rooms/ruang_editor.png',            x: 3977, y: 410,  w: 2158, h: 1204, defaultSpots: {} },
  { id: 'ruang_wudhu',             label: 'Ruang Wudhu',            asset: '/rooms/ruang_wudhu.png',             x: 5436, y: 810,  w: 2375, h: 1326, defaultSpots: {} },
  { id: 'ruang_sholat',            label: 'Musholla',               asset: '/rooms/ruang_sholat.png',            x: 4946, y: 1193, w: 2101, h: 1569, defaultSpots: {} },
  { id: 'ruang_meeting',           label: 'Ruang Meeting',          asset: '/rooms/ruang_meeting.png',           x: 2720, y: 866,  w: 1706, h: 1274, defaultSpots: {} },
  { id: 'ruang_manager_pr',        label: 'Ruang Manager PR',       asset: '/rooms/ruang_manager_pr.png',        x: 558,  y: 1116, w: 1583, h: 863,  defaultSpots: { nela:   { xPct: 0.58, yPct: 0.52 } } },
  { id: 'ruang_manager_marketing', label: 'Ruang Manager Marketing',asset: '/rooms/ruang_manager_marketing.png', x: 0,    y: 1399, w: 1583, h: 863,  defaultSpots: { mia:    { xPct: 0.58, yPct: 0.52 } } },
  { id: 'ruang_developer',         label: 'Ruang Developer',        asset: '/rooms/ruang_developer.png',         x: 1642, y: 1564, w: 1575, h: 1176, defaultSpots: { adi:    { xPct: 0.50, yPct: 0.56 } } },
  { id: 'ruang_kerja_umum',        label: 'Ruang Kerja Umum',       asset: '/rooms/ruang_kerja_umum.png',        x: 2984, y: 1944, w: 2289, h: 1248, defaultSpots: { gagah:  { xPct: 0.50, yPct: 0.55 } } },
  { id: 'ruang_manager_it',        label: 'Ruang Manager IT',       asset: '/rooms/ruang_manager_it.png',        x: 205,  y: 2284, w: 2068, h: 1154, defaultSpots: { kenzie: { xPct: 0.55, yPct: 0.50 } } },
  { id: 'kolam_bar',               label: 'Kolam + Bar',            asset: '/rooms/kolam_bar.png',               x: 5468, y: 2047, w: 2881, h: 1608, defaultSpots: {} },
  { id: 'ruang_makan',             label: 'Ruang Makan',            asset: '/rooms/ruang_makan.png',             x: 3643, y: 2521, w: 3543, h: 1977, defaultSpots: {} },
  { id: 'resepsionis',             label: 'Resepsionis',            asset: '/rooms/resepsionis.png',             x: 1642, y: 2788, w: 2955, h: 1649, defaultSpots: { ale: { xPct: 0.38, yPct: 0.50 }, joce: { xPct: 0.62, yPct: 0.57 } } },
]

const AGENT_ROOM: Record<string, string> = {
  owner: 'ruang_bos', kenzie: 'ruang_manager_it', adi: 'ruang_developer',
  mia: 'ruang_manager_marketing', deril: 'ruang_creator', gagah: 'ruang_kerja_umum',
  nela: 'ruang_manager_pr', ale: 'resepsionis', joce: 'resepsionis', hugo: 'ruang_kerja_umum',
}

// ── Agent metadata ─────────────────────────────────────────────────────────

const AGENT_ROLE_SHORT: Record<string, string> = {
  owner:  'Owner',
  kenzie: 'Manager IT',
  adi:    'Developer',
  mia:    'Manager Marketing',
  deril:  'Content Creator',
  gagah:  'SEO Researcher',
  nela:   'Manager PR',
  ale:    'Client Relations',
  joce:   'Client Acquisition',
  hugo:   'Finance',
}

/** Casual bubble chat phrases per activity (shown above avatar like speech bubble) */
const BUBBLE_PHRASES: Record<ActivityType, string[]> = {
  desk:        ['Lagi ngerjain task...', 'Fokus nih bentar', 'Cek kerjaan dulu', 'Dikerjain ya...'],
  meeting:     ['Rapat dulu ya', 'Lagi diskusi tim', 'Lagi meeting nih', 'Koordinasi sebentar'],
  a2a:         ['Mau ngobrol dulu', 'Nyamperin sebentar', 'Ada yang mau dibahas', 'Koordinasi langsung'],
  kanban:      ['Update kanban dulu', 'Tambah task baru', 'Cek to-do list', 'Update progress'],
  server_rack: ['Cek server dulu', 'Ada yang error nih', 'Pantau infra bentar', 'Deploy dulu ya'],
  creative:    ['Bikin konten dulu', 'Lagi shoot video', 'Edit foto bentar', 'Rekam dulu ya'],
  wudu:        ['Wudu bentar ya', 'Mau sholat nih', 'Ambil wudu dulu', 'Bersihin diri dulu'],
  sholat:      ['Sholat dulu ya 🙏', 'Istirahat sholat', 'Waktunya sholat nih', 'Balik sebentar lagi'],
  eating:      ['Makan siang dulu', 'Laper nih bentar', 'Istirahat makan', 'Ke kantin dulu'],
  swimming:    ['Berenang dulu ah', 'Nyegerin badan dulu', 'Di kolam bentar', 'Refresh di kolam'],
  bar:         ['Ngopi dulu nih', 'Ke bar bentar', 'Minum-minum dulu', 'Refreshing bentar'],
  relaxing:    ['Santai dulu ah', 'Istirahat sebentar', 'Napas dulu ya', 'Ngaso dulu nih'],
  idle_wander: ['Jalan-jalan dulu', 'Keliling kantor', 'Santai bentar', 'Cek kondisi kantor'],
}

function pickBubble(agentId: string, actType: ActivityType, nowMs: number): string {
  const pool = BUBBLE_PHRASES[actType]
  const seed = simpleHashLocal(agentId + actType + Math.floor(nowMs / 30000))
  return pool[seed % pool.length]
}

// ── Activity-to-position resolver ──────────────────────────────────────────

/** Returns the center of a room by id */
function roomCenter(roomId: string): { x: number; y: number } | null {
  const room = ROOMS.find(r => r.id === roomId)
  if (!room) return null
  return { x: room.x + room.w / 2, y: room.y + room.h / 2 }
}

/** Returns the position of the nearest placed object of a given type from map data */
function nearestObjPos(
  map: MapData,
  types: ObjType[],
  fallbackRoomId?: string,
): { x: number; y: number } | null {
  // Find all objects of matching types
  const matches = map.objects.filter(o => types.includes(o.type))
  if (matches.length === 0) {
    // Fall back to room center
    return fallbackRoomId ? roomCenter(fallbackRoomId) : null
  }
  // Return one deterministically (first found — they're stored in placement order)
  return { x: matches[0].x, y: matches[0].y }
}

/** Returns the Nth placed object of a given type (for spreading agents across spots) */
function nthObjPos(
  map: MapData,
  types: ObjType[],
  index: number,
  fallbackRoomId?: string,
): { x: number; y: number } | null {
  const matches = map.objects.filter(o => types.includes(o.type))
  if (matches.length === 0) return fallbackRoomId ? roomCenter(fallbackRoomId) : null
  const obj = matches[index % matches.length]
  return { x: obj.x, y: obj.y }
}

/**
 * Resolve the target world position for an agent given their activity.
 * Reads object placements from localStorage map data.
 */
function resolvePosition(
  agentId: string,
  activity: Activity,
  map: MapData,
  agentIndex: number,
): { x: number; y: number } | null {
  switch (activity.type) {
    case 'desk': {
      const saved = map.agentSpots[agentId]
      if (saved) return saved
      const roomId = AGENT_ROOM[agentId]
      const room = ROOMS.find(r => r.id === roomId)
      if (!room) return null
      const ds = room.defaultSpots[agentId]
      if (ds) return { x: room.x + ds.xPct * room.w, y: room.y + ds.yPct * room.h }
      return roomCenter(roomId)
    }
    case 'meeting':
      return nthObjPos(map, ['chair', 'sofa'], agentIndex, 'ruang_meeting')
    case 'a2a': {
      if (activity.a2aPeer) {
        const peerSpot = map.agentSpots[activity.a2aPeer]
        if (peerSpot) return { x: peerSpot.x + 80, y: peerSpot.y + 40 }
        const peerRoom = AGENT_ROOM[activity.a2aPeer]
        if (peerRoom) return roomCenter(peerRoom)
      }
      // Fallback: own desk
      const saved = map.agentSpots[agentId]
      return saved ?? roomCenter(AGENT_ROOM[agentId] ?? 'ruang_kerja_umum')
    }
    case 'kanban':
      return nearestObjPos(map, ['kanban'], undefined) ?? roomCenter('resepsionis')
    case 'server_rack':
      return nearestObjPos(map, ['server'], 'ruang_manager_it')
    case 'creative':
      return nearestObjPos(map, ['desk'], 'ruang_creator')
    case 'wudu':
      return nthObjPos(map, ['wudu'], agentIndex, 'ruang_wudhu')
    case 'sholat':
      return nthObjPos(map, ['pray_mat'], agentIndex, 'ruang_sholat')
    case 'eating':
      return nthObjPos(map, ['dining'], agentIndex, 'ruang_makan')
    case 'swimming':
      return nearestObjPos(map, ['swim'], 'kolam_bar')
    case 'bar':
      return nearestObjPos(map, ['bar'], 'kolam_bar')
    case 'relaxing':
      return nthObjPos(map, ['sofa', 'chair'], agentIndex % 2, 'kolam_bar')
    case 'idle_wander': {
      // Wander within ~400px of own desk spot — never use owner's spot
      const base = (agentId !== 'owner' && map.agentSpots[agentId])
        ? map.agentSpots[agentId]
        : roomCenter(AGENT_ROOM[agentId] ?? 'ruang_kerja_umum')
      if (!base) return null
      const seed = simpleHashLocal(agentId + Math.floor(Date.now() / 8000))
      const angle = (seed % 628) / 100
      const dist  = 150 + (seed % 200)
      return { x: base.x + Math.cos(angle) * dist, y: base.y + Math.sin(angle) * dist }
    }
  }
}

/** True for activity types that are leisure (non-work) */
function isLeisureActivity(type: ActivityType): boolean {
  return type === 'idle_wander' || type === 'relaxing' || type === 'swimming'
      || type === 'bar' || type === 'eating'
}

function simpleHashLocal(s: string | number): number {
  const str = String(s)
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i)
  return Math.abs(h)
}

// ── Per-agent movement state ───────────────────────────────────────────────

interface AgentMotion {
  x: number; y: number       // current rendered position (interpolated)
  tx: number; ty: number     // target position
  activity: Activity
  walking: boolean
  /** Sprite direction: 'front-left' | 'front-right' | 'rear-left' | 'rear-right' */
  facing: string
  /** Frames with no significant movement — for stuck detection */
  stuckFrames: number
  /** Position snapshot for stuck detection */
  snapX: number; snapY: number
  /** Timestamp when this agent will next pick a new idle activity (independent scheduling) */
  nextIdleChangeMs: number
  /** Active task title for the status label above avatar */
  taskTitle?: string
  /** Current bubble chat text */
  bubbleText: string
  /** Show typing dots instead of text (brief transition when changing activity) */
  typing: boolean
  typingUntil: number
}

const AGENT_LABEL: Record<string, string> = {
  owner: 'Acan', kenzie: 'Kenzie', adi: 'Adi', mia: 'Mia',
  deril: 'Deril', gagah: 'Gagah', nela: 'Nela', ale: 'Ale', joce: 'Joce', hugo: 'Hugo',
}

const AGENT_SPRITE: Record<string, string> = {
  owner: 'Me-1', kenzie: 'dev-1', adi: 'dev-2', mia: 'employee-1',
  deril: 'employee-2', gagah: 'Frontend-dev-1', nela: 'employee-3',
  ale: 'explore-1', joce: 'security-audit-1', hugo: 'Claude-1',
}

const STATUS_COLOR: Record<string, string> = {
  idle: '#6b7280', working: '#3b82f6', review: '#f59e0b',
  blocked: '#ef4444', meeting: '#8b5cf6', done: '#22c55e',
}

const ALL_AGENTS = Object.keys(AGENT_LABEL)

// ── Persistence ────────────────────────────────────────────────────────────

function loadMap(): MapData {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r) as MapData } catch {}
  return { walls: [], objects: [], agentSpots: {} }
}
function saveMap(d: MapData) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }
function uid() { return Math.random().toString(36).slice(2, 9) }

type PersistedAgent = {
  x: number; y: number; tx: number; ty: number
  activity: Activity; nextIdleChangeMs: number; bubbleText: string
}
function saveAgentState(motion: Record<string, AgentMotion>) {
  try {
    const out: Record<string, PersistedAgent> = {}
    for (const [id, m] of Object.entries(motion)) {
      out[id] = { x: m.x, y: m.y, tx: m.tx, ty: m.ty, activity: m.activity, nextIdleChangeMs: m.nextIdleChangeMs, bubbleText: m.bubbleText }
    }
    localStorage.setItem(AGENT_STATE_KEY, JSON.stringify(out))
  } catch {}
}
function loadAgentState(): Record<string, PersistedAgent> | null {
  try {
    const r = localStorage.getItem(AGENT_STATE_KEY); if (r) return JSON.parse(r) as Record<string, PersistedAgent>
  } catch {}
  return null
}

function ptSegDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1
  if (!dx && !dy) return Math.hypot(px - x1, py - y1)
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

/**
 * True if segment AB crosses segment CD (not counting shared endpoints).
 * Used for per-frame exact wall collision — operates on world coordinates,
 * no grid approximation.
 */
function segsIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const d1x = bx - ax, d1y = by - ay
  const d2x = dx - cx, d2y = dy - cy
  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < 1e-8) return false
  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / denom
  const u = ((cx - ax) * d1y - (cy - ay) * d1x) / denom
  return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999
}

/**
 * Apply one frame of movement with exact wall collision + wall sliding.
 * Returns the actual (movX, movY) delta after wall response.
 */
function moveWithWallCollision(
  walls: Wall[],
  fromX: number, fromY: number,
  movX: number, movY: number,
): { mx: number; my: number } {
  if (walls.length === 0) return { mx: movX, my: movY }

  for (const wall of walls) {
    const toX = fromX + movX, toY = fromY + movY
    if (!segsIntersect(fromX, fromY, toX, toY, wall.x1, wall.y1, wall.x2, wall.y2)) continue

    // Compute wall direction (normalized)
    const wx = wall.x2 - wall.x1, wy = wall.y2 - wall.y1
    const wl = Math.hypot(wx, wy)
    if (wl < 0.001) return { mx: 0, my: 0 }
    const wnx = wx / wl, wny = wy / wl

    // Project movement onto wall → slide
    const dot = movX * wnx + movY * wny
    const sx = dot * wnx, sy = dot * wny

    if (Math.hypot(sx, sy) < 0.5) return { mx: 0, my: 0 }

    // Make sure slide doesn't cross another wall
    const tx2 = fromX + sx, ty2 = fromY + sy
    for (const w2 of walls) {
      if (segsIntersect(fromX, fromY, tx2, ty2, w2.x1, w2.y1, w2.x2, w2.y2)) {
        return { mx: 0, my: 0 }
      }
    }
    return { mx: sx, my: sy }
  }
  return { mx: movX, my: movY }
}

/** Point-to-segment closest point (returns [t, dist]) */
function ptSegClosest(
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number,
): { t: number; dist: number; nx: number; ny: number } {
  const dx = x2 - x1, dy = y2 - y1
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-8) { const d = Math.hypot(px - x1, py - y1); return { t: 0, dist: d, nx: (px-x1)/Math.max(d,1), ny: (py-y1)/Math.max(d,1) } }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2))
  const cx = x1 + t * dx, cy = y1 + t * dy
  const ex = px - cx, ey = py - cy
  const dist = Math.hypot(ex, ey)
  return { t, dist, nx: dist > 0.001 ? ex / dist : 0, ny: dist > 0.001 ? ey / dist : 0 }
}

/**
 * Push agent position away from walls if too close.
 * Prevents agents from spawning inside / standing on wall lines.
 */
function pushFromWalls(
  walls: Wall[], x: number, y: number, minDist = 50,
): { x: number; y: number } {
  let rx = x, ry = y
  for (const w of walls) {
    const { dist, nx, ny } = ptSegClosest(rx, ry, w.x1, w.y1, w.x2, w.y2)
    if (dist < minDist && dist > 0.01) {
      const push = minDist - dist
      rx += nx * push; ry += ny * push
    }
  }
  return { x: rx, y: ry }
}

function nearestWall(walls: Wall[], wx: number, wy: number): Wall | null {
  let best: Wall | null = null, bestD = 40
  for (const w of walls) {
    const d = ptSegDist(wx, wy, w.x1, w.y1, w.x2, w.y2)
    if (d < bestD) { bestD = d; best = w }
  }
  return best
}

// ── Component ──────────────────────────────────────────────────────────────

const MODE_LABEL: Record<EditorMode, string> = {
  view:  '👁 View (default)',
  wall:  '🧱 Gambar Tembok',
  place: '📦 Taruh Objek',
  spot:  '📍 Posisi Kerja',
  erase: '🗑 Hapus',
}

const MODE_HINT: Record<EditorMode, string> = {
  view:  'Pan: drag · Zoom: scroll · Klik kanban board untuk buka kanban',
  wall:  'Klik & drag untuk tarik garis tembok · Lepas untuk selesai',
  place: 'Pilih objek di bawah, klik di map untuk menaruhnya',
  spot:  'Pilih agent, klik di map untuk set posisi kerjanya',
  erase: 'Klik dekat tembok atau objek untuk menghapusnya',
}

const MODE_BADGE: Record<EditorMode, string> = {
  view:  '👁 View',
  wall:  '🧱 Wall — klik & drag',
  place: '📦 Place —',
  spot:  '📍 Spot —',
  erase: '🗑 Erase — klik untuk hapus',
}

const BTN: React.CSSProperties = {
  background: 'rgba(15,17,23,0.9)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#e5e7eb', borderRadius: 6, padding: '6px 10px',
  cursor: 'pointer', fontFamily: 'ui-monospace,monospace',
  fontSize: 12, fontWeight: 600,
}

interface Props { onBack?: () => void; onKanbanOpen?: () => void }

export default function VirtualOfficeGame({ onBack, onKanbanOpen }: Props) {
  const agents = useOffice((s) => s.agents)

  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const camRef     = useRef({ x: 0, y: 0, zoom: 1 })
  const dragRef    = useRef({ active: false, sx: 0, sy: 0, cx: 0, cy: 0 })
  const imgMap     = useRef<Map<string, HTMLImageElement>>(new Map())
  const loadedRef  = useRef(0)
  const totalRef   = useRef(0)
  const rafRef     = useRef(0)
  const agentsRef  = useRef(agents)
  const mapRef     = useRef<MapData>(loadMap())
  const lastFrameT = useRef(performance.now())
  /** Per-agent motion state (live positions + targets) */
  const motionRef  = useRef<Record<string, AgentMotion>>({})

  const [mode,      setMode]      = useState<EditorMode>('view')
  const [tool,      setTool]      = useState<ObjType>('desk')
  const [spotAgent, setSpotAgent] = useState<string>('owner')
  const [editOpen,  setEditOpen]  = useState(false)
  const [tick,      setTick]      = useState(0) // force re-render for spot ✓ marks
  // Click-to-inspect panels (item 14 + 15)
  const [inspectAgent,  setInspectAgent]  = useState<string | null>(null)
  const [inspectLog,    setInspectLog]    = useState<string>('')
  const [inspectLoading, setInspectLoading] = useState(false)

  const modeRef      = useRef<EditorMode>('view')
  const toolRef      = useRef<ObjType>('desk')
  const spotAgentRef = useRef<string>('owner')
  const wallStart       = useRef<{ x: number; y: number } | null>(null)
  const mouseWorld      = useRef({ x: 0, y: 0 })
  const didDrag         = useRef(false)
  const canvasMouseDown = useRef(false)

  const saveCounterRef = useRef(0)

  /** A* navigation grid rasterized from user-drawn walls */
  const gridRef       = useRef<Uint8Array | null>(null)
  /** Per-agent A* waypoint path: [wp0, wp1, …, destination] */
  const agentPathsRef = useRef<Record<string, { x: number; y: number }[]>>({})
  /** Last resolved target per agent — used to skip re-pathfinding on unchanged targets */
  const lastTargetRef = useRef<Record<string, { x: number; y: number }>>({})

  useEffect(() => { agentsRef.current  = agents    }, [agents])
  useEffect(() => { modeRef.current    = mode      }, [mode])
  useEffect(() => { toolRef.current    = tool      }, [tool])
  useEffect(() => { spotAgentRef.current = spotAgent }, [spotAgent])

  // Build A* nav grid from saved walls on mount
  useEffect(() => { gridRef.current = buildGrid(mapRef.current.walls) }, [])

  // ── Image loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    const DIRS = ['front-left', 'front-right', 'rear-left', 'rear-right']
    const srcs = [
      '/rooms/lantai.png',
      ...ROOMS.map(r => r.asset),
      ...Object.values(AGENT_SPRITE).flatMap(s => DIRS.map(d => `/sprites/characters/${s}-${d}.png`)),
    ]
    const unique = [...new Set(srcs)]
    totalRef.current = unique.length; loadedRef.current = 0
    unique.forEach(src => {
      if (imgMap.current.has(src)) { loadedRef.current++; return }
      const img = new Image()
      img.onload = img.onerror = () => { loadedRef.current++ }
      img.src = src; imgMap.current.set(src, img)
    })
  }, [])

  // ── Activity polling (log-driven, zero tokens, per-agent independent) ──────
  useEffect(() => {
    const now = Date.now()
    const map = mapRef.current

    // Ensure grid is ready before computing any paths
    if (!gridRef.current) gridRef.current = buildGrid(map.walls)

    // Restore saved agent state OR init at desk positions
    const saved = loadAgentState()
    ALL_AGENTS.forEach((agId, idx) => {
      if (motionRef.current[agId]) return
      const s = saved?.[agId]
      if (s) {
        motionRef.current[agId] = {
          x: s.x, y: s.y, tx: s.tx, ty: s.ty,
          activity: s.activity, walking: false,
          facing: 'front-left', stuckFrames: 0, snapX: s.x, snapY: s.y,
          nextIdleChangeMs: s.nextIdleChangeMs,
          bubbleText: s.bubbleText,
          typing: false, typingUntil: 0,
        }
        // Recompute path from restored position to restored target
        if (gridRef.current) {
          agentPathsRef.current[agId] = findPath(gridRef.current, s.x, s.y, s.tx, s.ty, mapRef.current.walls)
          lastTargetRef.current[agId] = { x: s.tx, y: s.ty }
        }
      } else {
        const defaultAct: Activity = { type: 'desk', priority: 50, reason: 'init' }
        const pos = resolvePosition(agId, defaultAct, map, idx)
          ?? roomCenter(AGENT_ROOM[agId] ?? 'ruang_kerja_umum')
          ?? { x: WORLD_W / 2, y: WORLD_H / 2 }
        motionRef.current[agId] = {
          x: pos.x, y: pos.y, tx: pos.x, ty: pos.y,
          activity: defaultAct, walking: false,
          facing: 'front-left', stuckFrames: 0, snapX: pos.x, snapY: pos.y,
          nextIdleChangeMs: now + (idx * 3000) + Math.floor(Math.random() * 10000),
          bubbleText: pickBubble(agId, 'desk', now),
          typing: false, typingUntil: 0,
        }
      }
    })

    // Fetch all activities from server at once, then apply per-agent
    async function pollActivities() {
      try {
        const res = await fetch('/api/hermes/activity', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json() as {
          activities: Record<string, Activity & { agentId: string; taskTitle?: string; bubbleText?: string }>
        }
        const nowMs = Date.now()
        const map = mapRef.current

        // Pre-compute per-activity-type rank so multiple agents spread across
        // different spots (e.g., 2 bar stools → agent A → bar[0], agent B → bar[1])
        const actTypeRank: Record<string, number> = {}
        const actTypeCount: Partial<Record<ActivityType, number>> = {}
        ALL_AGENTS.forEach((agId) => {
          const act = data.activities[agId]
          if (!act) return
          const t = act.type
          actTypeRank[agId] = actTypeCount[t] ?? 0
          actTypeCount[t] = (actTypeCount[t] ?? 0) + 1
        })

        ALL_AGENTS.forEach((agId) => {
          const act = data.activities[agId]
          if (!act) return
          const m = motionRef.current[agId]
          if (!m) return

          // For idle/wander: only change if it's time for this agent's next switch
          const isIdleAct = act.type === 'idle_wander' || act.type === 'relaxing' || act.type === 'swimming' || act.type === 'bar'
          const isHighPriority = act.priority >= 50
          const activityChanged = m.activity.type !== act.type

          if (isIdleAct && !isHighPriority && nowMs < m.nextIdleChangeMs) {
            // Not yet time for this agent to switch idle activity
            return
          }

          if (activityChanged) {
            // Brief typing indicator on activity change
            m.typing = true
            m.typingUntil = nowMs + 1500 + Math.random() * 1000
            // Schedule next idle switch independently per agent (2–8 min)
            if (isIdleAct) {
              m.nextIdleChangeMs = nowMs + (2 + Math.random() * 6) * 60 * 1000
            }
          }

          const rank = actTypeRank[agId] ?? 0
          let target = resolvePosition(agId, act, map, rank)

          // Non-owner agents on leisure activities must not target owner's desk
          if (target && agId !== 'owner' && isLeisureActivity(act.type)) {
            const ownerSpot = map.agentSpots['owner']
            if (ownerSpot && Math.hypot(target.x - ownerSpot.x, target.y - ownerSpot.y) < 300) {
              target = resolvePosition(agId, { type: 'idle_wander', priority: 10, reason: 'redirect' }, map, rank)
            }
          }

          if (target) {
            const prev = lastTargetRef.current[agId]
            const moved = !prev || Math.hypot(target.x - prev.x, target.y - prev.y) > 30
            if (moved) {
              m.tx = target.x; m.ty = target.y
              lastTargetRef.current[agId] = { x: target.x, y: target.y }
              // Snap immediately to desk when transitioning from idle → work (no walking animation)
              const wasIdle = isLeisureActivity(m.activity.type) || m.activity.type === 'idle_wander'
              const isWorkNow = act.priority >= 50 && !isLeisureActivity(act.type)
              if (wasIdle && isWorkNow && activityChanged) {
                m.x = target.x; m.y = target.y
                agentPathsRef.current[agId] = []
                m.walking = false
              } else {
                agentPathsRef.current[agId] = gridRef.current
                  ? findPath(gridRef.current, m.x, m.y, target.x, target.y, mapRef.current.walls)
                  : [{ x: target.x, y: target.y }]
              }
            }
          }
          m.activity = act
          m.taskTitle = (act as Activity & { taskTitle?: string }).taskTitle
          if (!m.typing) {
            const serverBubble = (act as Activity & { bubbleText?: string }).bubbleText
            m.bubbleText = serverBubble ?? pickBubble(agId, act.type, nowMs)
          }
        })
      } catch { /* silent */ }
    }

    pollActivities()
    const id = setInterval(pollActivities, ACTIVITY_POLL_MS)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fit ───────────────────────────────────────────────────────────────────
  const fitView = useCallback(() => {
    const c = canvasRef.current; if (!c) return
    const zoom = Math.min(c.width / WORLD_W, c.height / WORLD_H) * 0.95
    camRef.current = { x: (c.width - WORLD_W * zoom) / 2, y: (c.height - WORLD_H * zoom) / 2, zoom }
  }, [])

  // ── toWorld ───────────────────────────────────────────────────────────────
  const toWorld = useCallback((cx: number, cy: number) => {
    const c = canvasRef.current; if (!c) return { x: 0, y: 0 }
    const rect = c.getBoundingClientRect()
    const { x, y, zoom } = camRef.current
    return { x: (cx - rect.left - x) / zoom, y: (cy - rect.top - y) / zoom }
  }, [])

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const { x: cx, y: cy, zoom } = camRef.current
    const map = mapRef.current
    const curMode = modeRef.current

    ctx.clearRect(0, 0, c.width, c.height)
    ctx.fillStyle = '#0f1117'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.save(); ctx.translate(cx, cy); ctx.scale(zoom, zoom)

    // Floor
    const floor = imgMap.current.get('/rooms/lantai.png')
    if (floor?.complete && floor.naturalWidth > 0) ctx.drawImage(floor, 0, 0, WORLD_W, WORLD_H)
    else { ctx.fillStyle = '#1a1d2e'; ctx.fillRect(0, 0, WORLD_W, WORLD_H) }

    // Rooms
    for (const room of ROOMS) {
      const img = imgMap.current.get(room.asset)
      if (img?.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, room.x, room.y, room.w, room.h)
      } else {
        ctx.fillStyle = 'rgba(59,130,246,0.10)'; ctx.fillRect(room.x, room.y, room.w, room.h)
        ctx.strokeStyle = 'rgba(59,130,246,0.25)'; ctx.lineWidth = 3
        ctx.strokeRect(room.x, room.y, room.w, room.h)
      }
      const fs = Math.max(18, Math.min(34, room.w / 12))
      ctx.font = `bold ${fs}px ui-monospace,monospace`
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      room.label.split(' ').forEach((l, i) => {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';        ctx.fillText(l, room.x + room.w / 2 + 2, room.y + 14 + i * (fs + 3) + 2)
        ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.fillText(l, room.x + room.w / 2,     room.y + 14 + i * (fs + 3))
      })
    }

    // Objects: invisible in view mode, dim outlines in editor mode only
    if (curMode !== 'view') {
      ctx.textAlign = 'center'
      for (const obj of map.objects) {
        const def = OBJ[obj.type]
        const s   = def.size * 0.4
        ctx.beginPath(); ctx.arc(obj.x, obj.y, s, 0, Math.PI * 2)
        ctx.strokeStyle = def.color + '55'; ctx.lineWidth = 2; ctx.stroke()
        ctx.font = `${s * 1.2}px serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'
        ctx.globalAlpha = 0.4; ctx.fillText(def.emoji, obj.x, obj.y); ctx.globalAlpha = 1
      }
    }

    // Walls: invisible in view mode, visible in editor mode
    ctx.lineCap = 'round'
    if (curMode !== 'view') {
      for (const w of map.walls) {
        ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2)
        ctx.strokeStyle = 'rgba(200,205,220,0.35)'; ctx.lineWidth = 8; ctx.stroke()
      }
    }

    // Wall drawing preview (editor)
    if (curMode === 'wall' && wallStart.current) {
      const { x: mx, y: my } = mouseWorld.current
      ctx.beginPath(); ctx.moveTo(wallStart.current.x, wallStart.current.y); ctx.lineTo(mx, my)
      ctx.strokeStyle = 'rgba(255,220,0,0.82)'; ctx.lineWidth = 10; ctx.stroke()
      ctx.beginPath(); ctx.arc(wallStart.current.x, wallStart.current.y, 16, 0, Math.PI * 2)
      ctx.fillStyle = '#ffd700'; ctx.fill()
    }

    // Erase highlight (editor)
    if (curMode === 'erase') {
      const { x: mx, y: my } = mouseWorld.current
      const nw = nearestWall(map.walls, mx, my)
      if (nw) {
        ctx.beginPath(); ctx.moveTo(nw.x1, nw.y1); ctx.lineTo(nw.x2, nw.y2)
        ctx.strokeStyle = '#ef4444cc'; ctx.lineWidth = 18; ctx.stroke()
      }
      const no = map.objects.find(o => Math.hypot(mx - o.x, my - o.y) < OBJ[o.type].size * 0.55)
      if (no) {
        ctx.beginPath(); ctx.arc(no.x, no.y, OBJ[no.type].size * 0.45, 0, Math.PI * 2)
        ctx.strokeStyle = '#ef4444cc'; ctx.lineWidth = 4; ctx.stroke()
      }
    }

    // Agent work spots — only visible in editor mode
    if (curMode !== 'view') {
      for (const [agId, spot] of Object.entries(map.agentSpots)) {
        const label = AGENT_LABEL[agId] ?? agId
        ctx.beginPath(); ctx.arc(spot.x, spot.y, 28, 0, Math.PI * 2)
        ctx.fillStyle = '#f9731633'; ctx.fill()
        ctx.strokeStyle = '#f9731688'; ctx.lineWidth = 3; ctx.stroke()
        ctx.font = `bold 18px ui-monospace,monospace`
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#f9731699'
        ctx.fillText(label, spot.x, spot.y + 32)
      }
    }

    // Spot preview
    if (curMode === 'spot') {
      const { x: mx, y: my } = mouseWorld.current
      ctx.beginPath(); ctx.arc(mx, my, 28, 0, Math.PI * 2)
      ctx.fillStyle = '#f9731633'; ctx.fill()
      ctx.strokeStyle = '#f9731688'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([])
      ctx.font = `bold 20px ui-monospace,monospace`
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#f97316aa'
      ctx.fillText(AGENT_LABEL[spotAgentRef.current] ?? spotAgentRef.current, mx, my + 32)
    }

    // Place preview
    if (curMode === 'place') {
      const { x: mx, y: my } = mouseWorld.current
      const def = OBJ[toolRef.current]
      ctx.globalAlpha = 0.55
      ctx.font = `${def.size * 0.55}px serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
      ctx.fillText(def.emoji, mx, my)
      ctx.globalAlpha = 1
    }

    // Characters — smooth positions from motionRef
    const agMap = new Map(agentsRef.current.map(a => [a.name.toLowerCase(), a]))
    const nowMs = Date.now()

    for (const [agId, spriteName] of Object.entries(AGENT_SPRITE)) {
      const motion = motionRef.current[agId]
      if (!motion) continue

      // Expire typing state
      if (motion.typing && nowMs > motion.typingUntil) {
        motion.typing = false
        motion.bubbleText = pickBubble(agId, motion.activity.type, nowMs)
      }

      const charX = motion.x, charY = motion.y
      const ag     = agMap.get(agId)
      const status = ag?.status ?? 'idle'
      const color  = STATUS_COLOR[status] ?? '#6b7280'
      const name   = AGENT_LABEL[agId] ?? agId
      const role   = AGENT_ROLE_SHORT[agId] ?? ''
      const wobbleY = motion.walking ? Math.sin(nowMs / 130) * 5 : 0
      const img = imgMap.current.get(`/sprites/characters/${spriteName}-${motion.facing ?? 'front-left'}.png`)

      if (img?.complete && img.naturalWidth > 0) {
        const sW   = CHAR_H * (img.naturalWidth / img.naturalHeight)
        const headY = charY - CHAR_H + wobbleY

        // Soft glow behind sprite (world-space, scales with zoom)
        const gr = ctx.createRadialGradient(charX, charY, 0, charX, charY, sW * 0.7)
        gr.addColorStop(0, color + '33'); gr.addColorStop(1, color + '00')
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(charX, charY, sW * 0.7, 0, Math.PI * 2); ctx.fill()

        // ── Sprite (world-space) ──────────────────────────────────────────
        ctx.drawImage(img, charX - sW / 2, headY, sW, CHAR_H)

        // ── Status dot on sprite corner (world-space) ─────────────────────
        const br = sW * 0.10
        ctx.beginPath(); ctx.arc(charX + sW / 2 - br * 0.5, headY + br * 0.5, br, 0, Math.PI * 2)
        ctx.fillStyle = color; ctx.fill()
        ctx.strokeStyle = '#fff'; ctx.lineWidth = br * 0.3; ctx.stroke()

        // ── Labels: constant screen-size via inverse-scale ────────────────
        // After ctx.translate(charX,charY) + ctx.scale(1/zoom,1/zoom):
        // 1 unit = 1 screen pixel, origin at character feet on screen.
        const sh = CHAR_H * zoom   // sprite height in screen pixels
        const sw = sW * zoom       // sprite width  in screen pixels
        ctx.save()
        ctx.translate(charX, charY)
        ctx.scale(1 / zoom, 1 / zoom)

        const taskText = motion.taskTitle
          ? (motion.taskTitle.length > 26 ? motion.taskTitle.slice(0, 24) + '…' : motion.taskTitle)
          : null

        // Task pill above head
        if (taskText) {
          const tfs = 12 // screen-px
          ctx.font = `bold ${tfs}px ui-sans-serif,system-ui,sans-serif`
          const tw  = ctx.measureText(taskText).width
          const pad = tfs * 0.5
          const bw  = tw + pad * 2, bh = tfs * 1.6
          const bx  = -bw / 2, by = -(sh + bh + 8)
          ctx.fillStyle = 'rgba(10,12,20,0.85)'
          ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, bh / 2); ctx.fill()
          ctx.beginPath(); ctx.arc(bx + pad * 0.7, by + bh / 2, tfs * 0.28, 0, Math.PI * 2)
          ctx.fillStyle = color; ctx.fill()
          ctx.fillStyle = '#f0f0f0'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
          ctx.fillText(taskText, bx + pad * 1.15, by + bh / 2)
        }

        // Speech bubble top-right
        const bx2 = sw * 0.38, by2 = -(sh - sw * 0.05)
        if (motion.typing) {
          const bW = 62, bH = 24
          ctx.fillStyle = 'rgba(250,250,255,0.93)'
          ctx.beginPath(); ctx.roundRect(bx2, by2, bW, bH, bH / 2); ctx.fill()
          ctx.beginPath(); ctx.moveTo(bx2 + 10, by2 + bH)
          ctx.lineTo(bx2, by2 + bH + 10); ctx.lineTo(bx2 + 20, by2 + bH); ctx.fill()
          const dt2 = Math.floor(nowMs / 300) % 3
          for (let d = 0; d < 3; d++) {
            ctx.beginPath()
            ctx.arc(bx2 + bW * (0.25 + d * 0.25), by2 + bH / 2, d === dt2 ? 4 : 3, 0, Math.PI * 2)
            ctx.fillStyle = d === dt2 ? '#334155' : '#94a3b8'; ctx.fill()
          }
        } else {
          const bfs = 12 // screen-px
          ctx.font = `${bfs}px ui-sans-serif,system-ui,sans-serif`
          const bText = motion.bubbleText
          const bTw   = ctx.measureText(bText).width
          const bPad  = bfs * 0.5
          const bW    = Math.max(80, bTw + bPad * 2), bH = bfs * 1.7
          ctx.fillStyle = 'rgba(250,250,255,0.93)'
          ctx.beginPath(); ctx.roundRect(bx2, by2, bW, bH, bH / 2); ctx.fill()
          ctx.beginPath(); ctx.moveTo(bx2 + 12, by2 + bH)
          ctx.lineTo(bx2, by2 + bH + 12); ctx.lineTo(bx2 + 24, by2 + bH); ctx.fill()
          ctx.fillStyle = '#1e293b'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
          ctx.fillText(bText, bx2 + bPad, by2 + bH / 2)
        }

        // Name below feet
        const nameFz = 14, roleFz = 11
        ctx.font = `bold ${nameFz}px ui-sans-serif,system-ui,sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(name, 1.5, 13.5)
        ctx.fillStyle = '#ffffff';          ctx.fillText(name, 0,   12)
        ctx.font = `${roleFz}px ui-sans-serif,system-ui,sans-serif`
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(role, 1,   12 + nameFz + 4)
        ctx.fillStyle = color + 'ee';        ctx.fillText(role, 0,   12 + nameFz + 3)

        ctx.restore()

      } else {
        // Fallback dot (constant screen-size)
        const r = CHAR_H * 0.28
        ctx.beginPath(); ctx.arc(charX, charY - r + wobbleY, r, 0, Math.PI * 2)
        ctx.fillStyle = color; ctx.fill()
        ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.14; ctx.stroke()
        ctx.save()
        ctx.translate(charX, charY)
        ctx.scale(1 / zoom, 1 / zoom)
        ctx.font = `bold 14px ui-sans-serif,system-ui,sans-serif`
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillText(name, 0, 8)
        ctx.font = `11px ui-sans-serif,system-ui,sans-serif`
        ctx.fillStyle = color + 'cc'; ctx.fillText(role, 0, 25)
        ctx.restore()
      }
    }

    ctx.restore()

    if (loadedRef.current < totalRef.current) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(10, c.height - 36, 280, 26)
      ctx.fillStyle = '#60a5fa'; ctx.font = '13px ui-monospace,monospace'
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
      ctx.fillText(`Loading… ${loadedRef.current}/${totalRef.current}`, 18, c.height - 23)
    }
  }, [])

  // ── RAF loop (with delta-time movement) ──────────────────────────────────
  useEffect(() => {
    let alive = true
    const loop = (ts: number) => {
      if (!alive) return
      const dt = Math.min((ts - lastFrameT.current) / 1000, 0.1) // cap at 100ms
      lastFrameT.current = ts

      // Periodically persist agent state so refresh resumes from last position
      saveCounterRef.current++
      if (saveCounterRef.current % 1800 === 0) saveAgentState(motionRef.current)

      // Move agents — A* waypoints for routing, exact wall collision every frame
      const walls  = mapRef.current.walls
      const motion = motionRef.current
      for (const [agId, m] of Object.entries(motion)) {
        const path = agentPathsRef.current[agId] ?? []
        const wp   = path.length > 0 ? path[0] : { x: m.tx, y: m.ty }
        const dx   = wp.x - m.x, dy = wp.y - m.y
        const dist = Math.hypot(dx, dy)

        if (dist > 2) {
          const step  = Math.min(dist, WALK_SPEED * dt)
          const rawMx = (dx / dist) * step
          const rawMy = (dy / dist) * step
          const { mx, my } = moveWithWallCollision(walls, m.x, m.y, rawMx, rawMy)
          m.x += mx; m.y += my
          m.walking = Math.hypot(mx, my) > 0.5

          // Update facing direction from actual movement vector
          if (Math.hypot(mx, my) > 0.5) {
            const front = my >= -Math.abs(mx) * 0.4 // moving generally downward = front
            const right = mx > 0
            m.facing = `${front ? 'front' : 'rear'}-${right ? 'right' : 'left'}`
          }

          // Advance waypoint when close enough
          if (dist - step < 16 && path.length > 1) {
            agentPathsRef.current[agId] = path.slice(1)
          }
        } else {
          // Arrived at waypoint — advance path WITHOUT teleport, just stop
          if (path.length > 1) {
            agentPathsRef.current[agId] = path.slice(1)
            m.walking = true
          } else {
            m.walking = false
            agentPathsRef.current[agId] = []
          }
        }

        // Push agent away from walls every frame (handles spawn-on-wall and stuck cases)
        if (walls.length > 0) {
          const pushed = pushFromWalls(walls, m.x, m.y, 48)
          m.x = pushed.x; m.y = pushed.y
        }

        // Stuck detection: if agent has a target but hasn't moved in ~90 frames, force repath
        m.stuckFrames = (Math.hypot(m.x - m.snapX, m.y - m.snapY) < 8 && dist > 60)
          ? m.stuckFrames + 1
          : 0
        if (m.stuckFrames % 90 === 0) {
          m.snapX = m.x; m.snapY = m.y
        }
        if (m.stuckFrames > 90) {
          // Force repath — nudge to a free spot then replan
          m.stuckFrames = 0
          if (gridRef.current) {
            // Try pathfinding again; if no path, give up and reset target to current position
            const newPath = findPath(gridRef.current, m.x, m.y, m.tx, m.ty, walls)
            agentPathsRef.current[agId] = newPath.length > 1 ? newPath : []
            if (newPath.length <= 1) { m.tx = m.x; m.ty = m.y } // give up on this target
          }
        }
      }

      draw()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { alive = false; cancelAnimationFrame(rafRef.current) }
  }, [draw])

  // ── Canvas resize ─────────────────────────────────────────────────────────
  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const resize = () => {
      c.width  = c.offsetWidth  || window.innerWidth
      c.height = c.offsetHeight || window.innerHeight
      fitView()
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(c.parentElement ?? c)
    return () => ro.disconnect()
  }, [fitView])

  // ── Mouse events ──────────────────────────────────────────────────────────
  useEffect(() => {
    const c = canvasRef.current; if (!c) return

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      canvasMouseDown.current = true
      const w = toWorld(e.clientX, e.clientY)
      mouseWorld.current = w
      if (modeRef.current === 'view') {
        dragRef.current = { active: true, sx: e.clientX, sy: e.clientY, cx: camRef.current.x, cy: camRef.current.y }
        didDrag.current = false
      } else if (modeRef.current === 'wall') {
        wallStart.current = { x: w.x, y: w.y }
      }
    }

    const onMove = (e: MouseEvent) => {
      const w = toWorld(e.clientX, e.clientY)
      mouseWorld.current = w
      if (dragRef.current.active) {
        const dx = e.clientX - dragRef.current.sx, dy = e.clientY - dragRef.current.sy
        if (Math.hypot(dx, dy) > 3) didDrag.current = true
        camRef.current.x = dragRef.current.cx + dx
        camRef.current.y = dragRef.current.cy + dy
      }
    }

    const onUp = (e: MouseEvent) => {
      if (!canvasMouseDown.current) return
      canvasMouseDown.current = false
      const w = toWorld(e.clientX, e.clientY)
      const m = modeRef.current

      if (m === 'view') {
        if (!didDrag.current) {
          // Kanban object
          const hit = mapRef.current.objects.find(o =>
            o.type === 'kanban' && Math.hypot(w.x - o.x, w.y - o.y) < OBJ.kanban.size * 0.55
          )
          if (hit) { onKanbanOpen?.(); return }

          // Item 14: click on agent avatar → inspect panel
          const AVATAR_RADIUS = 120
          const clickedAgent = Object.entries(motionRef.current).find(([, m]) =>
            Math.hypot(w.x - m.x, w.y - m.y) < AVATAR_RADIUS
          )
          if (clickedAgent) {
            const [agId, agM] = clickedAgent
            setInspectAgent(agId)
            setInspectLog('')
            setInspectLoading(true)
            // Fetch agent log from API
            fetch('/api/hermes/agent-log?agent=' + agId)
              .then(r => r.json())
              .then(d => setInspectLog(d.log ?? '(belum ada log)'))
              .catch(() => setInspectLog('(gagal membaca log)'))
              .finally(() => setInspectLoading(false))
            return
          }

          // Item 15: click on desk object near an agent → show terminal
          const clickedDesk = mapRef.current.objects.find(o =>
            o.type === 'desk' && Math.hypot(w.x - o.x, w.y - o.y) < OBJ.desk.size * 0.7
          )
          if (clickedDesk) {
            // Find which agent's spot this desk is closest to
            const ownerEntry = Object.entries(mapRef.current.agentSpots).find(([, spot]) =>
              Math.hypot(clickedDesk.x - spot.x, clickedDesk.y - spot.y) < 300
            )
            if (ownerEntry) {
              const [deskAgent] = ownerEntry
              setInspectAgent(deskAgent)
              setInspectLog('')
              setInspectLoading(true)
              fetch('/api/hermes/agent-log?agent=' + deskAgent)
                .then(r => r.json())
                .then(d => setInspectLog(d.log ?? '(belum ada log)'))
                .catch(() => setInspectLog('(gagal membaca log)'))
                .finally(() => setInspectLoading(false))
            }
          }
        }
      } else if (m === 'wall' && wallStart.current) {
        const dist = Math.hypot(w.x - wallStart.current.x, w.y - wallStart.current.y)
        if (dist > 20) {
          mapRef.current.walls.push({ id: uid(), x1: wallStart.current.x, y1: wallStart.current.y, x2: w.x, y2: w.y })
          saveMap(mapRef.current)
          const ng = buildGrid(mapRef.current.walls); gridRef.current = ng
          for (const [aid, mm] of Object.entries(motionRef.current)) {
            agentPathsRef.current[aid] = findPath(ng, mm.x, mm.y, mm.tx, mm.ty, mapRef.current.walls)
            lastTargetRef.current[aid] = { x: mm.tx, y: mm.ty }
          }
        }
        wallStart.current = null
      } else if (m === 'place') {
        mapRef.current.objects.push({ id: uid(), type: toolRef.current, x: w.x, y: w.y })
        saveMap(mapRef.current)
      } else if (m === 'spot') {
        mapRef.current.agentSpots[spotAgentRef.current] = { x: w.x, y: w.y }
        saveMap(mapRef.current)
        setTick(t => t + 1)
      } else if (m === 'erase') {
        const nw = nearestWall(mapRef.current.walls, w.x, w.y)
        if (nw) {
          mapRef.current.walls = mapRef.current.walls.filter(wall => wall.id !== nw.id)
          saveMap(mapRef.current)
          const ng2 = buildGrid(mapRef.current.walls); gridRef.current = ng2
          for (const [aid, mm] of Object.entries(motionRef.current)) {
            agentPathsRef.current[aid] = findPath(ng2, mm.x, mm.y, mm.tx, mm.ty, mapRef.current.walls)
            lastTargetRef.current[aid] = { x: mm.tx, y: mm.ty }
          }
        } else {
          const no = mapRef.current.objects.find(o => Math.hypot(w.x - o.x, w.y - o.y) < OBJ[o.type].size * 0.55)
          if (no) {
            mapRef.current.objects = mapRef.current.objects.filter(o => o.id !== no.id)
            saveMap(mapRef.current)
          }
        }
      }

      dragRef.current.active = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = c.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      const { x: px, y: py, zoom: z } = camRef.current
      const nz = Math.max(0.05, Math.min(5, z * (e.deltaY < 0 ? 1.12 : 0.90)))
      camRef.current = { x: mx - (mx - px) * (nz / z), y: my - (my - py) * (nz / z), zoom: nz }
    }

    c.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    c.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      c.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      c.removeEventListener('wheel', onWheel)
    }
  }, [toWorld, onKanbanOpen])

  // ── Touch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    let last: Touch[] = []
    const onStart = (e: TouchEvent) => {
      last = Array.from(e.touches)
      if (e.touches.length === 1 && modeRef.current === 'view') {
        dragRef.current = { active: true, sx: e.touches[0].clientX, sy: e.touches[0].clientY, cx: camRef.current.x, cy: camRef.current.y }
        didDrag.current = false
      }
    }
    const onMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1 && dragRef.current.active) {
        const dx = e.touches[0].clientX - dragRef.current.sx, dy = e.touches[0].clientY - dragRef.current.sy
        if (Math.hypot(dx, dy) > 3) didDrag.current = true
        camRef.current.x = dragRef.current.cx + dx; camRef.current.y = dragRef.current.cy + dy
      } else if (e.touches.length === 2 && last.length >= 2) {
        const prev = Math.hypot(last[1].clientX - last[0].clientX, last[1].clientY - last[0].clientY)
        const curr = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY)
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2
        const r = c.getBoundingClientRect(), cmx = mx - r.left, cmy = my - r.top
        const { x: px, y: py, zoom: z } = camRef.current
        const nz = Math.max(0.05, Math.min(5, z * (curr / prev)))
        camRef.current = { x: cmx - (cmx - px) * (nz / z), y: cmy - (cmy - py) * (nz / z), zoom: nz }
      }
      last = Array.from(e.touches)
    }
    const onEnd = () => { dragRef.current.active = false }
    c.addEventListener('touchstart', onStart, { passive: false })
    c.addEventListener('touchmove',  onMove,  { passive: false })
    c.addEventListener('touchend',   onEnd)
    return () => {
      c.removeEventListener('touchstart', onStart)
      c.removeEventListener('touchmove',  onMove)
      c.removeEventListener('touchend',   onEnd)
    }
  }, [])

  const zoomBy = (f: number) => {
    const c = canvasRef.current; if (!c) return
    const { x, y, zoom: z } = camRef.current, cx = c.width / 2, cy = c.height / 2
    const nz = Math.max(0.05, Math.min(5, z * f))
    camRef.current = { x: cx - (cx - x) * (nz / z), y: cy - (cy - y) * (nz / z), zoom: nz }
  }

  const clearAll = () => {
    if (!confirm('Hapus semua tembok, objek, dan posisi agent?')) return
    mapRef.current = { walls: [], objects: [], agentSpots: {} }
    saveMap(mapRef.current)
    const ng3 = buildGrid([]); gridRef.current = ng3
    for (const [aid, mm] of Object.entries(motionRef.current)) {
      agentPathsRef.current[aid] = [{ x: mm.tx, y: mm.ty }]
      lastTargetRef.current[aid] = { x: mm.tx, y: mm.ty }
    }
    setTick(t => t + 1)
  }

  const cursorStyle = mode === 'view' ? 'grab' : mode === 'erase' ? 'crosshair' : 'cell'

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0f1117', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', cursor: cursorStyle }} />

      {/* Top-left controls */}
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {onBack && <button onClick={onBack} style={BTN}>← Back</button>}
        <button onClick={fitView}            style={BTN}>⊡ Fit</button>
        <button onClick={() => zoomBy(1.2)}  style={BTN}>＋</button>
        <button onClick={() => zoomBy(0.83)} style={BTN}>－</button>
        <button
          onClick={() => setEditOpen(v => !v)}
          style={{ ...BTN, background: editOpen ? 'rgba(249,115,22,0.28)' : 'rgba(15,17,23,0.9)', borderColor: editOpen ? '#f97316' : 'rgba(255,255,255,0.15)' }}
        >
          {editOpen ? '✕ Editor' : '✎ Editor'}
        </button>
      </div>

      {/* Editor panel */}
      {editOpen && (
        <div style={{
          position: 'absolute', top: 12, right: 12, width: 230,
          background: 'rgba(13,15,22,0.97)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
          fontFamily: 'ui-monospace,monospace', fontSize: 12, color: '#e5e7eb',
          maxHeight: 'calc(100% - 24px)', overflowY: 'auto',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6 }}>
            MAP EDITOR
          </div>

          {/* Mode selector */}
          <div>
            <div style={{ color: '#9ca3af', marginBottom: 5, fontSize: 11 }}>MODE</div>
            {(['view', 'wall', 'place', 'spot', 'erase'] as EditorMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                ...BTN, display: 'block', width: '100%', textAlign: 'left', marginBottom: 3,
                background: mode === m ? 'rgba(59,130,246,0.22)' : 'rgba(255,255,255,0.04)',
                borderColor: mode === m ? '#3b82f688' : 'rgba(255,255,255,0.07)',
              }}>
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>

          {/* Object palette */}
          {mode === 'place' && (
            <div>
              <div style={{ color: '#9ca3af', marginBottom: 5, fontSize: 11 }}>OBJEK</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {OBJ_KEYS.map(k => (
                  <button key={k} onClick={() => setTool(k)} style={{
                    ...BTN, fontSize: 11,
                    background: tool === k ? OBJ[k].color + '33' : 'rgba(255,255,255,0.04)',
                    borderColor: tool === k ? OBJ[k].color + 'aa' : 'rgba(255,255,255,0.07)',
                  }}>
                    {OBJ[k].emoji} {OBJ[k].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Agent spot */}
          {mode === 'spot' && (
            <div>
              <div style={{ color: '#9ca3af', marginBottom: 5, fontSize: 11 }}>POSISI KERJA PER AGENT</div>
              {ALL_AGENTS.map(ag => (
                <button key={ag} onClick={() => setSpotAgent(ag)} style={{
                  ...BTN, display: 'block', width: '100%', textAlign: 'left', marginBottom: 3,
                  background: spotAgent === ag ? 'rgba(249,115,22,0.22)' : 'rgba(255,255,255,0.04)',
                  borderColor: spotAgent === ag ? '#f97316aa' : 'rgba(255,255,255,0.07)',
                }}>
                  {AGENT_LABEL[ag] ?? ag}
                  {tick >= 0 && mapRef.current.agentSpots[ag] ? <span style={{ color: '#22c55e', marginLeft: 6 }}>✓</span> : null}
                </button>
              ))}
            </div>
          )}

          {/* Hint */}
          <div style={{ color: '#4b5563', fontSize: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
            {MODE_HINT[mode]}
          </div>

          {/* Reset agent positions */}
          <button onClick={() => {
            localStorage.removeItem('exiom-agent-state-v1')
            // Scatter agents back to default desks
            motionRef.current = {}
            agentPathsRef.current = {}
            lastTargetRef.current = {}
            setTick(t => t + 1)
          }} style={{ ...BTN, fontSize: 11, borderColor: '#f59e0b33', color: '#f59e0b' }}>
            ↺ Reset agent
          </button>

          {/* Clear */}
          <button onClick={clearAll} style={{ ...BTN, fontSize: 11, borderColor: '#ef444433', color: '#ef4444' }}>
            🗑 Hapus semua
          </button>
        </div>
      )}

      {/* Active mode badge */}
      {mode !== 'view' && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(13,15,22,0.92)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, padding: '6px 18px',
          fontFamily: 'ui-monospace,monospace', fontSize: 12, color: '#e5e7eb', pointerEvents: 'none',
        }}>
          {MODE_BADGE[mode]}
          {mode === 'place' && ` ${OBJ[tool].emoji} ${OBJ[tool].label}`}
          {mode === 'spot' && ` ${AGENT_LABEL[spotAgent] ?? spotAgent}`}
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 10, color: 'rgba(255,255,255,0.15)', fontFamily: 'ui-monospace,monospace', pointerEvents: 'none' }}>
        drag · scroll zoom · klik avatar/komputer untuk inspect
      </div>

      {/* ── Agent inspect panel (item 14 + 15) ───────────────────── */}
      {inspectAgent && (() => {
        const agM = motionRef.current[inspectAgent]
        const act = agM?.activity
        return (
          <div style={{
            position: 'absolute', top: 12, right: 12, width: 300,
            background: 'rgba(13,15,22,0.96)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, padding: 16, fontFamily: 'ui-monospace,monospace',
            display: 'flex', flexDirection: 'column', gap: 10, zIndex: 50,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f3f4f6' }}>
                  {AGENT_LABEL[inspectAgent] ?? inspectAgent}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  {AGENT_ROLE_SHORT[inspectAgent] ?? inspectAgent}
                </div>
              </div>
              <button onClick={() => setInspectAgent(null)} style={{
                background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18, lineHeight: 1,
              }}>×</button>
            </div>

            {/* Activity */}
            {act && (
              <div style={{ fontSize: 12, color: '#d1d5db' }}>
                <span style={{ color: '#9ca3af' }}>Aktivitas: </span>
                <span style={{ color: '#60a5fa' }}>{act.type}</span>
                {' · '}<span style={{ color: '#9ca3af' }}>{act.reason}</span>
              </div>
            )}

            {/* Task */}
            {agM?.taskTitle && (
              <div style={{ fontSize: 12, color: '#fde68a', background: 'rgba(251,191,36,0.08)', borderRadius: 6, padding: '6px 10px' }}>
                📋 {agM.taskTitle}
              </div>
            )}

            {/* Log terminal */}
            <div>
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>
                TERMINAL — agent.log (30 baris terakhir)
              </div>
              <div style={{
                background: '#0a0b0f', borderRadius: 6, padding: '8px 10px',
                fontSize: 10, color: '#4ade80', lineHeight: 1.6,
                maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>
                {inspectLoading ? '⠋ membaca log...' : (inspectLog || '(belum ada log)')}
              </div>
            </div>

            {/* Quick action — refresh log */}
            <button onClick={() => {
              setInspectLoading(true)
              fetch('/api/hermes/agent-log?agent=' + inspectAgent)
                .then(r => r.json())
                .then(d => setInspectLog(d.log ?? '(belum ada log)'))
                .catch(() => setInspectLog('(gagal membaca log)'))
                .finally(() => setInspectLoading(false))
            }} style={{ ...BTN, fontSize: 11, alignSelf: 'flex-start' }}>
              ↺ Refresh log
            </button>
          </div>
        )
      })()}
    </div>
  )
}
