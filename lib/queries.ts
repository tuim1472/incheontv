import 'server-only';
import { createPublicClient, hasSupabase } from './supabase/public';
import type { Article, ArticleSummary } from './types';

// 공개 페이지에서 쓰는 조회 함수. 실패하면 빈 결과를 돌려주고 페이지는 계속 보여줍니다.
const LIST = 'id,title,subtitle,category,cover_url,author_name,published_at,video_url';

async function safe<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
  if (!hasSupabase()) return fallback;
  try {
    return await fn();
  } catch (e) {
    console.error('[queries]', e);
    return fallback;
  }
}

function published() {
  return createPublicClient()
    .from('articles')
    .select(LIST, { count: 'exact' })
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString());
}

export function latestArticles({ limit = 10, page = 1, category }: { limit?: number; page?: number; category?: string } = {}) {
  return safe({ items: [] as ArticleSummary[], count: 0 }, async () => {
    let q = published();
    if (category) q = q.eq('category', category);
    const from = (page - 1) * limit;
    const { data, count, error } = await q.order('published_at', { ascending: false }).range(from, from + limit - 1);
    if (error) throw error;
    return { items: (data ?? []) as ArticleSummary[], count: count ?? 0 };
  });
}

export function headlineArticles(limit = 5) {
  return safe([] as ArticleSummary[], async () => {
    const { data, error } = await published().eq('is_headline', true).order('published_at', { ascending: false }).limit(limit);
    if (error) throw error;
    const items = (data ?? []) as ArticleSummary[];
    if (items.length > 0) return items;
    // 헤드라인으로 지정한 기사가 없으면 최신 기사로 채웁니다.
    const fallback = await latestArticles({ limit });
    return fallback.items;
  });
}

export function popularArticles(limit = 7) {
  return safe([] as ArticleSummary[], async () => {
    const { data, error } = await createPublicClient().rpc('popular_articles', { lim: limit, days: 30 });
    if (error) throw error;
    return (data ?? []) as ArticleSummary[];
  });
}

export function getPublishedArticle(id: number) {
  return safe(null as Article | null, async () => {
    const { data, error } = await createPublicClient()
      .from('articles')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .maybeSingle<Article>();
    if (error) throw error;
    return data;
  });
}

export function searchArticles(q: string, page = 1, limit = 20) {
  return safe({ items: [] as ArticleSummary[], count: 0 }, async () => {
    // 검색 필터 문법에 쓰이는 문자는 지웁니다.
    const term = q.replace(/[,()*%\\]/g, ' ').trim().slice(0, 50);
    if (!term) return { items: [], count: 0 };
    const from = (page - 1) * limit;
    const { data, count, error } = await published()
      .or(`title.ilike.*${term}*,subtitle.ilike.*${term}*,body.ilike.*${term}*`)
      .order('published_at', { ascending: false })
      .range(from, from + limit - 1);
    if (error) throw error;
    return { items: (data ?? []) as ArticleSummary[], count: count ?? 0 };
  });
}
