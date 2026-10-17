// Test pipeline Mia (Marketing Manager)
// Jalankan: tsx tests/test-mia-pipeline.ts
import 'dotenv/config';
import assert from 'node:assert/strict';
import { pool } from '../src/lib/db.js';
import {
    doMorningTrendResearch,
    briefDeril,
    briefGagah,
    qaContent,
} from '../src/agents/mia.js';

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
    console.log('\nMia Pipeline Tests\n──────────────────');

    await test('doMorningTrendResearch returns array', async () => {
        const trends = await doMorningTrendResearch();
        assert.ok(Array.isArray(trends), 'should return array');
    });

    await test('briefDeril creates content_calendar row', async () => {
        const id = await briefDeril({
            title:           'Test Video Exiom',
            contentType:     'video',
            targetPlatforms: ['instagram'],
            trendReason:     'Trending di Indonesia',
            keyword:         'test-keyword',
        });
        assert.ok(typeof id === 'string' && id.length > 0, 'should return content_calendar id');

        const res = await pool.query('SELECT id FROM content_calendar WHERE id = $1', [id]);
        assert.equal(res.rows.length, 1, 'row should exist in DB');

        await pool.query('DELETE FROM content_calendar WHERE id = $1', [id]);
    });

    await test('briefGagah creates content_calendar row', async () => {
        const id = await briefGagah({
            title:           'Test Artikel SEO',
            contentType:     'article',
            targetPlatforms: ['web_blog'],
            trendReason:     'Keyword volume tinggi',
            keyword:         'test-seo',
        });
        assert.ok(typeof id === 'string' && id.length > 0);

        const res = await pool.query('SELECT id FROM content_calendar WHERE id = $1', [id]);
        assert.equal(res.rows.length, 1);

        await pool.query('DELETE FROM content_calendar WHERE id = $1', [id]);
    });

    await test('qaContent pass on all-true checks', async () => {
        // Need a content_calendar row first
        const id = await briefDeril({
            title: 'QA Test Video', contentType: 'video', targetPlatforms: ['instagram'],
            trendReason: 'test',
        });

        const result = await qaContent({
            contentId: id,
            brandVoiceOk: true,
            completenessOk: true,
            noSensitiveIssue: true,
        });
        assert.equal(result, 'pass');

        await pool.query('DELETE FROM content_calendar WHERE id = $1', [id]);
    });

    await test('qaContent revise on failed check', async () => {
        const id = await briefDeril({
            title: 'QA Test Fail Video', contentType: 'video', targetPlatforms: ['instagram'],
            trendReason: 'test',
        });

        const result = await qaContent({
            contentId: id,
            brandVoiceOk: false,
            completenessOk: true,
            noSensitiveIssue: true,
            notes: 'Tidak sesuai brand voice',
        });
        assert.equal(result, 'revise');

        await pool.query('DELETE FROM content_calendar WHERE id = $1', [id]);
    });

    console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed\n`);
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
})();
