import type { Metadata } from 'next';
import { ArticleList, Pager } from '@/components/ArticleList';
import { searchArticles } from '@/lib/queries';

export const metadata: Metadata = { title: '기사검색', robots: { index: false } };
export const dynamic = 'force-dynamic';

const PER = 20;

export default async function SearchPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const q = (searchParams.q ?? '').trim();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const result = q ? await searchArticles(q, page, PER) : { items: [], count: 0 };
  return (
    <div className="wrap">
      <div className="sec-head">
        <h1>{q ? `‘${q}’ 검색 결과` : '기사검색'}</h1>
        {q && <span className="date num">총 {result.count}건</span>}
      </div>
      <form action="/search" className="search" role="search" style={{ maxWidth: 520, marginBottom: 24 }}>
        <label htmlFor="page-q" className="sr-only">
          검색어
        </label>
        <input id="page-q" name="q" type="search" defaultValue={q} placeholder="검색어를 입력하세요" />
        <button type="submit">검색</button>
      </form>
      {q && (
        <>
          <ArticleList items={result.items} empty="검색 결과가 없습니다. 다른 낱말로 찾아보세요." />
          <Pager page={page} total={result.count} perPage={PER} base={`/search?q=${encodeURIComponent(q)}`} />
        </>
      )}
    </div>
  );
}
