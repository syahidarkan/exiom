const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID

export async function sendTelegram(text: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    return res.ok
  } catch { return false }
}

export async function getUpdates(): Promise<{ chat_id: number; username: string; text: string }[]> {
  if (!BOT_TOKEN) return []
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`)
    const data = await res.json() as { ok: boolean; result: { message: { chat: { id: number; username?: string }; text: string } }[] }
    if (!data.ok) return []
    return data.result.map(u => ({
      chat_id: u.message.chat.id,
      username: u.message.chat.username ?? '',
      text: u.message.text ?? '',
    }))
  } catch { return [] }
}
