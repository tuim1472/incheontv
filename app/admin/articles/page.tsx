import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { STATUS_LABEL } from '@/lib/format';
import type { ArticleStatus } from '@/lib/types';
import { ArticleTable, ROW_COLS } from '../ArticleTable';

export const metadata: Metadata = { title: '기사 목록' };

const STATUSES = Object.keys(STATUS_LABEL) as ArticleStatus[];
const PER = 30;

export default async function ArticlesPage({ searchParams }: { searchParams: { status?: string; scope?: string; page?: string; q?: string; done?: string } }) {
  const { supabase, profile } = await requireMember();
  const desk = profile.role === 'desk';
  const scope = desk && searchParams.scope !== 'mine' ? 'all' : 'mine';
  const status = STATUSES.includes(searchParams.status as ArticleStatus) ? (searchParams.status as ArticleStatus) : null;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const q = (searchParams.q ?? '').replace(/[,()*%\\]/g, ' ').trim().slice(0, 50);

  let query = supabase.from('articles').select(ROW_COLS, { count: 'exact' });
  if (scope === 'mine') query = query.eq('author_id', profile.id);
  if (status) query = query.eq('status', status);
  if (q) query = query.ilike('title', `%${q}%`);
  const { data, count } = await query.order('updated_at', { ascending: false }).range((page - 1) * PER, page * PER - 1);

  const link = (p: Record<string, string | null>) => {
    const sp = new URLSearchParams();
    const merged = { scope, status, q: q || null, ...p };
    Object.entries(merged).forEach(([k, v]) => v && sp.set(k, v));
    return `/admin/articles?${sp.toString()}`;
  };
  const last = Math.max(1, Math.ceil((count ?? 0) / PER));

  return (
    <>
      <div className="adm-title">
        <h1>{scope === 'mine' ? '내 기사' : '전체 기사'}</h1>
        <Link className="btn primary" href="/admin/articles/new">
          + 기사 쓰기
        </Link>
      </div>
      {searchParams.done === 'deleted' && <p className="alert ok">기사를 삭제했습니다.</p>}

      <div className="panel" style={{ display: 'grid', gap: 14 }}>
        {desk && (
          <div className="tabs">
            <Link href={link({ scope: 'all' })} aria-current={scope === 'all' ? 'page' : undefined}>
              전체 기사
            </Link>
            <Link href={link({ scope: 'mine' })} aria-current={scope === 'mine' ? 'page' : undefined}>
              내 기사
            </Link>
          </div>
        )}
        <div className="tabs">
          <Link href={link({ status: null, page: null })} aria-current={!status ? 'page' : undefined}>
            모든 상태
          </Link>
          {STATUSES.map((s) => (
            <Link key={s} href={link({ status: s, page: null })} aria-current={status === s ? 'page' : undefined}>
              {STATUS_LABEL[s]}
            </Link>
          ))}
        </div>
        <form className="search" style={{ maxWidth: 420 }} action="/admin/articles">
          <input type="hidden" name="scope" value={scope} />
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="adm-q" className="sr-only">
            제목 검색
          </label>
          <input id="adm-q" name="q" defaultValue={q} placeholder="제목으로 찾기" />
          <button>찾기</button>
        </form>
        <ArticleTable rows={data ?? []} showAuthor={scope === 'all'} empty="조건에 맞는 기사가 없습니다." />
        {last > 1 && (
          <nav className="pager num" aria-label="페이지">
            {page > 1 && <Link href={link({ page: String(page - 1) })}>‹</Link>}
            <span aria-current="page">
              {page} / {last}
            </span>
            {page < last && <Link href={link({ page: String(page + 1) })}>›</Link>}
          </nav>
        )}
      </div>
    </>
  );
}
