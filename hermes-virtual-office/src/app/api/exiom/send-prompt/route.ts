import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const RELAY_URL = process.env.HERMES_RELAY_URL || 'http://127.0.0.1:3101'

const VALID_AGENTS = new Set([
  'kenzie', 'adi', 'mia', 'deril', 'gagah',
  'nela', 'ale', 'joce', 'hugo',
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agent, prompt } = body as { agent: string; prompt: string }

    if (!agent || !VALID_AGENTS.has(agent.toLowerCase())) {
      return NextResponse.json({ error: `agent tidak valid: ${agent}` }, { status: 400 })
    }
    if (!prompt || prompt.trim().length < 3) {
      return NextResponse.json({ error: 'prompt terlalu pendek' }, { status: 400 })
    }

    const relayRes = await fetch(`${RELAY_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: agent.toLowerCase(), prompt: prompt.trim() }),
    })

    if (!relayRes.ok) {
      const err = await relayRes.json().catch(() => ({ error: 'relay error' }))
      return NextResponse.json(err, { status: relayRes.status })
    }

    const data = await relayRes.json()
    return NextResponse.json(data)
  } catch (err) {
    const msg = (err as Error).message
    if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'hermes-relay tidak jalan. Jalankan: python3 tools/helpers/hermes-relay.py &' },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    const res = await fetch(`${RELAY_URL}/health`)
    const data = await res.json()
    return NextResponse.json({ relay: data, status: 'ok' })
  } catch {
    return NextResponse.json({ relay: null, status: 'offline' }, { status: 503 })
  }
}
