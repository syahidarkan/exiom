import { NextResponse } from 'next/server'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

export const dynamic = 'force-dynamic'

const AGENTS = ['kenzie', 'adi', 'mia', 'deril', 'gagah', 'nela', 'ale', 'joce', 'hugo']
const WORKSPACE = join(process.cwd(), '..', 'virtual office agent', 'workspace')

export interface AgentSummary {
  agent: string
  lastSummary: string   // last session's text (trimmed)
  sessionId: string     // last session_id value
  mtime: string | null  // relay log file modified time
  hasLog: boolean
}

function parseRelayLog(path: string): { summary: string; sessionId: string; mtime: string | null } {
  if (!existsSync(path)) return { summary: '', sessionId: '', mtime: null }

  let mtime: string | null = null
  try {
    mtime = statSync(path).mtime.toISOString()
  } catch { /* ignore */ }

  let content = ''
  try {
    content = readFileSync(path, 'utf8')
  } catch {
    return { summary: '', sessionId: '', mtime }
  }

  // Each session block ends with: session_id: XXXXXXXX\n
  // Find all session_id markers and their positions
  const sidRegex = /session_id:\s*(\S+)/gi
  let lastMatch: RegExpExecArray | null = null
  let prevEnd = 0
  let match: RegExpExecArray | null

  while ((match = sidRegex.exec(content)) !== null) {
    prevEnd = lastMatch ? lastMatch.index + lastMatch[0].length : 0
    lastMatch = match
  }

  if (!lastMatch) return { summary: '', sessionId: '', mtime }

  const sessionId = lastMatch[1]
  // Text of last session: from end of previous session_id marker to start of current one
  const summary = content
    .slice(prevEnd, lastMatch.index)
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { summary, sessionId, mtime }
}

export async function GET() {
  const summaries: AgentSummary[] = AGENTS.map(agent => {
    const relayPath = join(WORKSPACE, agent, `relay_${agent}.log`)
    const { summary, sessionId, mtime } = parseRelayLog(relayPath)
    return {
      agent,
      lastSummary: summary,
      sessionId,
      mtime,
      hasLog: summary.length > 0,
    }
  })

  return NextResponse.json({ summaries })
}
