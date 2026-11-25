import type { Metadata } from 'next';
import { ArticleList, Pager, RankList, TipBox } from '@/components/ArticleList';
import { latestArticles, popularArticles } from '@/lib/queries';

export const revalidate = 60;
export const metadata: Metadata = { title: '전체기사' };

const PER = 20;

export default async function AllNewsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [list, popular] = await Promise.all([latestArticles({ limit: PER, page }), popularArticles(7)]);
  return (
    <div className="wrap">
      <div className="with-side">
        <section>
          <div className="sec-head">
            <h1>전체기사</h1>
            <span className="date num">총 {list.count}건</span>
          </div>
          <ArticleList items={list.items} />
          <Pager page={page} total={list.count} perPage={PER} base="/news" />
        </section>
        <aside className="side">
          <section className="box rank">
            <h2>인기 콘텐츠</h2>
            <RankList items={popular} />
          </section>
          <TipBox />
        </aside>
      </div>
    </div>
  );
}
