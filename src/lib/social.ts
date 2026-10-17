// Social media posting API stubs untuk Deril
// Semua via API resmi, tidak ada scheduler pihak ketiga berbayar
// Status: STUB — aktifkan satu per satu setelah Owner provide credentials

export interface PostContent {
    caption:   string;
    hashtags?: string[];
    mediaUrl?: string;    // local file path atau URL
    mediaType: 'image' | 'video' | 'carousel' | 'reel' | 'shorts';
}

export interface PostResult {
    platform:  string;
    postId?:   string;
    url?:      string;
    success:   boolean;
    error?:    string;
}

// ─── Instagram / Facebook (Meta Graph API) ───────────────────────────────────
export async function postToInstagram(content: PostContent): Promise<PostResult> {
    const token   = process.env.META_ACCESS_TOKEN;
    const pageId  = process.env.META_PAGE_ID;
    if (!token || !pageId) {
        return { platform: 'instagram', success: false, error: 'META_ACCESS_TOKEN / META_PAGE_ID belum diset' };
    }
    // Step 1: upload media → Step 2: publish
    // Implementasi penuh sesudah Owner setup Meta Business Suite
    return { platform: 'instagram', success: false, error: 'NOT_IMPLEMENTED — tunggu META credentials dari Owner' };
}

export async function postToFacebook(content: PostContent): Promise<PostResult> {
    const token  = process.env.META_ACCESS_TOKEN;
    const pageId = process.env.META_PAGE_ID;
    if (!token || !pageId) {
        return { platform: 'facebook', success: false, error: 'META_ACCESS_TOKEN belum diset' };
    }
    return { platform: 'facebook', success: false, error: 'NOT_IMPLEMENTED — tunggu META credentials dari Owner' };
}

// ─── TikTok (Content Posting API) ────────────────────────────────────────────
export async function postToTikTok(content: PostContent): Promise<PostResult> {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    if (!clientKey) {
        return { platform: 'tiktok', success: false, error: 'TIKTOK_CLIENT_KEY belum diset' };
    }
    return { platform: 'tiktok', success: false, error: 'NOT_IMPLEMENTED — tunggu TikTok Developer credentials dari Owner' };
}

// ─── YouTube (Data API v3) ────────────────────────────────────────────────────
export async function uploadYouTubeShorts(content: PostContent, title: string, description: string): Promise<PostResult> {
    const apiKey = process.env.YOUTUBE_CLIENT_ID;
    if (!apiKey) {
        return { platform: 'youtube', success: false, error: 'YOUTUBE_CLIENT_ID belum diset' };
    }
    return { platform: 'youtube', success: false, error: 'NOT_IMPLEMENTED — tunggu Google Cloud Console credentials dari Owner' };
}

// ─── X (Twitter) — free write-only tier ──────────────────────────────────────
export async function postToX(text: string): Promise<PostResult> {
    const bearerToken = process.env.X_BEARER_TOKEN;
    const clientId    = process.env.X_CLIENT_ID;
    if (!bearerToken || !clientId) {
        return { platform: 'x', success: false, error: 'X_BEARER_TOKEN / X_CLIENT_ID belum diset' };
    }

    try {
        const res = await fetch('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type':  'application/json',
            },
            body: JSON.stringify({ text }),
        });
        if (!res.ok) {
            const err = await res.text();
            return { platform: 'x', success: false, error: err };
        }
        const json = await res.json() as { data?: { id: string } };
        return {
            platform: 'x',
            success:  true,
            postId:   json.data?.id,
            url:      json.data?.id ? `https://x.com/i/web/status/${json.data.id}` : undefined,
        };
    } catch (e) {
        return { platform: 'x', success: false, error: String(e) };
    }
}

// ─── Threads (Meta Graph API, sama verifikasi bisnis dengan IG) ───────────────
export async function postToThreads(content: PostContent): Promise<PostResult> {
    const token = process.env.THREADS_ACCESS_TOKEN;
    if (!token) {
        return { platform: 'threads', success: false, error: 'THREADS_ACCESS_TOKEN belum diset' };
    }
    return { platform: 'threads', success: false, error: 'NOT_IMPLEMENTED — tunggu Threads credentials dari Owner' };
}

// ─── Post ke semua platform sekaligus ────────────────────────────────────────
export async function postToAll(content: PostContent, platforms: string[]): Promise<PostResult[]> {
    const tasks: Promise<PostResult>[] = [];

    if (platforms.includes('instagram'))  tasks.push(postToInstagram(content));
    if (platforms.includes('facebook'))   tasks.push(postToFacebook(content));
    if (platforms.includes('tiktok'))     tasks.push(postToTikTok(content));
    if (platforms.includes('x'))          tasks.push(postToX([content.caption, ...(content.hashtags ?? [])].join(' ')));
    if (platforms.includes('threads'))    tasks.push(postToThreads(content));
    if (platforms.includes('youtube') && content.mediaType === 'shorts') {
        tasks.push(uploadYouTubeShorts(content, content.caption.slice(0, 100), content.caption));
    }

    return Promise.all(tasks);
}
