// Test: verifikasi write-owner enforcement per tabel
// Jalankan: npx tsx tests/test-write-permissions.ts
//
// Expected:
//   - agent yang berhak: INSERT berhasil
//   - agent yang tidak berhak: thrown error PERMISSION DENIED
//   - semua agent bisa SELECT (baca)
//   - semua agent bisa INSERT ke decisions_log

import { agentInsert, agentSelect, assertWriteAccess, logDecision, pool } from '../src/lib/db.js';

type TestResult = { pass: boolean; name: string; detail?: string };
const results: TestResult[] = [];

function test(name: string, fn: () => void | Promise<void>): Promise<void> {
    return Promise.resolve(fn())
        .then(() => { results.push({ pass: true, name }); })
        .catch((e: Error) => { results.push({ pass: false, name, detail: e.message }); });
}

function testExpectError(name: string, expectedFragment: string, fn: () => void | Promise<void>): Promise<void> {
    return Promise.resolve(fn())
        .then(() => { results.push({ pass: false, name, detail: 'Expected error but none thrown' }); })
        .catch((e: Error) => {
            if (e.message.includes(expectedFragment)) {
                results.push({ pass: true, name });
            } else {
                results.push({ pass: false, name, detail: `Wrong error: ${e.message}` });
            }
        });
}

async function run() {
    console.log('\n=== Exiom Write-Permission Test ===\n');

    // ── LEADS (write-owner: ale) ──────────────────────────────────────────────
    await test('ale dapat INSERT ke leads', async () => {
        await agentInsert('ale', 'leads', {
            company_name: '[TEST] PT Dummy Lead',
            type: 'inbound',
            priority: 'cold',
            status: 'new',
            agent_owner: 'ale',
            agent_created: 'ale',
        });
    });

    await testExpectError('kenzie TIDAK BISA INSERT ke leads', 'PERMISSION DENIED', async () => {
        await agentInsert('kenzie', 'leads', { company_name: '[TEST] Unauthorized' });
    });

    await testExpectError('hugo TIDAK BISA INSERT ke leads', 'PERMISSION DENIED', async () => {
        await agentInsert('hugo', 'leads', { company_name: '[TEST] Unauthorized' });
    });

    // ── PROJECTS (write-owner: kenzie) ────────────────────────────────────────
    await test('kenzie dapat INSERT ke projects', async () => {
        await agentInsert('kenzie', 'projects', {
            name: '[TEST] Dummy Project',
            status: 'scoping',
            agent_owner: 'kenzie',
            agent_created: 'kenzie',
        });
    });

    await testExpectError('adi TIDAK BISA INSERT ke projects', 'PERMISSION DENIED', async () => {
        await agentInsert('adi', 'projects', { name: '[TEST] Unauthorized' });
    });

    await testExpectError('mia TIDAK BISA INSERT ke projects', 'PERMISSION DENIED', async () => {
        await agentInsert('mia', 'projects', { name: '[TEST] Unauthorized' });
    });

    // ── INVOICES (write-owner: hugo) ──────────────────────────────────────────
    await test('hugo dapat INSERT ke invoices', async () => {
        await agentInsert('hugo', 'invoices', {
            invoice_number: `INV-TEST-${Date.now()}`,
            client_name:    '[TEST] Klien Dummy',
            subtotal:       1000000,
            due_date:       new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            report_category: 'business',
            agent_owner:    'hugo',
            agent_created:  'hugo',
        });
    });

    await testExpectError('mia TIDAK BISA INSERT ke invoices', 'PERMISSION DENIED', async () => {
        await agentInsert('mia', 'invoices', { client_name: '[TEST] Unauthorized' });
    });

    // ── CONTENT_CALENDAR (write-owner: mia) ──────────────────────────────────
    await test('mia dapat INSERT ke content_calendar', async () => {
        await agentInsert('mia', 'content_calendar', {
            title:        '[TEST] Konten Dummy',
            content_type: 'article',
            status:       'idea',
            agent_owner:  'mia',
            agent_created:'mia',
        });
    });

    await testExpectError('deril TIDAK BISA INSERT ke content_calendar', 'PERMISSION DENIED', async () => {
        await agentInsert('deril', 'content_calendar', { title: '[TEST] Unauthorized' });
    });

    // ── DECISIONS_LOG (semua agent bisa) ─────────────────────────────────────
    for (const agent of ['kenzie','adi','mia','deril','gagah','nela','ale','joce','hugo']) {
        await test(`${agent} dapat INSERT ke decisions_log`, async () => {
            await logDecision({
                agent,
                action: 'noted',
                reason: `[TEST] Log dari ${agent}`,
                entityType: 'other',
                summary: `Test decisions_log write dari ${agent}`,
            });
        });
    }

    // ── READ: semua agent bisa SELECT ─────────────────────────────────────────
    await test('SELECT leads (semua agent bisa baca)', async () => {
        const rows = await agentSelect('leads', 'company_name LIKE $1', ['[TEST]%']);
        if (rows.length === 0) throw new Error('Expected rows');
    });

    await test('SELECT projects (semua agent bisa baca)', async () => {
        await agentSelect('projects', 'name LIKE $1', ['[TEST]%']);
    });

    // ── CLEANUP test data ─────────────────────────────────────────────────────
    await pool.query(`DELETE FROM decisions_log WHERE reason LIKE '[TEST]%'`);
    await pool.query(`DELETE FROM content_calendar WHERE title LIKE '[TEST]%'`);
    await pool.query(`DELETE FROM invoices WHERE client_name LIKE '[TEST]%'`);
    await pool.query(`DELETE FROM projects WHERE name LIKE '[TEST]%'`);
    await pool.query(`DELETE FROM leads WHERE company_name LIKE '[TEST]%'`);

    // ── Report ────────────────────────────────────────────────────────────────
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass);

    console.log(`\nResults: ${passed}/${results.length} passed\n`);
    for (const r of results) {
        const icon = r.pass ? '✅' : '❌';
        console.log(`  ${icon} ${r.name}`);
        if (!r.pass && r.detail) console.log(`       ${r.detail}`);
    }

    if (failed.length > 0) {
        console.log(`\n${failed.length} test(s) FAILED`);
        process.exit(1);
    } else {
        console.log('\nAll tests passed ✓');
    }

    await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
