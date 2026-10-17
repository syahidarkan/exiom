// Approval queue manager — bridge antara agent dan Owner
import { pool, agentInsert, assertWriteAccess } from './db.js';
import { sendTelegram, formatApprovalNotif, formatMorningSummary, ApprovalItem } from './telegram.js';

export type ApprovalPriority =
    | 'hot_lead'
    | 'crisis'
    | 'budget_change'
    | 'proposal'
    | 'invoice_overdue'
    | 'routine';

export interface SubmitApprovalParams {
    agent:            string;
    title:            string;
    description:      string;
    actionRequested:  string;
    priority?:        ApprovalPriority;
    taskId?:          string;
    entityType?:      string;
    entityId?:        string;
    attachmentUrls?:  string[];
    metadata?:        Record<string, unknown>;
}

// ─── Submit item ke approval queue ───────────────────────────────────────────
export async function submitApproval(params: SubmitApprovalParams): Promise<string> {
    const row = await agentInsert(params.agent, 'approval_queue', {
        agent:            params.agent,
        task_id:          params.taskId ?? null,
        entity_type:      params.entityType ?? null,
        entity_id:        params.entityId ?? null,
        priority:         params.priority ?? 'routine',
        title:            params.title,
        description:      params.description,
        action_requested: params.actionRequested,
        attachment_urls:  params.attachmentUrls ?? [],
        metadata:         params.metadata ?? {},
    }) as { id: string };

    // Hot lead → notifikasi Telegram langsung (tidak tunggu cron 15 menit)
    if (params.priority === 'hot_lead' || params.priority === 'crisis') {
        const items: ApprovalItem[] = [{
            id: row.id,
            agent: params.agent,
            title: params.title,
            priority: params.priority,
            action_requested: params.actionRequested,
            created_at: new Date(),
        }];
        await sendTelegram({
            text: formatApprovalNotif(items),
            disableNotification: false,
        });
        await pool.query('UPDATE approval_queue SET notified_at = NOW() WHERE id = $1', [row.id]);
    }

    return row.id;
}

// ─── Cron: cek approval queue setiap 15 menit ────────────────────────────────
// Dipanggil dari hermes cron job atau systemd timer
export async function checkApprovalQueue(): Promise<void> {
    const now = new Date();
    const hour = now.getHours(); // WIB (pastikan timezone server WIB)

    // Jam 22:00–05:00: kumpulkan, jangan kirim sekarang
    const isSilentHours = hour >= 22 || hour < 5;

    if (isSilentHours) {
        return; // Morning summary akan dikirim jam 05:00 via cron terpisah
    }

    // Ambil item BARU yang belum dinotifikasi, bukan hot_lead/crisis (sudah langsung kirim)
    const res = await pool.query<ApprovalItem & { id: string }>(`
        SELECT id, agent, title, priority, action_requested, created_at
        FROM approval_queue
        WHERE status = 'pending'
          AND notified_at IS NULL
          AND priority NOT IN ('hot_lead', 'crisis')
        ORDER BY
            CASE priority
                WHEN 'budget_change'   THEN 1
                WHEN 'proposal'        THEN 2
                WHEN 'invoice_overdue' THEN 3
                ELSE                        4
            END,
            created_at ASC
        LIMIT 10
    `);

    if (res.rows.length === 0) return;

    const sent = await sendTelegram({
        text: formatApprovalNotif(res.rows),
    });

    if (sent) {
        const ids = res.rows.map(r => r.id);
        await pool.query(
            'UPDATE approval_queue SET notified_at = NOW() WHERE id = ANY($1::uuid[])',
            [ids]
        );
    }
}

// ─── Morning summary (dipanggil jam 05:00 WIB) ───────────────────────────────
export async function sendMorningSummary(): Promise<void> {
    const res = await pool.query<ApprovalItem>(`
        SELECT id, agent, title, priority, action_requested, created_at
        FROM approval_queue
        WHERE status = 'pending'
          AND (notified_at IS NULL OR notified_at < NOW() - INTERVAL '3 hours')
        ORDER BY
            CASE priority
                WHEN 'hot_lead'        THEN 1
                WHEN 'crisis'          THEN 2
                WHEN 'budget_change'   THEN 3
                WHEN 'proposal'        THEN 4
                WHEN 'invoice_overdue' THEN 5
                ELSE                        6
            END,
            created_at ASC
        LIMIT 20
    `);

    if (res.rows.length === 0) return;

    await sendTelegram({
        text: formatMorningSummary(res.rows),
        disableNotification: false,
    });

    const ids = res.rows.map((r: ApprovalItem & { id: string }) => (r as unknown as { id: string }).id);
    await pool.query(
        'UPDATE approval_queue SET notified_at = NOW() WHERE id = ANY($1::uuid[])',
        [ids]
    );
}

// ─── Owner respond (approve / reject) ────────────────────────────────────────
export async function respondApproval(
    approvalId: string,
    decision: 'approved' | 'rejected',
    note?: string
): Promise<void> {
    await pool.query(`
        UPDATE approval_queue
        SET status = $1, owner_response = $1, owner_note = $2, responded_at = NOW()
        WHERE id = $3
    `, [decision, note ?? null, approvalId]);
}
