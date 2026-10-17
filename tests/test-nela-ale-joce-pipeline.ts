// Test pipeline Nela, Ale, Joce
// Jalankan: tsx tests/test-nela-ale-joce-pipeline.ts
import 'dotenv/config';
import assert from 'node:assert/strict';
import { pool } from '../src/lib/db.js';
import { qaProposal, qaAleResponse } from '../src/agents/nela.js';
import { processInbound, classifyLead, submitHotLeadToOwner } from '../src/agents/ale.js';
import { addProspect, draftProposal } from '../src/agents/joce.js';

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
    console.log('\nNela + Ale + Joce Pipeline Tests\n─────────────────────────────────');

    // ─── Ale ───
    let leadId = '';

    await test('Ale: processInbound creates lead', async () => {
        leadId = await processInbound({
            channel: 'whatsapp',
            senderName: 'Test Client WA',
            senderContact: '628123456789',
            message: 'Halo, saya mau tanya soal web development',
            receivedAt: new Date(),
        });
        assert.ok(typeof leadId === 'string' && leadId.length > 0);

        const res = await pool.query('SELECT id, type FROM leads WHERE id=$1', [leadId]);
        assert.equal(res.rows.length, 1);
        assert.equal(res.rows[0].type, 'inbound');
    });

    await test('Ale: classifyLead updates priority', async () => {
        await classifyLead(leadId, {
            type: 'warm',
            reasoning: 'Sudah punya budget, butuh web dalam 1 bulan',
            bantBudget: '10-20 juta',
            bantNeed: 'Company profile + landing page',
            bantTimeline: '1 bulan',
        });
        const res = await pool.query('SELECT priority FROM leads WHERE id=$1', [leadId]);
        assert.equal(res.rows[0].priority, 'warm');
    });

    await test('Ale: submitHotLeadToOwner returns approval id', async () => {
        const hotLeadId = await processInbound({
            channel: 'whatsapp',
            senderName: 'Hot Lead Corp',
            senderContact: '628999888777',
            message: 'Mau buat sistem ERP budget 500 juta, bisa mulai bulan ini',
            receivedAt: new Date(),
        });

        const approvalId = await submitHotLeadToOwner({
            leadId: hotLeadId,
            clientName: 'Hot Lead Corp',
            need: 'Custom ERP sistem',
            budget: '500 juta',
            timeline: 'Bulan ini',
            draftResponse: 'Halo, terima kasih sudah menghubungi Exiom...',
        });
        assert.ok(typeof approvalId === 'string' && approvalId.length > 0);

        // cleanup
        await pool.query('DELETE FROM approval_queue WHERE id=$1', [approvalId]);
        await pool.query('DELETE FROM leads WHERE id=$1', [hotLeadId]);
    });

    // ─── Joce ───
    let prospectLeadId = '';

    await test('Joce: addProspect inserts lead as outbound', async () => {
        prospectLeadId = await addProspect({
            companyName: 'Prospek Corp Test',
            contactEmail: 'test@prospek.com',
            industry: 'e-commerce',
            source: 'LinkedIn riset',
            needSummary: 'Butuh redesign toko online',
            icpMatch: ['startup', 'e-commerce'],
        });
        assert.ok(typeof prospectLeadId === 'string');

        const res = await pool.query('SELECT type, agent_created FROM leads WHERE id=$1', [prospectLeadId]);
        assert.equal(res.rows[0].type, 'outbound');
        assert.equal(res.rows[0].agent_created, 'joce');
    });

    await test('Joce: draftProposal runs without error', async () => {
        await draftProposal({
            leadId:      prospectLeadId,
            clientName:  'Prospek Corp Test',
            subject:     'Proposal Web Development Exiom',
            body:        'Halo Prospek Corp, kami ingin menawarkan...',
            serviceType: 'web_development',
            estimateIdr: 15000000,
            channel:     'email',
        });
    });

    // ─── Nela ───
    await test('Nela: qaProposal pass on all-true', async () => {
        const result = await qaProposal({
            leadId: prospectLeadId,
            clientName: 'Prospek Corp Test',
            draft: 'Proposal lengkap...',
            check: { brandVoiceConsistent: true, complete: true, noSensitiveIssue: true },
        });
        assert.equal(result, 'pass');
    });

    await test('Nela: qaProposal revise on failed check', async () => {
        const result = await qaProposal({
            leadId: prospectLeadId,
            clientName: 'Prospek Corp Test',
            draft: 'Proposal kurang lengkap...',
            check: { brandVoiceConsistent: true, complete: false, noSensitiveIssue: true, notes: 'Belum ada harga' },
        });
        assert.equal(result, 'revise');
    });

    await test('Nela: qaAleResponse pass on all-true', async () => {
        const result = await qaAleResponse({
            leadId,
            draft: 'Halo, terima kasih sudah menghubungi kami...',
            check: { brandVoiceConsistent: true, complete: true, noSensitiveIssue: true },
        });
        assert.equal(result, 'pass');
    });

    // cleanup
    await pool.query('DELETE FROM leads WHERE id IN ($1, $2)', [leadId, prospectLeadId]);

    console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed\n`);
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
})();
