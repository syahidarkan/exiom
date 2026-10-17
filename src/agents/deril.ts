// Deril — Editor agent actions
// Produksi via Remotion + TTS open-source, upload via API setelah approval Owner
import { logDecision, pool } from '../lib/db.js';
import { submitApproval } from '../lib/approval.js';
import { postToAll, PostContent, PostResult } from '../lib/social.js';

export interface AssetProduction {
    contentId:   string;
    contentType: 'video' | 'graphic' | 'carousel' | 'shorts';
    remotionComp: string;  // nama Remotion composition
    outputPath:   string;  // path file hasil render
    ttsScript?:   string;  // script voice-over
    durationSec?: number;
}

export interface PlatformVariant {
    platform:   string;
    filePath:   string;
    caption:    string;
    hashtags:   string[];
}

// ── 1. Render aset via Remotion ───────────────────────────────────────────────
// Eksekusi render dari CLI: npx remotion render <comp> <output>
export async function renderWithRemotion(params: AssetProduction): Promise<string> {
    const { execSync } = await import('child_process');
    const remotionDir = `/home/naca/pemrograman/virtual office agent/remotion`;

    const cmd = [
        'npx remotion render',
        params.remotionComp,
        params.outputPath,
        '--log=verbose',
    ].join(' ');

    try {
        execSync(cmd, { cwd: remotionDir, stdio: 'pipe', timeout: 120000 });
        await logDecision({
            agent:      'deril',
            action:     'noted',
            entityType: 'content',
            entityId:   params.contentId,
            summary:    `Render selesai: ${params.remotionComp} → ${params.outputPath}`,
            priority:   'routine',
        });
        return params.outputPath;
    } catch (e) {
        await logDecision({
            agent:      'deril',
            action:     'escalated',
            entityType: 'content',
            entityId:   params.contentId,
            summary:    `Render GAGAL: ${params.remotionComp}`,
            reason:     String(e),
            priority:   'routine',
        });
        throw e;
    }
}

// ── 2. Generate voice-over via Edge-TTS ──────────────────────────────────────
export async function generateVoiceOver(params: {
    script:    string;
    outputMp3: string;
    voice?:    string; // default: id-ID-ArdiNeural (Bahasa Indonesia pria)
}): Promise<string> {
    const { execSync } = await import('child_process');
    const voice = params.voice ?? 'id-ID-ArdiNeural';

    try {
        execSync(
            `edge-tts --voice "${voice}" --text "${params.script.replace(/"/g, "'")}" --write-media "${params.outputMp3}"`,
            { stdio: 'pipe', timeout: 30000 }
        );
        return params.outputMp3;
    } catch {
        // Fallback ke Coqui TTS kalau Edge-TTS gagal
        execSync(
            `tts --text "${params.script.replace(/"/g, "'")}" --out_path "${params.outputMp3}"`,
            { stdio: 'pipe', timeout: 60000 }
        );
        return params.outputMp3;
    }
}

// ── 3. Submit ke Mia untuk QA setelah aset dibuat ────────────────────────────
export async function submitForMiaQa(params: {
    contentId:    string;
    title:        string;
    outputPath:   string;
    platformVariants: PlatformVariant[];
}): Promise<void> {
    await pool.query(
        `UPDATE content_calendar SET status='qa_review', draft_url=$1, agent_updated='deril' WHERE id=$2`,
        [params.outputPath, params.contentId]
    );

    await logDecision({
        agent:      'deril',
        action:     'noted',
        entityType: 'content',
        entityId:   params.contentId,
        summary:    `Aset selesai, submit QA ke Mia: "${params.title}" → ${params.platformVariants.map(p => p.platform).join(', ')}`,
        priority:   'routine',
    });
}

// ── 4. Submit ke approval Owner setelah lolos QA ─────────────────────────────
export async function submitForOwnerApproval(params: {
    contentId:    string;
    title:        string;
    platforms:    string[];
    previewUrl?:  string;
}): Promise<string> {
    const approvalId = await submitApproval({
        agent:           'deril',
        title:           `Upload Konten: ${params.title}`,
        description:     `Platform: ${params.platforms.join(', ')}\nPreview: ${params.previewUrl ?? '-'}`,
        actionRequested: 'Approve upload ke semua platform terkait',
        priority:        'routine',
        entityType:      'content',
        entityId:        params.contentId,
        attachmentUrls:  params.previewUrl ? [params.previewUrl] : [],
    });

    await pool.query(
        `UPDATE content_calendar SET status='awaiting_approval', agent_updated='deril' WHERE id=$1`,
        [params.contentId]
    );

    return approvalId;
}

// ── 5. Upload ke semua platform setelah Owner approve ────────────────────────
export async function uploadAfterApproval(params: {
    contentId:        string;
    variants:         PlatformVariant[];
    mediaType:        'image' | 'video' | 'carousel' | 'reel' | 'shorts';
}): Promise<PostResult[]> {
    const results: PostResult[] = [];

    for (const variant of params.variants) {
        const content: PostContent = {
            caption:   variant.caption,
            hashtags:  variant.hashtags,
            mediaUrl:  variant.filePath,
            mediaType: params.mediaType,
        };
        const res = await postToAll(content, [variant.platform]);
        results.push(...res);
    }

    // Update content_calendar dengan post IDs
    const postIds = Object.fromEntries(
        results.filter(r => r.success && r.postId).map(r => [r.platform, r.postId])
    );

    await pool.query(
        `UPDATE content_calendar
         SET status='published', published_at=NOW(), post_ids=$1, agent_updated='deril'
         WHERE id=$2`,
        [JSON.stringify(postIds), params.contentId]
    );

    await logDecision({
        agent:      'deril',
        action:     'approved',
        entityType: 'content',
        entityId:   params.contentId,
        summary:    `Upload selesai: ${results.filter(r => r.success).length}/${results.length} platform berhasil`,
        reason:     results.map(r => `${r.platform}:${r.success ? 'OK' : r.error}`).join(' | '),
        priority:   'routine',
    });

    return results;
}

// ── 6. API platform error → BUTUH DARI OWNER ─────────────────────────────────
export async function escalatePlatformAccess(platform: string, errorDetail: string): Promise<string> {
    return submitApproval({
        agent:           'deril',
        title:           `BUTUH DARI OWNER: akses API ${platform}`,
        description:     `Error: ${errorDetail}`,
        actionRequested: `Provide credentials/token untuk ${platform} API`,
        priority:        'routine',
    });
}
