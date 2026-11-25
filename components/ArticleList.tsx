import Link from 'next/link';
import type { ArticleSummary } from '@/lib/types';
import { categoryName } from '@/lib/site';
import { formatDate } from '@/lib/format';
import { Thumb } from './Thumb';

export function ArticleList({ items, empty = '아직 게재된 기사가 없습니다.' }: { items: ArticleSummary[]; empty?: string }) {
  if (items.length === 0) return <p className="empty">{empty}</p>;
  return (
    <ul className="list">
      {items.map((a) => (
        <li key={a.id}>
          <Link href={`/news/${a.id}`}>
            <Thumb src={a.cover_url} id={a.id} />
            <div className="body">
              <span className="cat">{categoryName(a.category)}</span>
              <h3 className="t">{a.title}</h3>
              {a.subtitle && <p className="clamp2">{a.subtitle}</p>}
              <span className="date num">
                {a.author_name && `${a.author_name} 기자 · `}
                {formatDate(a.published_at)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function RankList({ items }: { items: ArticleSummary[] }) {
  if (items.length === 0) return <p className="empty">아직 집계된 기사가 없습니다.</p>;
  return (
    <ol>
      {items.map((a, i) => (
        <li key={a.id}>
          <Link href={`/news/${a.id}`}>
            <span className="n">{i + 1}</span>
            <span className="t clamp2">{a.title}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function Pager({ page, total, perPage, base }: { page: number; total: number; perPage: number; base: string }) {
  const last = Math.max(1, Math.ceil(total / perPage));
  if (last <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, last - 4));
  const pages = Array.from({ length: Math.min(5, last) }, (_, i) => start + i);
  const href = (p: number) => `${base}${base.includes('?') ? '&' : '?'}page=${p}`;
  return (
    <nav className="pager num" aria-label="페이지">
      {page > 1 && <Link href={href(page - 1)}>‹</Link>}
      {pages.map((p) =>
        p === page ? (
          <span key={p} aria-current="page">
            {p}
          </span>
        ) : (
          <Link key={p} href={href(p)}>
            {p}
          </Link>
        ),
      )}
      {page < last && <Link href={href(page + 1)}>›</Link>}
    </nav>
  );
}

export function TipBox() {
  return (
    <div className="box">
      <h2>기사제보</h2>
      <p>동네 소식, 불편 사항, 미담을 알려주세요. 기자가 확인 후 연락드립니다.</p>
      <Link className="btn-primary" href="/about#tip">
        제보하기
      </Link>
    </div>
  );
}
