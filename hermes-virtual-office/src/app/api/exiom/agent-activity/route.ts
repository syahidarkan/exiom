import { NextResponse } from 'next/server'
import { existsSync, statSync, openSync, readSync, closeSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const dynamic = 'force-dynamic'

const HERMES = join(homedir(), '.hermes')
const ALL_AGENTS = ['kenzie','adi','mia','deril','gagah','nela','ale','joce','hugo']

type AgentActivity = {
  agent: string
  status: 'running' | 'idle' | 'blocked' | 'done'
  lastAction: string
  lastSeen: string | null
  apiCalls: number
  sessionId: string | null
}

function parseAgentLog(agent: string): AgentActivity {
  const logPath = join(HERMES, 'profiles', agent, 'logs', 'agent.log')
  const base: AgentActivity = {
    agent, status: 'idle', lastAction: '—', lastSeen: null, apiCalls: 0, sessionId: null,
  }

  if (!existsSync(logPath)) return base

  try {
    const { size } = statSync(logPath)
    if (size === 0) return base
    const readSize = Math.min(8192, size)
    const buf = Buffer.alloc(readSize)
    const fd = openSync(logPath, 'r')
    readSync(fd, buf, 0, readSize, size - readSize)
    closeSync(fd)
    const lines = buf.toString('utf8').split('\n').filter(Boolean)

    let lastTimestamp: Date | null = null
    let apiCalls = 0
    let sessionId: string | null = null
    let lastAction = '—'
    let interrupted = false
    let blocked = false

    for (const line of lines) {
      // Skip MCP keepalive/httpx noise — tidak mencerminkan aktivitas agent
      if (line.includes('httpx') || line.includes('MCP:') || line.includes('mcp_tool')) continue

      const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/)
      if (tsMatch) lastTimestamp = new Date(tsMatch[1])  // local time, no Z

      const sessMatch = line.match(/\[([0-9a-f_]{10,})\]/)
      if (sessMatch) sessionId = sessMatch[1]

      if (line.includes('API call #')) {
        const m = line.match(/API call #(\d+)/)
        if (m) apiCalls = Math.max(apiCalls, parseInt(m[1]))
        const inT = line.match(/in=(\d+)/)?.[1] ?? '?'
        const outT = line.match(/out=(\d+)/)?.[1] ?? '?'
        lastAction = `berpikir (call #${apiCalls}, ${inT}→${outT} token)`
        blocked = false
      }

      if (line.includes('tool terminal completed')) {
        lastAction = 'menjalankan terminal'
        blocked = false
      }

      if (line.includes('tool_executor') && line.includes('completed')) {
        const toolMatch = line.match(/tool (\w+) completed/)
        if (toolMatch && toolMatch[1] !== 'terminal') lastAction = `tool: ${toolMatch[1]}`
      }

      if (line.includes('BLOCKED:')) {
        lastAction = '⚠ command diblokir — butuh izin Owner'
        blocked = true
      }

      if (line.includes('Interrupt requested')) {
        interrupted = true
        lastAction = 'dihentikan / menunggu'
      }

      if (line.includes('submit_approval') || line.includes('mengajukan approval')) {
        lastAction = 'mengajukan item ke approval queue'
      }
    }

    const ageSec = lastTimestamp
      ? (Date.now() - lastTimestamp.getTime()) / 1000
      : Infinity

    let status: AgentActivity['status']
    if (blocked) {
      status = 'blocked'
    } else if (!interrupted && ageSec < 45) {
      status = 'running'
    } else if (ageSec < 600) {
      status = 'done'
    } else {
      status = 'idle'
    }

    return { agent, status, lastAction, lastSeen: lastTimestamp?.toISOString() ?? null, apiCalls, sessionId }
  } catch {
    return base
  }
}

export async function GET() {
  const agents = ALL_AGENTS.map(parseAgentLog)
  return NextResponse.json({ agents, ts: new Date().toISOString() })
}
