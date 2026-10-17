import 'dotenv/config';
import { dailyCashRecap } from '../agents/hugo.js';

(async () => {
    await dailyCashRecap();
    console.log('[hugo-daily-recap] selesai', new Date().toISOString());
    process.exit(0);
})();
