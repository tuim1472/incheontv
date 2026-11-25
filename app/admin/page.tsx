import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import type { ArticleStatus } from '@/lib/types';
import { ArticleTable, ROW_COLS } from './ArticleTable';

export default async function Dashboard() {
  const { supabase, profile } = await requireMember();
  const desk = profile.role === 'desk';

  const { data: mineAll } = await supabase.from('articles').select('status').eq('author_id', profile.id);
  const count = (s: ArticleStatus) => (mineAll ?? []).filter((r) => r.status === s).length;

  const [{ data: recent }, pendingRes] = await Promise.all([
    supabase.from('articles').select(ROW_COLS).eq('author_id', profile.id).order('updated_at', { ascending: false }).limit(5),
    desk
      ? supabase.from('articles').select(ROW_COLS).eq('status', 'pending').order('updated_at', { ascending: true }).limit(8)
      : Promise.resolve({ data: null }),
  ]);

  const rejected = count('rejected');

  return (
    <>
      <div className="adm-title">
        <h1>{profile.name ? `${profile.name}님, 안녕하세요` : '안녕하세요'}</h1>
        <Link className="btn primary" href="/admin/articles/new">
          + 기사 쓰기
        </Link>
      </div>

      {rejected > 0 && (
        <p className="alert error">
          <b>반려된 기사가 {rejected}건 있습니다.</b>
          사유를 확인하고 고쳐서 다시 승인요청을 해 주세요. <Link href="/admin/articles?status=rejected&scope=mine">반려 기사 보기 ›</Link>
        </p>
      )}

      <div className="stats">
        {(
          [
            ['draft', '작성중'],
            ['pending', '승인대기'],
            ['rejected', '반려'],
            ['published', '게재'],
          ] as const
        ).map(([s, label]) => (
          <Link key={s} className="stat" href={`/admin/articles?status=${s}&scope=mine`}>
            <span className="k">내 기사 · {label}</span>
            <span className="v">{count(s)}</span>
          </Link>
        ))}
      </div>

      {desk && (
        <section className="panel">
          <div className="panel-head">
            <h2>승인을 기다리는 기사</h2>
            <Link href="/admin/review">전체 보기 ›</Link>
          </div>
          <ArticleTable rows={pendingRes.data ?? []} showAuthor empty="승인을 기다리는 기사가 없습니다." />
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>최근에 작업한 내 기사</h2>
          <Link href="/admin/articles?scope=mine">내 기사 전체 ›</Link>
        </div>
        <ArticleTable rows={recent ?? []} showAuthor={false} empty="아직 쓴 기사가 없습니다. 오른쪽 위 ‘기사 쓰기’로 시작하세요." />
      </section>
    </>
  );
}
