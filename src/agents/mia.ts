// Mia — Marketing Manager agent actions
import { agentInsert, logDecision } from '../lib/db.js';
import { submitApproval } from '../lib/approval.js';
import { getDailyTrends, TrendResult } from '../lib/trends.js';

export interface ContentBrief {
    title:       string;
    contentType: 'video' | 'graphic' | 'carousel' | 'article' | 'caption' | 'shorts';
    targetPlatforms: string[];
    trendReason: string;       // kenapa topik ini dipilih
    keyword?:    string;
    campaign?:   string;
    notes?:      string;
}

// ── 1. Riset trend harian (jadwal: setiap pagi 06:00 WIB) ────────────────────
export async function doMorningTrendResearch(): Promise<TrendResult[]> {
    const trends = await getDailyTrends('ID');

    await logDecision({
        agent:      'mia',
        action:     'noted',
        entityType: 'other',
        summary:    `Riset trend harian: ${trends.length} trending topics di Indonesia`,
        reason:     trends.slice(0, 5).map(t => t.keyword).join(', '),
        priority:   'routine',
    });

    return trends;
}

// ── 2. Brief ke Deril (produksi) ─────────────────────────────────────────────
export async function briefDeril(brief: ContentBrief): Promise<string> {
    const row = await agentInsert('mia', 'content_calendar', {
        title:            brief.title,
        content_type:     brief.contentType,
        status:           'brief_sent',
        brief:            brief.notes ?? brief.trendReason,
        topic:            brief.title,
        keyword:          brief.keyword ?? null,
        target_platforms: brief.targetPlatforms,
        campaign_name:    brief.campaign ?? null,
        agent_owner:      'mia',
        agent_creator:    'deril',
        agent_created:    'mia',
    }) as { id: string };

    await logDecision({
        agent:      'mia',
        action:     'noted',
        entityType: 'content',
        entityId:   row.id,
        summary:    `Brief ke Deril: ${brief.title} (${brief.contentType}) → ${brief.targetPlatforms.join(',')}`,
        priority:   'routine',
    });

    return row.id;
}

// ── 3. Brief ke Gagah (artikel/SEO) ──────────────────────────────────────────
export async function briefGagah(brief: ContentBrief): Promise<string> {
    const row = await agentInsert('mia', 'content_calendar', {
        title:            brief.title,
        content_type:     'article',
        status:           'brief_sent',
        brief:            brief.notes ?? brief.trendReason,
        topic:            brief.title,
        keyword:          brief.keyword ?? null,
        target_platforms: brief.targetPlatforms,
        campaign_name:    brief.campaign ?? null,
        agent_owner:      'mia',
        agent_creator:    'gagah',
        agent_created:    'mia',
    }) as { id: string };

    await logDecision({
        agent:      'mia',
        action:     'noted',
        entityType: 'content',
        entityId:   row.id,
        summary:    `Brief ke Gagah: artikel "${brief.title}" keyword:${brief.keyword ?? '-'}`,
        priority:   'routine',
    });

    return row.id;
}

// ── 4. QA struktural konten Deril/Gagah ──────────────────────────────────────
export async function qaContent(params: {
    contentId:     string;
    brandVoiceOk:  boolean;
    completenessOk: boolean;
    noSensitiveIssue: boolean;
    notes?:        string;
}): Promise<'pass' | 'revise'> {
    const passed = params.brandVoiceOk && params.completenessOk && params.noSensitiveIssue;

    await logDecision({
        agent:      'mia',
        action:     passed ? 'approved' : 'revised',
        entityType: 'content',
        entityId:   params.contentId,
        summary:    `QA konten ${passed ? 'PASS' : 'REVISI'}: brandVoice=${params.brandVoiceOk} kelengkapan=${params.completenessOk} noSensitif=${params.noSensitiveIssue}`,
        reason:     params.notes,
        priority:   'routine',
    });

    return passed ? 'pass' : 'revise';
}

// ── 5. Request budget ads (koordinasi Hugo dulu, lalu approval Owner) ─────────
export async function requestAdsBudget(params: {
    campaign:    string;
    platform:    string;
    amountIdr:   number;
    reason:      string;
}): Promise<string> {
    // Catat dulu ke decisions_log sebelum kirim ke Hugo
    await logDecision({
        agent:      'mia',
        action:     'escalated',
        entityType: 'other',
        summary:    `Request budget ads: ${params.campaign} di ${params.platform} → Rp ${params.amountIdr.toLocaleString('id-ID')}`,
        reason:     `${params.reason} — diserahkan ke Hugo untuk evaluasi terlebih dahulu`,
        priority:   'budget_change',
    });

    // Submit ke Hugo dulu (Hugo akan evaluasi, lalu teruskan ke Owner)
    // Di implementasi penuh: kirim pesan ke Hugo profile via Hermes A2A
    // Sementara: langsung ke approval queue dengan catatan Hugo harus evaluasi dulu
    const approvalId = await submitApproval({
        agent:           'mia',
        title:           `Budget Ads: ${params.campaign} — ${params.platform}`,
        description:     `Campaign: ${params.campaign}\nPlatform: ${params.platform}\nJumlah: Rp ${params.amountIdr.toLocaleString('id-ID')}\nAlasan: ${params.reason}\n\n⚠️ Perlu evaluasi Hugo sebelum approval Owner`,
        actionRequested: `Approve budget ads Rp ${params.amountIdr.toLocaleString('id-ID')} untuk ${params.campaign}`,
        priority:        'budget_change',
    });

    return approvalId;
}

// ── 6. Laporan trend urgent ke Owner ─────────────────────────────────────────
export async function reportUrgentTrend(params: {
    trend:        string;
    why:          string;
    recommendation: string;
}): Promise<string> {
    return submitApproval({
        agent:           'mia',
        title:           `Trend Urgent: ${params.trend}`,
        description:     `Kenapa urgent: ${params.why}\n\nRekomendasi: ${params.recommendation}`,
        actionRequested: 'Approve prioritas upload konten terkait trend ini',
        priority:        'routine',
    });
}
