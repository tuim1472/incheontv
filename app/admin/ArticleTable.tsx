import Link from 'next/link';
import type { Article } from '@/lib/types';
import { STATUS_LABEL, formatDateTime } from '@/lib/format';
import { categoryName } from '@/lib/site';

type Row = Pick<Article, 'id' | 'title' | 'category' | 'author_name' | 'status' | 'is_headline' | 'published_at' | 'updated_at'>;

export function StatusChip({ status }: { status: Article['status'] }) {
  return <span className={`chip ${status}`}>{STATUS_LABEL[status]}</span>;
}

export function ArticleTable({ rows, showAuthor, empty }: { rows: Row[]; showAuthor: boolean; empty: string }) {
  if (rows.length === 0) return <p className="muted">{empty}</p>;
  const now = Date.now();
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>상태</th>
            <th>제목</th>
            <th className="hide-s">분야</th>
            {showAuthor && <th className="hide-s">작성자</th>}
            <th className="hide-s">최근 변경</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const scheduled = r.status === 'published' && r.published_at && new Date(r.published_at).getTime() > now;
            return (
              <tr key={r.id}>
                <td className="nowrap">
                  {scheduled ? <span className="chip pending">예약</span> : <StatusChip status={r.status} />}
                  {r.is_headline && (
                    <>
                      {' '}
                      <span className="chip headline">헤드라인</span>
                    </>
                  )}
                </td>
                <td className="title-cell">
                  <Link href={`/admin/articles/${r.id}`}>{r.title}</Link>
                  {scheduled && <div className="muted num">{formatDateTime(r.published_at)} 게재 예정</div>}
                </td>
                <td className="hide-s nowrap">{categoryName(r.category)}</td>
                {showAuthor && <td className="hide-s nowrap">{r.author_name || '—'}</td>}
                <td className="hide-s nowrap num muted">{formatDateTime(r.updated_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const ROW_COLS = 'id,title,category,author_name,status,is_headline,published_at,updated_at';
