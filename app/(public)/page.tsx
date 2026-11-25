import Link from 'next/link';
import { HeadlineSlider } from '@/components/HeadlineSlider';
import { ArticleList, RankList, TipBox } from '@/components/ArticleList';
import { Thumb } from '@/components/Thumb';
import { headlineArticles, latestArticles, popularArticles } from '@/lib/queries';
import { CATEGORIES } from '@/lib/site';
import { formatDate } from '@/lib/format';

// 1분마다 새로 만듭니다. 기사를 게재하면 그 즉시 갱신됩니다.
export const revalidate = 60;

const COLUMN_CATEGORIES = CATEGORIES.slice(0, 4);

export default async function HomePage() {
  const [headlines, popular, all, shorts, ...columns] = await Promise.all([
    headlineArticles(5),
    popularArticles(7),
    latestArticles({ limit: 10 }),
    latestArticles({ limit: 5, category: 'shorts' }),
    ...COLUMN_CATEGORIES.map((c) => latestArticles({ limit: 4, category: c.slug })),
  ]);

  if (all.count === 0) {
    return (
      <div className="wrap">
        <p className="empty">
          아직 게재된 기사가 없습니다. <Link href="/admin">관리자 화면</Link>에서 첫 기사를 써 보세요.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="wrap full-m">
        <div className="top">
          <HeadlineSlider items={headlines} />
          <section className="rank" aria-labelledby="rank-h">
            <div className="sec-head">
              <h2 id="rank-h">인기 콘텐츠</h2>
            </div>
            <RankList items={popular.length > 0 ? popular : all.items.slice(0, 7)} />
          </section>
        </div>
      </div>

      <section className="wrap" aria-labelledby="latest-h">
        <div className="sec-head">
          <h2 id="latest-h">최신뉴스</h2>
          <Link href="/news">더보기 ›</Link>
        </div>
        <div className="latest">
          {COLUMN_CATEGORIES.map((c, ci) => {
            const [lead, ...rest] = columns[ci].items;
            return (
              <div className="col" key={c.slug}>
                {lead ? (
                  <Link className="lead" href={`/news/${lead.id}`}>
                    <Thumb src={lead.cover_url} id={lead.id} />
                    <span className="cat">{c.name}</span>
                    <h3 className="t">{lead.title}</h3>
                  </Link>
                ) : (
                  <p className="none">
                    <span className="cat">{c.name}</span>
                    <br />
                    아직 기사가 없습니다.
                  </p>
                )}
                {rest.map((a) => (
                  <Link className="item" href={`/news/${a.id}`} key={a.id}>
                    <span className="t clamp2">{a.title}</span>
                    <span className="date num">{formatDate(a.published_at)}</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      {shorts.items.length > 0 && (
        <section className="wrap" aria-labelledby="shorts-h">
          <div className="sec-head">
            <h2 id="shorts-h">쇼츠</h2>
            <Link href="/section/shorts">더보기 ›</Link>
          </div>
          <div className="shorts">
            {shorts.items.map((s) => (
              <Link className="short" href={`/news/${s.id}`} key={s.id}>
                <Thumb src={s.cover_url} id={s.id} />
                <span className="t clamp2">{s.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="wrap">
        <div className="with-side">
          <section aria-labelledby="all-h">
            <div className="sec-head">
              <h2 id="all-h">전체기사</h2>
              <Link href="/news">더보기 ›</Link>
            </div>
            <ArticleList items={all.items} />
            {all.count > all.items.length && (
              <Link className="more" href="/news?page=2">
                기사 더보기
              </Link>
            )}
          </section>
          <aside className="side">
            <TipBox />
            <div className="box">
              <h2>분야별 보기</h2>
              <div className="links">
                {CATEGORIES.map((c) => (
                  <Link key={c.slug} href={`/section/${c.slug}`}>
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
