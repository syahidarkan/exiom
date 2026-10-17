// Test pipeline Hugo (Finance)
// Jalankan: tsx tests/test-hugo-pipeline.ts
import 'dotenv/config';
import assert from 'node:assert/strict';
import { pool } from '../src/lib/db.js';
import {
    generateInvoice,
    submitInvoiceForApproval,
    generateBusinessPnL,
    generateInfraReport,
    evaluateBudgetRequest,
} from '../src/agents/hugo.js';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ✗ ${name}:`, (e as Error).message);
        failed++;
    }
}

(async () => {
    console.log('\nHugo Pipeline Tests\n───────────────────');

    let invoiceId = '';

    await test('generateInvoice creates invoice with INV-YYYYMM-XXXX format', async () => {
        invoiceId = await generateInvoice({
            clientName: 'Test Client Hugo',
            clientEmail: 'client@test.com',
            lineItems: [
                { description: 'Web Development', qty: 1, unitPrice: 15000000 },
                { description: 'Domain + Hosting 1 tahun', qty: 1, unitPrice: 500000 },
            ],
            taxPercent: 11,
            dueDays: 14,
            category: 'business',
        });

        assert.ok(typeof invoiceId === 'string' && invoiceId.length > 0, 'should return id');

        const res = await pool.query('SELECT invoice_number, status, report_category FROM invoices WHERE id=$1', [invoiceId]);
        assert.equal(res.rows.length, 1);
        assert.match(res.rows[0].invoice_number, /^INV-\d{6}-\d{4}$/);
        assert.equal(res.rows[0].status, 'draft');
        assert.equal(res.rows[0].report_category, 'business');
    });

    await test('submitInvoiceForApproval creates approval queue entry', async () => {
        const approvalId = await submitInvoiceForApproval(invoiceId);
        assert.ok(typeof approvalId === 'string' && approvalId.length > 0);

        const res = await pool.query('SELECT id FROM approval_queue WHERE id=$1', [approvalId]);
        assert.equal(res.rows.length, 1);

        await pool.query('DELETE FROM approval_queue WHERE id=$1', [approvalId]);
    });

    await test('generateInvoice — infrastructure category', async () => {
        const infraId = await generateInvoice({
            clientName: 'Claude API',
            lineItems: [{ description: 'Claude API usage October 2026', qty: 1, unitPrice: 75000 }],
            category: 'infrastructure',
        });
        assert.ok(typeof infraId === 'string');

        const res = await pool.query('SELECT report_category FROM invoices WHERE id=$1', [infraId]);
        assert.equal(res.rows[0].report_category, 'infrastructure');

        await pool.query('DELETE FROM invoices WHERE id=$1', [infraId]);
    });

    await test('generateBusinessPnL returns correct shape', async () => {
        const month = new Date().toISOString().slice(0, 7);
        const pnl = await generateBusinessPnL(month);
        assert.ok(typeof pnl.revenue === 'number');
        assert.ok(typeof pnl.pending === 'number');
        assert.ok(typeof pnl.overdue === 'number');
        assert.ok(typeof pnl.invoiceCount === 'number');
    });

    await test('generateInfraReport returns correct shape', async () => {
        const month = new Date().toISOString().slice(0, 7);
        const infra = await generateInfraReport(month);
        assert.ok(typeof infra.totalCost === 'number');
        assert.ok(typeof infra.breakdown === 'object');
    });

    await test('evaluateBudgetRequest approve under 500k', async () => {
        const result = await evaluateBudgetRequest({
            requesterAgent: 'mia',
            amount: 300000,
            purpose: 'Boost IG post',
        });
        assert.equal(result.recommendation, 'approve');
    });

    await test('evaluateBudgetRequest still approve above 500k (with note)', async () => {
        const result = await evaluateBudgetRequest({
            requesterAgent: 'mia',
            amount: 2000000,
            purpose: 'Meta Ads campaign Q4',
        });
        assert.equal(result.recommendation, 'approve');
        assert.ok(result.note.includes('Review'));
    });

    // cleanup test invoice
    if (invoiceId) {
        await pool.query('DELETE FROM invoices WHERE id=$1', [invoiceId]);
    }

    console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed\n`);
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
})();
