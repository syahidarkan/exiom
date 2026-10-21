import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { sendTelegram } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

const pool = new Pool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || 'exiom_office',
  user:     process.env.DB_USER     || 'exiom',
  password: process.env.DB_PASS     || 'exiom_local_db_2026',
  max: 5,
})

// GET — daftar approval pending (urut prioritas)
export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT
        id, agent, title, description, action_requested,
        priority, entity_type, entity_id, status,
        created_at, responded_at, owner_response, owner_note
      FROM approval_queue
      WHERE status = 'pending'
      ORDER BY
        CASE priority
          WHEN 'hot_lead'       THEN 1
          WHEN 'crisis'         THEN 2
          WHEN 'budget_change'  THEN 3
          WHEN 'proposal'       THEN 4
          WHEN 'invoice_overdue' THEN 5
          ELSE 6
        END,
        created_at ASC
      LIMIT 50
    `)
    // Also fetch recent approved/rejected for history
    const { rows: recent } = await pool.query(`
      SELECT id, agent, title, description, action_requested,
        priority, status, created_at, responded_at, owner_response, owner_note
      FROM approval_queue
      WHERE status IN ('approved','rejected')
      ORDER BY responded_at DESC
      LIMIT 20
    `)
    return NextResponse.json({ pending: rows, count: rows.length, recent })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 503 },
    )
  }
}

// PUT — agent mengajukan item baru ke approval queue
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { agent, title, description, action_requested, priority, task_id, entity_type, entity_id, metadata } = body as {
      agent: string
      title: string
      description: string
      action_requested: string
      priority?: string
      task_id?: string
      entity_type?: string
      entity_id?: string
      metadata?: Record<string, unknown>
    }

    if (!agent || !title || !description || !action_requested) {
      return NextResponse.json(
        { error: 'agent, title, description, action_requested wajib' },
        { status: 400 },
      )
    }

    const VALID_AGENTS = ['kenzie','adi','mia','deril','gagah','nela','ale','joce','hugo']
    if (!VALID_AGENTS.includes(agent.toLowerCase())) {
      return NextResponse.json({ error: `agent tidak dikenal: ${agent}` }, { status: 400 })
    }

    const VALID_PRIORITY = ['routine','proposal','budget_change','crisis','hot_lead','invoice_overdue']
    const safePriority = VALID_PRIORITY.includes(priority ?? '') ? priority : 'routine'

    const { rows } = await pool.query(`
      INSERT INTO approval_queue
        (agent, title, description, action_requested, priority, task_id, entity_type, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at
    `, [
      agent.toLowerCase(),
      title,
      description,
      action_requested,
      safePriority,
      task_id ?? null,
      entity_type ?? null,
      JSON.stringify(metadata ?? {}),
    ])

    // Log ke decisions_log
    await pool.query(`
      INSERT INTO decisions_log (agent, action, entity_type, entity_id, summary, approval_priority)
      VALUES ($1, 'submit_approval', 'other', $2, $3, $4)
    `, [agent.toLowerCase(), rows[0].id, `Mengajukan approval: ${title}`, safePriority])

    // Telegram notif ke Owner
    const priorityEmoji: Record<string, string> = {
      hot_lead: '🔥', crisis: '🚨', budget_change: '💰',
      proposal: '📄', invoice_overdue: '⏰', routine: '📋',
    }
    const emoji = priorityEmoji[safePriority ?? 'routine'] ?? '📋'
    sendTelegram(
      `${emoji} <b>${title}</b>\n` +
      `dari: <code>${agent.toLowerCase()}</code> · <code>${safePriority}</code>\n\n` +
      `${description.slice(0, 180)}${description.length > 180 ? '…' : ''}\n\n` +
      `<b>👉 Buka dashboard untuk Approve / Reject</b>\n` +
      `<a href="http://100.112.183.73:3002">http://100.112.183.73:3002</a>`
    ).catch(() => {})

    return NextResponse.json({ success: true, id: rows[0].id, created_at: rows[0].created_at })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// POST — approve atau reject satu item
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, decision, note } = body as {
      id: string
      decision: 'approved' | 'rejected'
      note?: string
    }

    if (!id || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'id dan decision (approved/rejected) wajib' }, { status: 400 })
    }

    const { rowCount } = await pool.query(`
      UPDATE approval_queue
      SET
        status       = $1,
        owner_response = $1,
        owner_note   = $2,
        responded_at = NOW()
      WHERE id = $3 AND status = 'pending'
    `, [decision, note ?? null, id])

    if (rowCount === 0) {
      return NextResponse.json({ error: 'item tidak ditemukan atau sudah direspons' }, { status: 404 })
    }

    // Ambil detail item untuk trigger agent
    const { rows: itemRows } = await pool.query(
      `SELECT agent, title, action_requested FROM approval_queue WHERE id = $1`,
      [id]
    )
    const item = itemRows[0] as { agent: string; title: string; action_requested: string } | undefined

    // Log ke decisions_log
    await pool.query(`
      INSERT INTO decisions_log (agent, action, entity_type, entity_id, summary, approval_priority)
      VALUES ('owner', $1, 'other', $2, $3, 'routine')
    `, [
      decision,
      id,
      `Owner ${decision}: ${note ?? '(no note)'}`,
    ])

    // Auto-kick agent(s) setelah approval — fire & forget via relay
    const agentsKicked: string[] = []
    if (decision === 'approved' && item?.agent) {
      const relayUrl = process.env.HERMES_RELAY_URL || 'http://127.0.0.1:3101'
      const kickRelay = (agent: string, prompt: string) =>
        fetch(`${relayUrl}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent, prompt }),
        }).catch(() => {})

      // Kick agent yang submit
      const ownerNote = note ? `\n\nCatatan Owner: ${note}` : ''
      kickRelay(item.agent, `Owner meng-approve item dari approval queue kamu.\n\nJudul: ${item.title}\nAction: ${item.action_requested}${ownerNote}\n\nLanjutkan sesuai action di atas sekarang.`)
      agentsKicked.push(item.agent)

      // Pipeline rules: kickagen berikutnya berdasarkan alur bisnis
      const action = item.action_requested.toLowerCase()
      const title  = item.title.toLowerCase()

      // Joce approve leads → kick Ale untuk approach
      if (item.agent === 'joce' && (action.includes('ale') || title.includes('lead'))) {
        kickRelay('ale', `Joce baru saja mendapatkan approval Owner untuk leads baru.\n\nJudul approval: ${item.title}\nDetail: ${item.action_requested}\n\nCek workspace/joce/leads_20261020.md, pilih lead yang kontaknya sudah terverifikasi (WA/IG), dan siapkan pesan approach pertama sesuai handbook Ale. JANGAN kirim pesan dulu — ajukan dulu ke approval queue Owner dengan action "kirim pesan ke [nama bisnis] via [WA/IG]".`)
        agentsKicked.push('ale')
      }

      // Gagah approve artikel → kick Deril untuk buat konten
      if (item.agent === 'gagah' && (action.includes('deril') || title.includes('artikel') || title.includes('draft'))) {
        kickRelay('deril', `Gagah baru saja mendapatkan approval Owner untuk konten baru.\n\nJudul: ${item.title}\nDetail: ${item.action_requested}\n\nCek workspace/gagah/ untuk brief dan outline, lalu kerjakan sesuai action di atas.`)
        agentsKicked.push('deril')
      }

      // Mia approve content calendar → kick Deril + Gagah
      if (item.agent === 'mia' && title.includes('content calendar')) {
        kickRelay('deril', `Mia baru saja mendapat approval Owner untuk content calendar.\n\nJudul: ${item.title}\nDetail: ${item.action_requested}\n\nCek workspace/mia/brief_deril.md dan workspace/mia/content_calendar_2w.md, lalu lanjutkan produksi konten sesuai brief.`)
        kickRelay('gagah', `Mia baru saja mendapat approval Owner untuk content calendar.\n\nJudul: ${item.title}\nDetail: ${item.action_requested}\n\nCek workspace/mia/brief_gagah.md, lalu lanjutkan riset keyword dan artikel sesuai brief.`)
        agentsKicked.push('deril', 'gagah')
      }
    }

    return NextResponse.json({ success: true, id, decision, agentsKicked })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
