// Test end-to-end: satu siklus kerja Kenzie + Adi
// Owner brief → Kenzie breakdown → Adi submit → Kenzie QA → approval queue Owner
//
// Jalankan: npx tsx tests/test-kenzie-adi-pipeline.ts

import { pool } from '../src/lib/db.js';
import {
    createProjectFromBrief,
    assignTaskToAdi,
    performQa,
    submitMilestoneApproval,
    markProjectDeployed,
} from '../src/agents/kenzie.js';
import { submitTaskForQa, requestOpusEscalation } from '../src/agents/adi.js';

type TestResult = { pass: boolean; name: string; detail?: string };
const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
    try {
        await fn();
        results.push({ pass: true, name });
    } catch (e: unknown) {
        results.push({ pass: false, name, detail: (e as Error).message });
    }
}

async function run() {
    console.log('\n=== Test: Kenzie + Adi Dev Pipeline ===\n');

    let projectId = '';
    let approvalId = '';

    // ── Step 1: Owner beri brief → Kenzie buat project ───────────────────────
    await test('Kenzie: terima brief dan buat project', async () => {
        projectId = await createProjectFromBrief({
            name:         '[TEST] Website Dummy Client',
            clientName:   '[TEST] PT Dummy Corp',
            serviceType:  'web_dev',
            requirements: 'Landing page Next.js, 5 halaman, SEO-ready, mobile responsive',
            deadline:     '2026-11-30',
        });
        if (!projectId) throw new Error('projectId kosong');
        console.log(`  projectId: ${projectId}`);
    });

    // ── Step 2: Kenzie breakdown dan assign ke Adi ────────────────────────────
    await test('Kenzie: assign task ke Adi', async () => {
        await assignTaskToAdi({
            projectId,
            title:     'Setup Next.js project + routing',
            detail:    'Init Next.js 14, setup folder structure, buat 5 halaman dasar, pastikan mobile responsive',
            milestone: 'Setup & Routing',
        });
    });

    // ── Step 3: Adi kerjakan dan submit ke QA ────────────────────────────────
    await test('Adi: submit task ke Kenzie untuk QA', async () => {
        await submitTaskForQa({
            projectId,
            taskTitle:    'Setup Next.js project + routing',
            changedFiles: ['src/app/page.tsx', 'src/app/layout.tsx', 'package.json'],
            testResults:  'npm run build: OK, npm run lint: OK, responsive: OK',
            prUrl:        'https://github.com/syahidarkan/exiom/pull/1',
        });
    });

    // ── Step 4: Adi coba escalate Opus tapi baru stuck 1x → harus error ──────
    await test('Adi: escalate Opus DITOLAK (baru stuck 1x)', async () => {
        let threw = false;
        try {
            await requestOpusEscalation({
                projectId,
                taskTitle:          'Complex algorithm',
                stuckCount:         1,
                problemDescription: 'Coba dulu',
            });
        } catch {
            threw = true;
        }
        if (!threw) throw new Error('Seharusnya error saat stuck < 2x');
    });

    // ── Step 5: Kenzie QA — pass ──────────────────────────────────────────────
    await test('Kenzie: QA pass', async () => {
        const result = await performQa({
            projectId,
            taskTitle:          'Setup Next.js project + routing',
            lintPassed:         true,
            testPassed:         true,
            meetsRequirements:  true,
            notes:              'Semua check pass, siap milestone',
        });
        if (result !== 'pass') throw new Error(`QA result: ${result}`);
    });

    // ── Step 6: Kenzie submit milestone ke approval Owner ─────────────────────
    await test('Kenzie: submit milestone ke approval queue Owner', async () => {
        approvalId = await submitMilestoneApproval({
            projectId,
            projectName:  '[TEST] Website Dummy Client',
            milestone:    'Setup & Routing',
            description:  'Next.js project siap, 5 halaman, responsive, lint & test pass.',
            evidenceUrls: ['https://github.com/syahidarkan/exiom/pull/1'],
        });
        if (!approvalId) throw new Error('approvalId kosong');
        console.log(`  approvalId: ${approvalId}`);
    });

    // ── Step 7: Cek approval queue berisi item ────────────────────────────────
    await test('Approval queue berisi item dari Kenzie', async () => {
        const res = await pool.query(
            'SELECT * FROM approval_queue WHERE id = $1',
            [approvalId]
        );
        if (res.rows.length === 0) throw new Error('Item tidak ada di approval_queue');
        const item = res.rows[0];
        if (item.agent !== 'kenzie') throw new Error(`agent salah: ${item.agent}`);
        if (item.status !== 'pending') throw new Error(`status salah: ${item.status}`);
        console.log(`  priority: ${item.priority}, status: ${item.status}`);
    });

    // ── Step 8: Simulasi Owner approve → project deployed ─────────────────────
    await test('Owner approve → Kenzie mark project deployed', async () => {
        await pool.query(
            `UPDATE approval_queue SET status='approved', owner_response='approved', responded_at=NOW() WHERE id=$1`,
            [approvalId]
        );
        await markProjectDeployed(projectId);

        const res = await pool.query('SELECT status FROM projects WHERE id=$1', [projectId]);
        if (res.rows[0]?.status !== 'deployed') throw new Error('Project bukan deployed');
    });

    // ── Step 9: Cek decisions_log terisi ─────────────────────────────────────
    await test('decisions_log terisi rekam jejak seluruh siklus', async () => {
        const res = await pool.query(
            `SELECT action, agent FROM decisions_log WHERE entity_id = $1 ORDER BY created_at`,
            [projectId]
        );
        console.log(`  ${res.rows.length} log entries:`);
        for (const r of res.rows) console.log(`    ${r.agent}: ${r.action}`);
        if (res.rows.length < 3) throw new Error('Terlalu sedikit log entries');
    });

    // ── Cleanup ───────────────────────────────────────────────────────────────
    if (projectId) {
        await pool.query(`DELETE FROM decisions_log WHERE entity_id = $1`, [projectId]);
        await pool.query(`DELETE FROM approval_queue WHERE id = $1`, [approvalId]);
        await pool.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
    }

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
        console.log('\nAll pipeline tests passed ✓');
    }

    await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
