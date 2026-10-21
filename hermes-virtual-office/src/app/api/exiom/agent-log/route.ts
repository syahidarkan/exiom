import { NextRequest, NextResponse } from 'next/server'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export const dynamic = 'force-dynamic'

const VALID_AGENTS = ['kenzie', 'adi', 'mia', 'deril', 'gagah', 'nela', 'ale', 'joce', 'hugo']

export async function GET(req: NextRequest) {
  const agent = req.nextUrl.searchParams.get('agent') ?? ''
  const lines = Math.min(200, parseInt(req.nextUrl.searchParams.get('lines') ?? '80'))

  if (!VALID_AGENTS.includes(agent.toLowerCase())) {
    return NextResponse.json({ error: 'agent tidak dikenal' }, { status: 400 })
  }

  const logPath = join(homedir(), '.hermes', 'profiles', agent.toLowerCase(), 'logs', 'agent.log')
  const relayPath = join(process.cwd(), '..', 'virtual office agent', 'workspace', agent.toLowerCase(), `relay_${agent.toLowerCase()}.log`)

  const readTail = (path: string, n: number): string[] => {
    if (!existsSync(path)) return []
    try {
      const content = readFileSync(path, 'utf8')
      return content.split('\n').filter(Boolean).slice(-n)
    } catch { return [] }
  }

  const agentLines = readTail(logPath, lines)
  const relayLines = readTail(relayPath, 20)

  return NextResponse.json({
    agent,
    agentLog: agentLines,
    relayLog: relayLines,
    logPath,
    hasLog: agentLines.length > 0,
  })
}
