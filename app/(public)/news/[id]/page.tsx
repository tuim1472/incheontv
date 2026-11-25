import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleBody } from '@/components/ArticleBody';
import { ArticleList, RankList, TipBox } from '@/components/ArticleList';
import { ViewCounter } from '@/components/ViewCounter';
import { getPublishedArticle, latestArticles, popularArticles } from '@/lib/queries';
import { excerpt } from '@/lib/format';
import { SITE, categoryName } from '@/lib/site';

export const revalidate = 60;

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const id = parseId(params.id);
  const a = id ? await getPublishedArticle(id) : null;
  if (!a) return { title: '기사를 찾을 수 없습니다' };
  const description = a.subtitle || excerpt(a.body, 140);
  return {
    title: a.title,
    description,
    alternates: { canonical: `/news/${a.id}` },
    openGraph: {
      type: 'article',
      title: a.title,
      description,
      url: `/news/${a.id}`,
      images: a.cover_url ? [a.cover_url] : undefined,
      publishedTime: a.published_at ?? undefined,
      modifiedTime: a.updated_at,
      authors: a.author_name ? [a.author_name] : undefined,
      section: categoryName(a.category),
    },
  };
}

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const id = parseId(params.id);
  const article = id ? await getPublishedArticle(id) : null;
  if (!article) notFound();

  const [related, popular] = await Promise.all([
    latestArticles({ limit: 5, category: article.category }),
    popularArticles(7),
  ]);

  return (
    <div className="wrap">
      <ViewCounter id={article.id} />
      <div className="with-side">
        <div style={{ minWidth: 0 }}>
          <ArticleBody article={article} url={`${SITE.url}/news/${article.id}`} />
          <section style={{ marginTop: 48 }}>
            <div className="sec-head">
              <h2>{categoryName(article.category)} 최신 기사</h2>
            </div>
            <ArticleList items={related.items.filter((a) => a.id !== article.id).slice(0, 4)} />
          </section>
        </div>
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
