// Job: kirim morning summary approval queue ke Owner via Telegram
// Dijadwalkan jam 05:00 WIB via Hermes cron
import 'dotenv/config';
import { sendMorningSummary } from '../lib/approval.js';
import { pool } from '../lib/db.js';

async function main() {
    try {
        await sendMorningSummary();
        console.log(`[${new Date().toISOString()}] morning-summary: done`);
    } catch (e) {
        console.error('[morning-summary] Error:', e);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
