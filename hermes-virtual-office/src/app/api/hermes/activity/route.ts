/**
 * GET /api/hermes/activity
 *
 * Combines:
 *   - agent status from Hermes CLI
 *   - active task titles from kanban
 *   - live A2A sessions
 *   - meeting state
 *   - last 30 lines of each agent's agent.log (keyword detection, zero tokens)
 *   - wall-clock time (prayer schedule)
 *
 * Returns per-agent resolved ActivityType. No AI calls, no tokens consumed.
 */
import { NextResponse } from 'next/server'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { listAgents, listTasks, listAssignees } from '@/lib/hermes/kanban'
import { visible } from '@/lib/hermes/office-membership'
import { blockedAssigneesFor } from '@/lib/hermes/approvals'
import { resolveActivity, type ActivityInput, type Activity } from '@/lib/office/behavior'

export const dynamic = 'force-dynamic'

const HERMES_PROFILES = join(homedir(), '.hermes', 'profiles')
const LOG_LINES = 30

function readLogTail(profileName: string): string {
  const path = join(HERMES_PROFILES, profileName, 'logs', 'agent.log')
  if (!existsSync(path)) return ''
  try {
    const content = readFileSync(path, 'utf8')
    const lines = content.split('\n').filter(Boolean)
    return lines.slice(-LOG_LINES).join('\n')
  } catch {
    return ''
  }
}

/** Returns true if agent.log was written to within the last N ms (default 5 min) */
function isLogActiveRecently(profileName: string, withinMs = 5 * 60 * 1000): boolean {
  const path = join(HERMES_PROFILES, profileName, 'logs', 'agent.log')
  if (!existsSync(path)) return false
  try {
    const { mtimeMs } = statSync(path)
    return (Date.now() - mtimeMs) < withinMs
  } catch { return false }
}

/** Extract a human-readable status line from the last lines of agent.log */
function extractBubbleFromLog(logTail: string): string | null {
  if (!logTail) return null
  const lines = logTail.split('\n').filter(Boolean).reverse()
  for (const line of lines) {
    // API call → "Berpikir... (call #N)"
    const apiMatch = line.match(/API call #(\d+).*?in=(\d+).*?out=(\d+)/)
    if (apiMatch) return `Berpikir... (call #${apiMatch[1]})`
    // Tool completed
    const toolMatch = line.match(/tool (\w+) completed/)
    if (toolMatch) {
      const tool = toolMatch[1]
      if (tool === 'terminal') return 'Eksekusi perintah...'
      if (tool === 'write_file') return 'Menulis file...'
      if (tool === 'read_file') return 'Membaca file...'
      if (tool === 'browser') return 'Browsing web...'
      return `Menggunakan ${tool}...`
    }
    // Tool error
    if (line.includes('tool_executor') && line.includes('error')) return 'Menangani error...'
    // Stream retry
    if (line.includes('Stream drop') || line.includes('stream_retry')) return 'Koneksi ulang...'
  }
  return null
}

function readA2aLive(): Record<string, string> {
  // a2a live file: ~/.hermes/data/a2a-live.json or similar
  const paths = [
    join(homedir(), '.hermes', 'data', 'a2a-live.json'),
    join(homedir(), '.hermes', 'a2a-live.json'),
  ]
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const data = JSON.parse(readFileSync(p, 'utf8')) as unknown
        if (data && typeof data === 'object') {
          // Format expected: { [agentName]: { peer: string, ... } }
          return data as Record<string, string>
        }
      } catch {}
    }
  }
  return {}
}

function readMeetingParticipants(): string[] {
  const paths = [
    join(homedir(), '.hermes', 'data', 'meeting.json'),
    join(homedir(), '.hermes', 'meeting.json'),
  ]
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const d = JSON.parse(readFileSync(p, 'utf8')) as { participants?: string[]; state?: string }
        if (d?.state === 'running' || d?.state === 'queued') return d.participants ?? []
      } catch {}
    }
  }
  return []
}

export async function GET() {
  try {
    const nowMs = Date.now()

    // Fetch agent + task state from Hermes (existing machinery)
    const [tasks, assignees] = await Promise.all([
      listTasks({ includeArchived: false }),
      listAssignees(),
    ]).catch(() => [[], []])

    const blocked = await blockedAssigneesFor(tasks).catch(() => new Set<string>())
    const agents = await listAgents(tasks, assignees, blocked)
      .then(a => visible(a))
      .catch(() => [])

    // Build a map: agentName → active task title
    const agentTask: Record<string, string> = {}
    for (const t of tasks) {
      if (t.status === 'running' || t.status === 'blocked') {
        const assignee = (t as unknown as { assignee?: string }).assignee
        if (assignee) agentTask[assignee.toLowerCase()] = t.title ?? ''
      }
    }

    // Detect recent kanban edits: tasks updated in the last 3 minutes
    const RECENT_MS = 3 * 60 * 1000
    const recentEditors = new Set<string>()
    for (const t of tasks) {
      const updatedAt = (t as unknown as { updatedAt?: string }).updatedAt
      if (updatedAt) {
        const age = nowMs - Date.parse(updatedAt)
        if (age >= 0 && age < RECENT_MS) {
          const assignee = (t as unknown as { assignee?: string }).assignee
          if (assignee) recentEditors.add(assignee.toLowerCase())
        }
      }
    }

    // Meeting participants
    const meetingParticipants = new Set(readMeetingParticipants().map(n => n.toLowerCase()))
    // Also check from tasks/meeting state
    for (const a of agents) {
      if (a.status === 'meeting') meetingParticipants.add(a.name.toLowerCase())
    }

    // A2A peers
    const a2aMap = readA2aLive()

    // Build per-agent activity
    const results: Record<string, Activity & { agentId: string; taskTitle?: string }> = {}

    const allAgentIds = [
      'owner', 'kenzie', 'adi', 'mia', 'deril', 'gagah', 'nela', 'ale', 'joce', 'hugo'
    ]

    for (const agentId of allAgentIds) {
      const agentState = agents.find(a => a.name.toLowerCase() === agentId)
      let status = agentState?.status ?? 'idle'

      // If agent has no kanban task but their log was touched recently → they're working via relay
      if (status === 'idle' && agentId !== 'owner' && isLogActiveRecently(agentId)) {
        status = 'working'
      }

      const logTail = agentId !== 'owner' ? readLogTail(agentId) : undefined

      const input: ActivityInput = {
        agentId,
        status,
        taskTitle: agentTask[agentId],
        logTail,
        inMeeting: meetingParticipants.has(agentId),
        a2aPeer: (a2aMap[agentId] as unknown as { peer?: string })?.peer ?? undefined,
        recentKanbanEdit: recentEditors.has(agentId),
        nowMs,
      }

      const activity = resolveActivity(input)
      const liveText = status === 'working' && logTail ? extractBubbleFromLog(logTail) : null
      results[agentId] = {
        ...activity,
        agentId,
        taskTitle: agentTask[agentId],
        ...(liveText ? { bubbleText: liveText } : {}),
      }
    }

    return NextResponse.json({ ok: true, activities: results, ts: nowMs })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
