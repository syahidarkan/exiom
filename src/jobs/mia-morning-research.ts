import 'dotenv/config';
import { doMorningTrendResearch } from '../agents/mia.js';

(async () => {
    const trends = await doMorningTrendResearch();
    console.log('[mia-morning-research] selesai', new Date().toISOString(), `— ${trends.length} tren ditemukan`);
    process.exit(0);
})();
