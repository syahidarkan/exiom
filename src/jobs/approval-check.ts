// Job: cek approval queue setiap 15 menit
// Dipanggil via Hermes cron atau systemd timer
// Jam 22:00–05:00 WIB: silent (morning summary akan dikirim jam 05:00)
import 'dotenv/config';
import { checkApprovalQueue } from '../lib/approval.js';
import { pool } from '../lib/db.js';

async function main() {
    try {
        await checkApprovalQueue();
        console.log(`[${new Date().toISOString()}] approval-check: done`);
    } catch (e) {
        console.error('[approval-check] Error:', e);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
