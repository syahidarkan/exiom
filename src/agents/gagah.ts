// Gagah — SEO Researcher agent actions
import { logDecision, pool } from '../lib/db.js';
import { submitApproval } from '../lib/approval.js';
import { getKeywordIdeas, searchYouTubePublic } from '../lib/trends.js';

export interface ArticleDraft {
    contentId:   string;
    title:       string;
    keyword:     string;
    wordCount:   number;
    bodyMd:      string;   // full article dalam Markdown
    metaDesc:    string;   // SEO meta description (max 160 chars)
    slug:        string;   // URL slug
}

export interface PlatformVariant {
    platform: string;
    body:     string;
    title?:   string;
    tags?:    string[];
}

// ── 1. Riset keyword (Google Keyword Planner — gratis via akun Ads Owner) ─────
export async function researchKeywords(seedTopics: string[]): Promise<Array<{ keyword: string; competition: string }>> {
    const ideas = await getKeywordIdeas(seedTopics);

    await logDecision({
        agent:      'gagah',
        action:     'noted',
        entityType: 'other',
        summary:    `Keyword research: ${ideas.length} keyword dari seed [${seedTopics.slice(0,3).join(', ')}]`,
        priority:   'routine',
    });

    return ideas;
}

// ── 2. Riset kompetitor YouTube (API publik) ──────────────────────────────────
export async function researchYouTubeCompetitor(query: string): Promise<Array<{ title: string; url: string }>> {
    const results = await searchYouTubePublic(query, 10);
    await logDecision({
        agent:      'gagah',
        action:     'noted',
        entityType: 'other',
        summary:    `YouTube competitor research: "${query}" → ${results.length} results`,
        priority:   'routine',
    });
    return results;
}

// ── 3. Submit draft artikel ke Mia untuk QA ──────────────────────────────────
export async function submitArticleForMiaQa(draft: ArticleDraft): Promise<void> {
    await pool.query(
        `UPDATE content_calendar
         SET status='qa_review', draft_url=$1, agent_updated='gagah'
         WHERE id=$2`,
        [`/articles/${draft.slug}.md`, draft.contentId]
    );

    await logDecision({
        agent:      'gagah',
        action:     'noted',
        entityType: 'content',
        entityId:   draft.contentId,
        summary:    `Draft artikel submit ke Mia QA: "${draft.title}" (${draft.wordCount} kata, keyword: ${draft.keyword})`,
        priority:   'routine',
    });
}

// ── 4. Sesuaikan format artikel per platform distribusi ──────────────────────
export function adaptArticleForPlatform(draft: ArticleDraft, platform: string): PlatformVariant {
    switch (platform) {
        case 'threads':
            // Threads: 500 chars max, pakai opening hook
            return {
                platform: 'threads',
                body:     draft.bodyMd.replace(/#+\s+/g, '').slice(0, 490) + '...',
                tags:     [draft.keyword.replace(/\s+/g, '')],
            };
        case 'x':
            // X: 280 chars, link ke artikel utama
            return {
                platform: 'x',
                body:     `${draft.title.slice(0, 200)}\n\n#${draft.keyword.replace(/\s+/g, '')}`,
            };
        case 'web_blog':
            // Full article untuk web/blog
            return {
                platform: 'web_blog',
                title:    draft.title,
                body:     draft.bodyMd,
                tags:     [draft.keyword],
            };
        default:
            return { platform, body: draft.bodyMd.slice(0, 500) };
    }
}

// ── 5. Submit artikel ke approval Owner setelah lolos QA ─────────────────────
export async function submitArticleForOwnerApproval(params: {
    contentId: string;
    title:     string;
    keyword:   string;
    platforms: string[];
}): Promise<string> {
    const approvalId = await submitApproval({
        agent:           'gagah',
        title:           `Publish Artikel: ${params.title}`,
        description:     `Keyword: ${params.keyword}\nPlatform distribusi: ${params.platforms.join(', ')}`,
        actionRequested: 'Approve publish artikel ke semua platform distribusi',
        priority:        'routine',
        entityType:      'content',
        entityId:        params.contentId,
    });

    await pool.query(
        `UPDATE content_calendar SET status='awaiting_approval', agent_updated='gagah' WHERE id=$1`,
        [params.contentId]
    );

    return approvalId;
}

// ── 6. Publish ke web/blog (Next.js + Supabase) ───────────────────────────────
// Koneksi ke Supabase untuk web/blog Exiom (terpisah dari agent DB)
export async function publishToWebBlog(draft: ArticleDraft): Promise<{ success: boolean; url?: string }> {
    const supabaseUrl = process.env.EXIOM_WEB_SUPABASE_URL;
    const supabaseKey = process.env.EXIOM_WEB_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return { success: false };
    }

    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/articles`, {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'apikey':        supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer':        'return=representation',
            },
            body: JSON.stringify({
                title:       draft.title,
                slug:        draft.slug,
                content:     draft.bodyMd,
                meta_desc:   draft.metaDesc,
                keyword:     draft.keyword,
                published_at: new Date().toISOString(),
                status:      'published',
            }),
        });

        if (!res.ok) return { success: false };
        const data = await res.json() as Array<{ id: string }>;
        return {
            success: true,
            url:     `https://exiom.id/blog/${draft.slug}`,
        };
    } catch {
        return { success: false };
    }
}
