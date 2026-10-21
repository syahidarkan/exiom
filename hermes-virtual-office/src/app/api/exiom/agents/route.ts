import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

export const dynamic = 'force-dynamic'

const pool = new Pool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || 'exiom_office',
  user:     process.env.DB_USER     || 'exiom',
  password: process.env.DB_PASS     || 'exiom_local_db_2026',
  max: 5,
})

const ALL_AGENTS = ['kenzie','adi','mia','deril','gagah','nela','ale','joce','hugo']

// Ensure the agent_settings table exists
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_settings (
      agent       TEXT PRIMARY KEY,
      enabled     BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  // Insert defaults for any missing agents
  for (const ag of ALL_AGENTS) {
    await pool.query(`
      INSERT INTO agent_settings (agent, enabled) VALUES ($1, TRUE)
      ON CONFLICT (agent) DO NOTHING
    `, [ag])
  }
}

// GET — return enabled/disabled state for all agents
export async function GET() {
  try {
    await ensureTable()
    const { rows } = await pool.query(
      'SELECT agent, enabled, updated_at FROM agent_settings ORDER BY agent'
    )
    return NextResponse.json({ agents: rows })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST — toggle one agent or all agents
// Body: { agent: "all" | "<name>", enabled: boolean }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { agent?: string; enabled?: boolean }
    const { agent, enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be boolean' }, { status: 400 })
    }

    await ensureTable()

    if (agent === 'all') {
      await pool.query(
        'UPDATE agent_settings SET enabled = $1, updated_at = now()',
        [enabled]
      )
      return NextResponse.json({ ok: true, updated: 'all', enabled })
    }

    if (!agent || !ALL_AGENTS.includes(agent)) {
      return NextResponse.json({ error: `unknown agent: ${agent}` }, { status: 400 })
    }

    await pool.query(
      'UPDATE agent_settings SET enabled = $1, updated_at = now() WHERE agent = $2',
      [enabled, agent]
    )

    // Log to decisions_log
    await pool.query(`
      INSERT INTO decisions_log (agent, action, details, created_at)
      VALUES ($1, $2, $3, now())
    `, [
      'owner',
      enabled ? 'agent_enabled' : 'agent_disabled',
      JSON.stringify({ target_agent: agent }),
    ]).catch(() => { /* decisions_log is optional */ })

    return NextResponse.json({ ok: true, agent, enabled })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
