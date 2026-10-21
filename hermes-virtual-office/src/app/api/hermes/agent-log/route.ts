/**
 * GET /api/hermes/agent-log?agent=<agentId>
 * Returns the last 50 lines of the agent's Hermes log file.
 * Used by the click-to-inspect panel in VirtualOfficeGame (item 15).
 */
import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export const dynamic = 'force-dynamic'

const HERMES_PROFILES = join(homedir(), '.hermes', 'profiles')
const LINES = 50

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const agent = searchParams.get('agent')?.toLowerCase().replace(/[^a-z0-9_-]/g, '')
  if (!agent) return NextResponse.json({ error: 'agent param required' }, { status: 400 })

  const logPath = join(HERMES_PROFILES, agent, 'logs', 'agent.log')
  if (!existsSync(logPath)) {
    return NextResponse.json({ agent, log: `(log belum ada: ${logPath})` })
  }

  try {
    const content = readFileSync(logPath, 'utf8')
    const lines = content.split('\n').filter(Boolean)
    const tail = lines.slice(-LINES).join('\n')
    return NextResponse.json({ agent, log: tail, totalLines: lines.length })
  } catch (err) {
    return NextResponse.json({ agent, log: `(error: ${(err as Error).message})` })
  }
}
