/**
 * Proxy WAHA API — dashboard wrapper untuk WhatsApp
 * Ale tidak akses port 3000 langsung; semua lewat sini supaya ada audit log.
 * PENGIRIMAN PESAN hanya bisa setelah ada approval_id yang valid dan sudah di-approve Owner.
 */
import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

export const dynamic = 'force-dynamic'

const WAHA_URL     = process.env.WAHA_URL     || 'http://localhost:3000'
const WAHA_SESSION = process.env.WAHA_SESSION || 'default'

const pool = new Pool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || 'exiom_office',
  user:     process.env.DB_USER     || 'exiom',
  password: process.env.DB_PASS     || 'exiom_local_db_2026',
  max: 3,
})

// GET — status sesi + chats terbaru
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') ?? 'status'

  if (action === 'status') {
    const res = await fetch(`${WAHA_URL}/api/sessions/${WAHA_SESSION}`).catch(() => null)
    if (!res?.ok) return NextResponse.json({ error: 'WAHA offline' }, { status: 503 })
    return NextResponse.json(await res.json())
  }

  if (action === 'chats') {
    const limit = req.nextUrl.searchParams.get('limit') ?? '20'
    const res = await fetch(`${WAHA_URL}/api/chats?session=${WAHA_SESSION}&limit=${limit}`).catch(() => null)
    if (!res?.ok) return NextResponse.json({ error: 'WAHA offline' }, { status: 503 })
    return NextResponse.json(await res.json())
  }

  return NextResponse.json({ error: 'action tidak dikenal' }, { status: 400 })
}

// POST — kirim pesan WA (WAJIB ada approval_id yang sudah approved)
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    approval_id: string
    chatId: string
    text: string
  }

  const { approval_id, chatId, text } = body

  if (!approval_id || !chatId || !text) {
    return NextResponse.json({ error: 'approval_id, chatId, dan text wajib' }, { status: 400 })
  }

  // Validasi approval sudah di-approve Owner
  const { rows } = await pool.query(
    `SELECT id, status, agent, title FROM approval_queue WHERE id = $1`,
    [approval_id]
  )
  const item = rows[0]

  if (!item) {
    return NextResponse.json({ error: 'approval_id tidak ditemukan' }, { status: 404 })
  }
  if (item.status !== 'approved') {
    return NextResponse.json({
      error: `Tidak bisa kirim — approval belum di-approve Owner (status: ${item.status})`,
    }, { status: 403 })
  }

  // Kirim via WAHA
  const waRes = await fetch(`${WAHA_URL}/api/sendText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: WAHA_SESSION, chatId, text }),
  }).catch(e => { throw new Error(`WAHA error: ${(e as Error).message}`) })

  if (!waRes.ok) {
    const err = await waRes.json().catch(() => ({}))
    return NextResponse.json({ error: 'WAHA gagal', detail: err }, { status: 502 })
  }

  // Log ke decisions_log
  await pool.query(`
    INSERT INTO decisions_log (agent, action, entity_type, entity_id, summary, approval_priority)
    VALUES ($1, 'send_wa', 'lead', $2, $3, 'hot_lead')
  `, [item.agent, approval_id, `WA terkirim ke ${chatId} — "${text.slice(0, 80)}"`])

  const data = await waRes.json()
  return NextResponse.json({ success: true, messageId: data?.id, chatId, approval_id })
}
