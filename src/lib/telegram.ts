// Telegram notification helper untuk approval queue Owner
// Pakai bot token yang sudah ada di Hermes default profile

const BOT_TOKEN  = process.env.EXIOM_TELEGRAM_BOT_TOKEN;
const OWNER_CHAT = process.env.EXIOM_TELEGRAM_OWNER_CHAT_ID;

export interface TelegramMessage {
    text: string;
    parseMode?: 'Markdown' | 'HTML';
    disableNotification?: boolean;
}

export async function sendTelegram(msg: TelegramMessage): Promise<boolean> {
    if (!BOT_TOKEN || !OWNER_CHAT) {
        console.warn('[telegram] EXIOM_TELEGRAM_BOT_TOKEN atau OWNER_CHAT_ID tidak diset');
        return false;
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: OWNER_CHAT,
                text: msg.text,
                parse_mode: msg.parseMode ?? 'Markdown',
                disable_notification: msg.disableNotification ?? false,
            }),
        });
        if (!res.ok) {
            const err = await res.text();
            console.error('[telegram] API error:', err);
            return false;
        }
        return true;
    } catch (e) {
        console.error('[telegram] Fetch error:', e);
        return false;
    }
}

// ─── Format pesan approval queue ─────────────────────────────────────────────

export function formatApprovalNotif(items: ApprovalItem[]): string {
    if (items.length === 0) return '';

    const priorityEmoji: Record<string, string> = {
        hot_lead:       '🔥',
        crisis:         '🚨',
        budget_change:  '💰',
        proposal:       '📋',
        invoice_overdue:'⏰',
        routine:        '📌',
    };

    const lines = items.map(item => {
        const emoji = priorityEmoji[item.priority] ?? '📌';
        return `${emoji} *${item.title}*\n   Agent: ${item.agent} | ${item.action_requested}`;
    });

    const header = items.length === 1
        ? `📬 *1 item baru di approval queue:*`
        : `📬 *${items.length} item baru di approval queue:*`;

    return [header, '', ...lines, '', `👉 Buka dashboard: http://${process.env.EXIOM_DASHBOARD_HOST ?? '100.112.183.73'}:3001`].join('\n');
}

export function formatMorningSummary(items: ApprovalItem[]): string {
    if (items.length === 0) return '';
    return [
        `🌅 *Ringkasan approval queue semalam (22:00–05:00)*`,
        `Total: ${items.length} item menunggu`,
        '',
        formatApprovalNotif(items),
    ].join('\n');
}

export interface ApprovalItem {
    id: string;
    agent: string;
    title: string;
    priority: string;
    action_requested: string;
    created_at: Date;
}
