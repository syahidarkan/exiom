/**
 * behavior.ts — Log-driven activity resolver for the virtual office map.
 *
 * Zero token usage. Zero AI calls. All decisions are rule-based from:
 *   - Agent status (idle/working/blocked/review/meeting)
 *   - Active task title keywords
 *   - A2A live sessions
 *   - Meeting state
 *   - Hermes agent.log tail (deploy, video, error keywords)
 *   - Wall-clock time (prayer schedule, lunch)
 *
 * This module is pure (no Node.js imports) so it runs on both server and client.
 */

// ── Activity types ─────────────────────────────────────────────────────────

export type ActivityType =
  | 'desk'          // at own work spot
  | 'meeting'       // in meeting room
  | 'a2a'           // walking to / standing at another agent's desk
  | 'kanban'        // at the kanban board object
  | 'server_rack'   // at server rack (deploy, error, infra)
  | 'creative'      // in creator room (video, photo, design)
  | 'wudu'          // in wudu room (pre-prayer)
  | 'sholat'        // in musholla (praying)
  | 'eating'        // in dining room
  | 'swimming'      // in pool
  | 'bar'           // at bar counter
  | 'relaxing'      // sofa / lounge
  | 'idle_wander'   // gentle wander near current position

export type Activity = {
  type: ActivityType
  /** For a2a: who is the peer agent */
  a2aPeer?: string
  /** Priority (higher = harder to interrupt). Prayer = 90, meeting = 80, work = 60, idle = 10 */
  priority: number
  /** Human-readable reason, shown in tooltip */
  reason: string
}

// ── Prayer schedule (WIB = UTC+7) ─────────────────────────────────────────

/** [hour, minute] pairs in WIB */
const PRAYER_TIMES_WIB: [number, number][] = [
  [5,  0],  // Subuh
  [12, 0],  // Dzuhur
  [15, 0],  // Ashar
  [18, 0],  // Maghrib
  [19, 0],  // Isya
]

/** Minutes before prayer when wudu starts */
const WUDU_BEFORE_MIN = 10

/** Duration of wudu in minutes */
const WUDU_DURATION_MIN = 8

/** Duration of sholat in minutes */
const SHOLAT_DURATION_MIN = 20

export type PrayerPhase = null | 'wudu' | 'sholat'

/**
 * Returns the current prayer phase based on wall-clock time (WIB).
 * Never uses tokens — pure clock arithmetic.
 */
export function currentPrayerPhase(nowMs: number): PrayerPhase {
  // Convert to WIB
  const wib = new Date(nowMs + 7 * 3600 * 1000)
  const h = wib.getUTCHours()
  const m = wib.getUTCMinutes()
  const totalMin = h * 60 + m

  for (const [ph, pm] of PRAYER_TIMES_WIB) {
    const prayerMin = ph * 60 + pm
    const wuduStart = prayerMin - WUDU_BEFORE_MIN
    const sholatEnd = prayerMin + SHOLAT_DURATION_MIN

    if (totalMin >= wuduStart && totalMin < prayerMin) return 'wudu'
    if (totalMin >= prayerMin && totalMin < sholatEnd)  return 'sholat'
  }
  return null
}

/**
 * Which prayer index (0=Subuh,1=Dzuhur,2=Ashar,3=Maghrib,4=Isya) is current, or -1.
 */
export function currentPrayerIndex(nowMs: number): number {
  const wib = new Date(nowMs + 7 * 3600 * 1000)
  const h = wib.getUTCHours()
  const m = wib.getUTCMinutes()
  const totalMin = h * 60 + m

  for (let i = 0; i < PRAYER_TIMES_WIB.length; i++) {
    const [ph, pm] = PRAYER_TIMES_WIB[i]
    const prayerMin = ph * 60 + pm
    const wuduStart = prayerMin - WUDU_BEFORE_MIN
    const sholatEnd = prayerMin + SHOLAT_DURATION_MIN
    if (totalMin >= wuduStart && totalMin < sholatEnd) return i
  }
  return -1
}

// ── Lunch / break schedule ─────────────────────────────────────────────────

/** After Dzuhur prayer (12:20+), this window is lunch for those who prayed last */
export function isLunchWindow(nowMs: number): boolean {
  const wib = new Date(nowMs + 7 * 3600 * 1000)
  const h = wib.getUTCHours()
  const m = wib.getUTCMinutes()
  const totalMin = h * 60 + m
  // Lunch: 12:00–13:00, but not during active prayer phase
  return totalMin >= 720 && totalMin < 780 && currentPrayerPhase(nowMs) === null
}

// ── Keyword-based activity detection from log lines / task titles ──────────

const KEYWORDS: { pattern: RegExp; activity: ActivityType; priority: number }[] = [
  // Deploy & infra → server rack (priority 70: higher than normal desk work)
  { pattern: /\b(deploy|nginx|docker|systemd|pm2|build|ci\b|pipeline|infra|server|down|error 5\d\d|502|503|restart|rollback)\b/i, activity: 'server_rack', priority: 70 },
  // Video / photo / design → creative room
  { pattern: /\b(video|remotion|ffmpeg|render|record|shoot|broll|reel|thumbnail|edit.*(photo|image|img)|canva|figma|premiere|after.?effect)\b/i, activity: 'creative', priority: 65 },
  // Kanban / task management
  { pattern: /\b(kanban|todo|task|backlog|sprint|scrum|jira|trello|notion|create.task|add.task|update.task)\b/i, activity: 'kanban', priority: 55 },
]

/**
 * Detect an activity from free text (log lines or task title).
 * Returns the highest-priority match, or null.
 */
export function detectFromText(text: string): { activity: ActivityType; priority: number } | null {
  let best: { activity: ActivityType; priority: number } | null = null
  for (const kw of KEYWORDS) {
    if (kw.pattern.test(text)) {
      if (!best || kw.priority > best.priority) {
        best = { activity: kw.activity, priority: kw.priority }
      }
    }
  }
  return best
}

// ── Idle activity pool ─────────────────────────────────────────────────────

/** Idle activities and their relative weights */
const IDLE_POOL: { type: ActivityType; weight: number }[] = [
  { type: 'swimming',  weight: 15 },
  { type: 'bar',       weight: 12 },
  { type: 'relaxing',  weight: 25 },
  { type: 'eating',    weight: 20 },
  { type: 'idle_wander', weight: 28 },
]

const IDLE_POOL_TOTAL = IDLE_POOL.reduce((s, i) => s + i.weight, 0)

/**
 * Pick a random idle activity deterministically from an agent name seed.
 * Using the agent name + current hour ensures it changes over time but
 * doesn't flicker every frame.
 */
export function pickIdleActivity(agentName: string, nowMs: number): ActivityType {
  const wib = new Date(nowMs + 7 * 3600 * 1000)
  // Rotate every 15 minutes to avoid everyone doing the same thing forever
  const slot = Math.floor(wib.getUTCMinutes() / 15)
  const seed = simpleHash(agentName + '-' + wib.getUTCHours() + '-' + slot)
  let r = seed % IDLE_POOL_TOTAL
  for (const item of IDLE_POOL) {
    r -= item.weight
    if (r <= 0) return item.type
  }
  return 'idle_wander'
}

function simpleHash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return Math.abs(h)
}

// ── Main resolver ─────────────────────────────────────────────────────────

export type ActivityInput = {
  agentId: string
  status: string         // 'idle' | 'working' | 'blocked' | 'review' | 'meeting' | 'done'
  taskTitle?: string     // title of active task if any
  logTail?: string       // last N lines of agent.log concatenated
  inMeeting: boolean
  a2aPeer?: string       // peer agent name if in A2A session
  /** Whether this agent just started or edited a kanban task (detected via task updatedAt delta) */
  recentKanbanEdit: boolean
  nowMs: number
}

export function resolveActivity(i: ActivityInput): Activity {
  // 1. Prayer (highest priority for all agents)
  const prayer = currentPrayerPhase(i.nowMs)
  if (prayer === 'wudu')   return { type: 'wudu',   priority: 90, reason: 'Waktu wudu' }
  if (prayer === 'sholat') return { type: 'sholat', priority: 90, reason: 'Waktu sholat' }

  // 2. Meeting (next highest — binds multiple agents to one room)
  if (i.inMeeting) return { type: 'meeting', priority: 80, reason: 'Sedang rapat' }

  // 3. A2A — agent is in a live peer conversation → walk to peer's desk
  if (i.a2aPeer) return { type: 'a2a', priority: 75, a2aPeer: i.a2aPeer, reason: `Koordinasi dengan ${i.a2aPeer}` }

  // 4. Active work signals — detect from log + task title
  if (i.status === 'working' || i.status === 'blocked') {
    const combined = [i.taskTitle ?? '', i.logTail ?? ''].join(' ')
    const detected = detectFromText(combined)
    if (detected) {
      return { type: detected.activity, priority: detected.priority, reason: `Task: ${i.taskTitle ?? 'aktif'}` }
    }
    // Generic desk work
    return { type: 'desk', priority: 60, reason: `Working: ${i.taskTitle ?? 'task aktif'}` }
  }

  // 5. Recent kanban edit → go to kanban board
  if (i.recentKanbanEdit) return { type: 'kanban', priority: 55, reason: 'Update kanban' }

  // 6. Review → back at desk
  if (i.status === 'review') return { type: 'desk', priority: 50, reason: 'Review task' }

  // 7. Lunch window (after Dzuhur prayer)
  if (isLunchWindow(i.nowMs)) {
    // Alternate: some go eat, some linger at desk
    const h = simpleHash(i.agentId)
    return (h % 3) !== 0
      ? { type: 'eating',      priority: 40, reason: 'Istirahat makan siang' }
      : { type: 'idle_wander', priority: 35, reason: 'Santai setelah sholat' }
  }

  // 8. Idle — pick a random leisure activity
  const idleType = pickIdleActivity(i.agentId, i.nowMs)
  return { type: idleType, priority: 10, reason: 'Tidak ada task' }
}
