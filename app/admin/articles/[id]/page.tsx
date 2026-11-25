import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireMember } from '@/lib/auth';
import { HISTORY_LABEL, STATUS_LABEL, formatDateTime } from '@/lib/format';
import type { Article } from '@/lib/types';
import { ArticleEditor } from '../ArticleEditor';
import { ReviewPanel } from '../ReviewPanel';
import { StatusChip } from '../../ArticleTable';

export const metadata: Metadata = { title: '기사 편집' };

const DONE: Record<string, string> = {
  draft: '임시저장했습니다.',
  save: '저장했습니다.',
  submit: '승인요청을 보냈습니다. 데스크가 확인하면 게재됩니다.',
  publish: '게재했습니다. 사이트에 바로 반영됩니다.',
  reject: '반려했습니다. 기자에게 사유가 보입니다.',
  unpublish: '게재를 내렸습니다.',
  withdraw: '승인요청을 취소했습니다.',
  headline_on: '첫 화면 헤드라인에 걸었습니다.',
  headline_off: '헤드라인에서 뺐습니다.',
};

type HistoryRow = { id: number; action: string; note: string | null; created_at: string; actor: { name: string; email: string } | null };

export default async function EditArticlePage({ params, searchParams }: { params: { id: string }; searchParams: { done?: string } }) {
  const { supabase, profile } = await requireMember();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const { data: article } = await supabase.from('articles').select('*').eq('id', id).maybeSingle<Article>();
  if (!article) notFound();

  const { data: history } = await supabase
    .from('article_history')
    .select('id, action, note, created_at, actor:profiles(name, email)')
    .eq('article_id', id)
    .order('created_at', { ascending: false })
    .limit(30)
    .returns<HistoryRow[]>();

  const desk = profile.role === 'desk';
  const own = article.author_id === profile.id;
  const canEdit = desk || (own && ['draft', 'pending', 'rejected'].includes(article.status));
  const scheduled = article.status === 'published' && article.published_at && new Date(article.published_at) > new Date();
  const done = searchParams.done ? DONE[searchParams.done] : null;

  return (
    <>
      <div className="adm-title">
        <h1 style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          기사 #{article.id} <StatusChip status={article.status} />
          {scheduled && <span className="chip pending">예약 {formatDateTime(article.published_at)}</span>}
        </h1>
        <div className="actions">
          <Link className="btn small" href={`/admin/articles/${article.id}/preview`} target="_blank">
            미리보기 ↗
          </Link>
          {article.status === 'published' && !scheduled && (
            <Link className="btn small" href={`/news/${article.id}`} target="_blank">
              사이트에서 보기 ↗
            </Link>
          )}
        </div>
      </div>

      {done && <p className="alert ok">{done}</p>}
      {article.status === 'rejected' && article.reject_reason && (
        <p className="alert error">
          <b>데스크 반려 사유</b>
          {article.reject_reason}
        </p>
      )}
      {article.status === 'pending' && !desk && <p className="alert warn">데스크가 검토 중입니다. 고칠 내용이 있으면 수정해서 저장해도 됩니다.</p>}
      {!canEdit && (
        <p className="alert info">
          {STATUS_LABEL[article.status]} 상태인 기사는 데스크만 고칠 수 있습니다. 고칠 내용이 있으면 데스크에게 요청하세요.
        </p>
      )}

      {(desk || own) && <ReviewPanel article={article} desk={desk} own={own} />}

      {canEdit && <ArticleEditor key={article.updated_at} article={article} desk={desk} userId={profile.id} />}

      <section className="panel">
        <h2>처리 기록</h2>
        <p className="muted" style={{ margin: '-6px 0 10px' }}>
          작성자 {article.author_name || '—'} · 처음 작성 {formatDateTime(article.created_at)}
        </p>
        <ol className="timeline">
          {(history ?? []).map((h) => (
            <li key={h.id}>
              <span className="when">{formatDateTime(h.created_at)}</span>
              <span>
                <b>{h.actor?.name || h.actor?.email || '시스템'}</b> · {HISTORY_LABEL[h.action] ?? h.action}
                {h.note && <span className="note">사유: {h.note}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
