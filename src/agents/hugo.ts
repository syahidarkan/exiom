// Hugo — Finance agent actions
// Invoice, P&L report, budget evaluation
// TIDAK PERNAH eksekusi transaksi riil
import { agentInsert, logDecision, pool } from '../lib/db.js';
import { submitApproval } from '../lib/approval.js';

const INVOICE_PREFIX = 'INV';

// ── 1. Generate invoice otomatis ──────────────────────────────────────────────
export interface InvoiceData {
    projectId?:    string;
    clientName:    string;
    clientEmail?:  string;
    clientAddress?: string;
    lineItems:     Array<{ description: string; qty: number; unitPrice: number }>;
    taxPercent?:   number;
    dueDays?:      number;  // hari dari sekarang, default 14
    category:      'business' | 'infrastructure';
}

export async function generateInvoice(data: InvoiceData): Promise<string> {
    // Generate invoice number: INV-YYYYMM-XXXX
    const now    = new Date();
    const ym     = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const countRes = await pool.query(`SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE $1`, [`${INVOICE_PREFIX}-${ym}-%`]);
    const seq    = String(parseInt(countRes.rows[0].count) + 1).padStart(4, '0');
    const number = `${INVOICE_PREFIX}-${ym}-${seq}`;

    const subtotal  = data.lineItems.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
    const dueDate   = new Date(Date.now() + (data.dueDays ?? 14) * 86400000).toISOString().split('T')[0];

    const invoice = await agentInsert('hugo', 'invoices', {
        invoice_number:  number,
        project_id:      data.projectId ?? null,
        client_name:     data.clientName,
        client_email:    data.clientEmail ?? null,
        client_address:  data.clientAddress ?? null,
        subtotal,
        tax_percent:     data.taxPercent ?? 0,
        line_items:      JSON.stringify(data.lineItems),
        status:          'draft',
        issue_date:      now.toISOString().split('T')[0],
        due_date:        dueDate,
        report_category: data.category,
        agent_owner:     'hugo',
        agent_created:   'hugo',
    }) as { id: string };

    await logDecision({
        agent:      'hugo',
        action:     'noted',
        entityType: 'invoice',
        entityId:   invoice.id,
        summary:    `Invoice dibuat: ${number} | Klien: ${data.clientName} | Subtotal: Rp ${subtotal.toLocaleString('id-ID')} | Jatuh tempo: ${dueDate}`,
        priority:   'routine',
    });

    return invoice.id;
}

// ── 2. Kirim invoice ke Owner untuk di-send ke klien ─────────────────────────
export async function submitInvoiceForApproval(invoiceId: string): Promise<string> {
    const res = await pool.query(`SELECT * FROM invoices WHERE id=$1`, [invoiceId]);
    const inv = res.rows[0];

    return submitApproval({
        agent:           'hugo',
        title:           `Kirim Invoice: ${inv.invoice_number} ke ${inv.client_name}`,
        description:     `Subtotal: Rp ${Number(inv.subtotal).toLocaleString('id-ID')}\nJatuh tempo: ${inv.due_date}\nEmail: ${inv.client_email ?? '-'}`,
        actionRequested: 'Approve pengiriman invoice ke klien',
        priority:        'routine',
        entityType:      'invoice',
        entityId:        invoiceId,
    });
}

// ── 3. Reminder invoice overdue ───────────────────────────────────────────────
export async function checkAndRemindOverdue(): Promise<void> {
    const res = await pool.query(`
        SELECT id, invoice_number, client_name, due_date, total
        FROM invoices
        WHERE status = 'sent' AND due_date < CURRENT_DATE
        ORDER BY due_date ASC
    `);

    for (const inv of res.rows) {
        await pool.query(`UPDATE invoices SET status='overdue' WHERE id=$1`, [inv.id]);
        await submitApproval({
            agent:           'hugo',
            title:           `⏰ INVOICE OVERDUE: ${inv.invoice_number} — ${inv.client_name}`,
            description:     `Jatuh tempo: ${inv.due_date}\nTotal: Rp ${Number(inv.total).toLocaleString('id-ID')}`,
            actionRequested: 'Kirim reminder payment ke klien atau tindak lanjut manual',
            priority:        'invoice_overdue',
            entityType:      'invoice',
            entityId:        inv.id,
        });
    }
}

// ── 4. Laporan P&L bisnis (proyek klien) ─────────────────────────────────────
export async function generateBusinessPnL(month: string): Promise<{ revenue: number; pending: number; overdue: number; invoiceCount: number }> {
    const res = await pool.query(`
        SELECT
            COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END), 0)    AS revenue,
            COALESCE(SUM(CASE WHEN status='sent' THEN total ELSE 0 END), 0)    AS pending,
            COALESCE(SUM(CASE WHEN status='overdue' THEN total ELSE 0 END), 0) AS overdue,
            COUNT(*) AS invoice_count
        FROM invoices
        WHERE report_category='business'
          AND to_char(issue_date, 'YYYY-MM') = $1
    `, [month]);

    const report = {
        revenue:      Number(res.rows[0].revenue),
        pending:      Number(res.rows[0].pending),
        overdue:      Number(res.rows[0].overdue),
        invoiceCount: Number(res.rows[0].invoice_count),
    };

    await logDecision({
        agent:      'hugo',
        action:     'noted',
        entityType: 'other',
        summary:    `Laporan P&L Bisnis ${month}: Revenue Rp ${report.revenue.toLocaleString('id-ID')} | Pending Rp ${report.pending.toLocaleString('id-ID')} | Overdue Rp ${report.overdue.toLocaleString('id-ID')}`,
        priority:   'routine',
    });

    return report;
}

// ── 5. Laporan infrastruktur/operasional (API, tools) ─────────────────────────
// TERPISAH dari P&L bisnis
export async function generateInfraReport(month: string): Promise<{ totalCost: number; breakdown: Record<string, number> }> {
    const res = await pool.query(`
        SELECT SUM(subtotal) AS total
        FROM invoices
        WHERE report_category='infrastructure'
          AND to_char(issue_date, 'YYYY-MM') = $1
    `, [month]);

    // Estimasi biaya Claude API per group (dari log — di implementasi penuh bisa tarik dari Anthropic Console API)
    const report = {
        totalCost: Number(res.rows[0].total ?? 0),
        breakdown: {
            'Claude API (4 groups)': 0,   // TODO: pull dari Anthropic Console
            'Infrastructure DB':    0,
            'Other tools':          0,
        },
    };

    await logDecision({
        agent:      'hugo',
        action:     'noted',
        entityType: 'other',
        summary:    `Laporan Infrastruktur ${month}: Total Rp ${report.totalCost.toLocaleString('id-ID')}`,
        priority:   'routine',
    });

    return report;
}

// ── 6. Evaluasi request budget dari agent lain ───────────────────────────────
export async function evaluateBudgetRequest(params: {
    requesterAgent: string;
    amount:        number;
    purpose:       string;
    currentBalance?: number;
}): Promise<{ recommendation: 'approve' | 'reject' | 'reduce'; note: string }> {
    // Logika sederhana: approve kalau < Rp 500k tanpa pertanyaan, perlu analisis kalau lebih
    const maxAutoApprove = 500_000;
    let recommendation: 'approve' | 'reject' | 'reduce';
    let note: string;

    if (params.amount <= maxAutoApprove) {
        recommendation = 'approve';
        note = `Jumlah di bawah threshold auto-approve (Rp ${maxAutoApprove.toLocaleString('id-ID')})`;
    } else {
        recommendation = 'approve';
        note = `Review diperlukan untuk jumlah Rp ${params.amount.toLocaleString('id-ID')}. Pastikan ada ROI yang jelas.`;
    }

    await logDecision({
        agent:      'hugo',
        action:     'noted',
        entityType: 'other',
        summary:    `Budget eval dari ${params.requesterAgent}: Rp ${params.amount.toLocaleString('id-ID')} untuk ${params.purpose} → ${recommendation}`,
        priority:   'routine',
    });

    return { recommendation, note };
}

// ── 7. Rekap kas harian (jam 21:00 WIB) ──────────────────────────────────────
export async function dailyCashRecap(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const month = today.slice(0, 7);

    const [business, infra, overdue] = await Promise.all([
        pool.query(`SELECT COALESCE(SUM(total),0) AS v FROM invoices WHERE status='paid' AND to_char(issue_date,'YYYY-MM')=$1 AND report_category='business'`, [month]),
        pool.query(`SELECT COALESCE(SUM(subtotal),0) AS v FROM invoices WHERE report_category='infrastructure' AND to_char(issue_date,'YYYY-MM')=$1`, [month]),
        pool.query(`SELECT COUNT(*) AS n FROM invoices WHERE status='overdue'`),
    ]);

    await logDecision({
        agent:      'hugo',
        action:     'noted',
        entityType: 'other',
        summary:    `Rekap kas harian ${today}: Revenue bulan ini Rp ${Number(business.rows[0].v).toLocaleString('id-ID')} | Infra cost Rp ${Number(infra.rows[0].v).toLocaleString('id-ID')} | Overdue: ${overdue.rows[0].n} invoice`,
        priority:   'routine',
    });
}
