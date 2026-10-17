// Database connection pool untuk Exiom agent system
import { Pool, PoolClient } from 'pg';

export const pool = new Pool({
    host:     process.env.EXIOM_DB_HOST     ?? '127.0.0.1',
    port:     parseInt(process.env.EXIOM_DB_PORT ?? '5432'),
    database: process.env.EXIOM_DB_NAME     ?? 'exiom_office',
    user:     process.env.EXIOM_DB_USER     ?? 'exiom',
    password: process.env.EXIOM_DB_PASSWORD ?? 'exiom_local_db_2026',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('[exiom-db] Unexpected pool error:', err);
});

// ─── Write-permission enforcement ────────────────────────────────────────────
// Sesuai tabel write_permissions di database:
//   leads            → ale
//   projects         → kenzie
//   invoices         → hugo
//   content_calendar → mia
//   decisions_log    → semua agent
//   approval_queue   → semua agent
const WRITE_PERMISSIONS: Record<string, string[]> = {
    leads:            ['ale'],
    projects:         ['kenzie'],
    invoices:         ['hugo'],
    content_calendar: ['mia'],
    decisions_log:    ['kenzie','mia','nela','hugo','adi','deril','gagah','ale','joce','owner'],
    approval_queue:   ['kenzie','mia','nela','hugo','adi','deril','gagah','ale','joce'],
    write_permissions:['owner'],
};

export function assertWriteAccess(agentName: string, tableName: string): void {
    const allowed = WRITE_PERMISSIONS[tableName];
    if (!allowed) throw new Error(`[db] Unknown table: ${tableName}`);
    if (!allowed.includes(agentName)) {
        throw new Error(
            `[db] PERMISSION DENIED: agent '${agentName}' tidak boleh menulis ke tabel '${tableName}'. ` +
            `Write-owner: ${allowed.join(', ')}`
        );
    }
}

// ─── Helper: checked INSERT ───────────────────────────────────────────────────
export async function agentInsert(
    agentName: string,
    tableName: string,
    data: Record<string, unknown>,
    client?: PoolClient
): Promise<unknown> {
    assertWriteAccess(agentName, tableName);
    const cols = Object.keys(data);
    const vals = Object.values(data);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const db = client ?? pool;
    const res = await db.query(sql, vals);
    return res.rows[0];
}

// ─── Helper: checked UPDATE ───────────────────────────────────────────────────
export async function agentUpdate(
    agentName: string,
    tableName: string,
    id: string,
    data: Record<string, unknown>,
    client?: PoolClient
): Promise<unknown> {
    assertWriteAccess(agentName, tableName);
    const cols = Object.keys(data);
    const vals = Object.values(data);
    const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const sql = `UPDATE ${tableName} SET ${sets} WHERE id = $${cols.length + 1} RETURNING *`;
    const db = client ?? pool;
    const res = await db.query(sql, [...vals, id]);
    return res.rows[0];
}

// ─── Helper: SELECT (semua agent boleh baca) ─────────────────────────────────
export async function agentSelect(
    tableName: string,
    where?: string,
    params?: unknown[]
): Promise<unknown[]> {
    const sql = `SELECT * FROM ${tableName}${where ? ` WHERE ${where}` : ''} ORDER BY created_at DESC LIMIT 100`;
    const res = await pool.query(sql, params);
    return res.rows;
}

// ─── Helper: log ke decisions_log ────────────────────────────────────────────
export async function logDecision(params: {
    agent: string;
    action: 'approved' | 'rejected' | 'escalated' | 'revised' | 'noted';
    reason?: string;
    taskId?: string;
    entityType?: string;
    entityId?: string;
    summary?: string;
    priority?: string;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    await agentInsert(params.agent, 'decisions_log', {
        agent:             params.agent,
        action:            params.action,
        reason:            params.reason ?? null,
        task_id:           params.taskId ?? null,
        entity_type:       params.entityType ?? null,
        entity_id:         params.entityId ?? null,
        summary:           params.summary ?? null,
        approval_priority: params.priority ?? 'routine',
        metadata:          params.metadata ?? {},
    });
}
