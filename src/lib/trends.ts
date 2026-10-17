// Google Trends + Keyword Planner wrapper untuk Mia & Gagah
// Semua tools gratis / open-source sesuai handbook
// Catatan: Google Trends API tidak resmi; pakai pytrends-style HTTP scraping

export interface TrendResult {
    keyword:     string;
    interest:    number;   // 0–100
    rising:      boolean;
    relatedQueries?: string[];
}

export interface KeywordIdea {
    keyword:      string;
    avgMonthlySearches?: number;
    competition:  'low' | 'medium' | 'high' | 'unknown';
    relevance:    number; // 0–1
}

// ─── Google Trends (scraping publik, read-only) ───────────────────────────────
// Endpoint: trends.google.com/trends/api/dailytrends
export async function getDailyTrends(geo = 'ID'): Promise<TrendResult[]> {
    const url = `https://trends.google.com/trends/api/dailytrends?hl=id&tz=-420&geo=${geo}&ns=15`;
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ExiomBot/1.0)' },
        });
        const text = await res.text();
        // Response diawali ")]}'\n" — strip itu
        const json = JSON.parse(text.replace(/^\)\]\}'\n/, ''));
        const items = json?.default?.trendingSearchesDays?.[0]?.trendingSearches ?? [];

        return items.slice(0, 20).map((item: Record<string, unknown>) => ({
            keyword: (item.title as Record<string, string>)?.query ?? '',
            interest: parseInt(String((item.formattedTraffic as string) ?? '0').replace(/[^0-9]/g, '')) || 50,
            rising: true,
            relatedQueries: ((item.relatedQueries as Array<Record<string, string>>) ?? [])
                .map((q) => q.query).slice(0, 5),
        }));
    } catch {
        return [];
    }
}

// ─── Google Trends Interest Over Time ────────────────────────────────────────
export async function getInterestOverTime(keywords: string[], geo = 'ID'): Promise<Record<string, number>> {
    const kw = keywords.slice(0, 5).join(',');
    const url = `https://trends.google.com/trends/api/explore?hl=id&tz=-420&req=${encodeURIComponent(JSON.stringify({
        comparisonItem: keywords.slice(0,5).map(k => ({ keyword: k, geo, time: 'today 3-m' })),
        category: 0,
        property: '',
    }))}`;

    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ExiomBot/1.0)' },
        });
        const text = await res.text();
        const json = JSON.parse(text.replace(/^\)\]\}'\n/, ''));
        const widgets = json?.widgets ?? [];
        const timelineWidget = widgets.find((w: Record<string, string>) => w.id === 'TIMESERIES');
        if (!timelineWidget) return {};

        // Ambil nilai terakhir per keyword
        const result: Record<string, number> = {};
        keywords.forEach((k, i) => {
            result[k] = timelineWidget?.request?.restriction?.complexKeywordsRestriction?.keyword?.[i]?.value ?? 50;
        });
        return result;
    } catch {
        return Object.fromEntries(keywords.map(k => [k, 50]));
    }
}

// ─── Keyword Planner stub (butuh Google Ads API key) ─────────────────────────
// Tanpa key, pakai estimasi dari Trends data
export async function getKeywordIdeas(seedKeywords: string[]): Promise<KeywordIdea[]> {
    // Tanpa Google Ads API key: return seed keywords dengan estimasi dari Trends
    // Sesudah Owner setup Google Ads account, ini akan dihubungkan ke Keyword Planner API
    return seedKeywords.map(kw => ({
        keyword:     kw,
        competition: 'unknown' as const,
        relevance:   0.7,
    }));
}

// ─── Competitor scraping (Agent Reach / read-only) ───────────────────────────
// Dipakai Gagah untuk riset kompetitor di YouTube (API resmi), social lain via Agent Reach
export async function searchYouTubePublic(query: string, maxResults = 10): Promise<Array<{ title: string; url: string; views?: string }>> {
    // YouTube Data API v3 — butuh API key dari Owner
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        console.warn('[trends] YOUTUBE_API_KEY belum diset — skip YouTube search');
        return [];
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${apiKey}`;
    try {
        const res = await fetch(url);
        const json = await res.json() as { items?: Array<{ snippet: { title: string }; id: { videoId: string } }> };
        return (json.items ?? []).map(item => ({
            title: item.snippet.title,
            url:   `https://youtube.com/watch?v=${item.id.videoId}`,
        }));
    } catch {
        return [];
    }
}
