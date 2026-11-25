import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleList, Pager, RankList, TipBox } from '@/components/ArticleList';
import { latestArticles, popularArticles } from '@/lib/queries';
import { CATEGORIES, categoryName, isCategory } from '@/lib/site';

export const revalidate = 60;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return { title: isCategory(params.slug) ? categoryName(params.slug) : '분야' };
}

const PER = 20;

export default async function SectionPage({ params, searchParams }: { params: { slug: string }; searchParams: { page?: string } }) {
  if (!isCategory(params.slug)) notFound();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [list, popular] = await Promise.all([latestArticles({ limit: PER, page, category: params.slug }), popularArticles(7)]);
  return (
    <div className="wrap">
      <div className="with-side">
        <section>
          <div className="sec-head">
            <h1>{categoryName(params.slug)}</h1>
            <span className="date num">총 {list.count}건</span>
          </div>
          <ArticleList items={list.items} empty="이 분야에는 아직 게재된 기사가 없습니다." />
          <Pager page={page} total={list.count} perPage={PER} base={`/section/${params.slug}`} />
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
