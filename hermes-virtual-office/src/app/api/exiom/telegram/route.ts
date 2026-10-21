import { NextRequest, NextResponse } from 'next/server'
import { getUpdates } from '@/lib/telegram'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export const dynamic = 'force-dynamic'

const ENV_PATH = join(process.cwd(), '.env.local')

// GET — ambil chat ID dari update terbaru bot (setelah user kirim /start)
export async function GET() {
  const updates = await getUpdates()
  if (!updates.length) {
    return NextResponse.json({ found: false, message: 'Belum ada pesan masuk. Kirim /start ke @exiom_bot dulu.' })
  }
  // Ambil chat ID terbaru
  const latest = updates[updates.length - 1]
  return NextResponse.json({ found: true, chat_id: latest.chat_id, username: latest.username })
}

// POST — simpan chat ID ke .env.local
export async function POST(req: NextRequest) {
  const { chat_id } = await req.json() as { chat_id: string }
  if (!chat_id) return NextResponse.json({ error: 'chat_id wajib' }, { status: 400 })

  if (!existsSync(ENV_PATH)) {
    return NextResponse.json({ error: '.env.local tidak ditemukan' }, { status: 500 })
  }

  const content = readFileSync(ENV_PATH, 'utf8')
  const updated = content.replace(/^TELEGRAM_CHAT_ID=.*$/m, `TELEGRAM_CHAT_ID=${chat_id}`)
  writeFileSync(ENV_PATH, updated)

  return NextResponse.json({ success: true, chat_id })
}
