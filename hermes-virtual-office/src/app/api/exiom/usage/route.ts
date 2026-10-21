import { NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const HERMES = join(homedir(), '.hermes')

// Pricing per million tokens (Claude API rates, approximate)
const PRICE: Record<string, { in: number; out: number }> = {
  'g1-sonnet': { in: 3.0,  out: 15.0 },
  'g2-sonnet': { in: 3.0,  out: 15.0 },
  'g3-sonnet': { in: 3.0,  out: 15.0 },
  'g4-sonnet': { in: 3.0,  out: 15.0 },
  'g1-haiku':  { in: 0.80, out: 4.0  },
  'g2-haiku':  { in: 0.80, out: 4.0  },
  'g3-haiku':  { in: 0.80, out: 4.0  },
  'g4-haiku':  { in: 0.80, out: 4.0  },
}

const ALL_AGENTS = ['kenzie','adi','mia','deril','gagah','nela','ale','joce','hugo']

type AgentUsage = {
  agent: string
  tokensIn: number
  tokensOut: number
  costUsd: number
  models: string[]
}

function readProfileUsage(agent: string): AgentUsage {
  const dbPath = join(HERMES, 'profiles', agent, 'state.db')
  const base: AgentUsage = { agent, tokensIn: 0, tokensOut: 0, costUsd: 0, models: [] }
  if (!existsSync(dbPath)) return base
  let db: Database.Database | null = null
  try {
    db = new Database(dbPath, { readonly: true })
    const rows = db.prepare(
      `SELECT model, COALESCE(SUM(input_tokens),0) AS inp, COALESCE(SUM(output_tokens),0) AS out
       FROM session_model_usage GROUP BY model`
    ).all() as { model: string; inp: number; out: number }[]

    let cost = 0
    let tIn = 0
    let tOut = 0
    const models: string[] = []
    for (const r of rows) {
      if (!r.model) continue
      tIn  += r.inp
      tOut += r.out
      const p = PRICE[r.model.toLowerCase()]
      if (p) cost += (r.inp * p.in + r.out * p.out) / 1_000_000
      models.push(r.model)
    }
    return { agent, tokensIn: tIn, tokensOut: tOut, costUsd: cost, models }
  } catch {
    return base
  } finally {
    db?.close()
  }
}

export async function GET() {
  const perAgent = ALL_AGENTS.map(readProfileUsage)
  const totalCostUsd = perAgent.reduce((s, a) => s + a.costUsd, 0)
  const totalTokensIn  = perAgent.reduce((s, a) => s + a.tokensIn, 0)
  const totalTokensOut = perAgent.reduce((s, a) => s + a.tokensOut, 0)

  return NextResponse.json({
    totalCostUsd: Math.round(totalCostUsd * 100000) / 100000,
    totalTokensIn,
    totalTokensOut,
    perAgent,
  })
}
