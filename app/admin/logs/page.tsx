import type { Metadata } from 'next';
import Link from 'next/link';
import { requireDesk } from '@/lib/auth';
import { HISTORY_LABEL, MEMBER_LOG_LABEL, formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: '처리 기록' };

type MemberLog = { id: number; action: string; target_email: string; detail: string; created_at: string; actor: { name: string; email: string } | null };
type ArticleLog = {
  id: number;
  action: string;
  note: string | null;
  created_at: string;
  article_id: number;
  actor: { name: string; email: string } | null;
  article: { title: string } | null;
};

export default async function LogsPage() {
  const { supabase } = await requireDesk();
  const [{ data: memberLogs }, { data: articleLogs }] = await Promise.all([
    supabase.from('member_log').select('id, action, target_email, detail, created_at, actor:profiles(name, email)').order('created_at', { ascending: false }).limit(100).returns<MemberLog[]>(),
    supabase
      .from('article_history')
      .select('id, action, note, created_at, article_id, actor:profiles(name, email), article:articles(title)')
      .order('created_at', { ascending: false })
      .limit(100)
      .returns<ArticleLog[]>(),
  ]);

  return (
    <>
      <div className="adm-title">
        <h1>처리 기록</h1>
        <span className="muted">최근 100건씩</span>
      </div>
      <section className="panel">
        <h2>기사 처리</h2>
        <ol className="timeline">
          {(articleLogs ?? []).map((h) => (
            <li key={h.id}>
              <span className="when">{formatDateTime(h.created_at)}</span>
              <span>
                <b>{h.actor?.name || h.actor?.email || '시스템'}</b> · {HISTORY_LABEL[h.action] ?? h.action} ·{' '}
                <Link href={`/admin/articles/${h.article_id}`} style={{ textDecoration: 'underline' }}>
                  {h.article?.title ?? `기사 #${h.article_id}`}
                </Link>
                {h.note && <span className="note">사유: {h.note}</span>}
              </span>
            </li>
          ))}
        </ol>
        {!articleLogs?.length && <p className="muted">기록이 없습니다.</p>}
      </section>
      <section className="panel">
        <h2>구성원 관리</h2>
        <ol className="timeline">
          {(memberLogs ?? []).map((l) => (
            <li key={l.id}>
              <span className="when">{formatDateTime(l.created_at)}</span>
              <span>
                <b>{l.actor?.name || l.actor?.email || '시스템'}</b> · {MEMBER_LOG_LABEL[l.action] ?? l.action} · {l.target_email}
                {l.detail && <span className="muted"> ({l.detail})</span>}
              </span>
            </li>
          ))}
        </ol>
        {!memberLogs?.length && <p className="muted">기록이 없습니다.</p>}
      </section>
    </>
  );
}
