import type { Metadata } from 'next';
import { requireDesk } from '@/lib/auth';
import { ArticleTable, ROW_COLS } from '../ArticleTable';

export const metadata: Metadata = { title: '승인대기' };

export default async function ReviewPage() {
  const { supabase } = await requireDesk();
  const { data } = await supabase.from('articles').select(ROW_COLS).eq('status', 'pending').order('updated_at', { ascending: true });
  return (
    <>
      <div className="adm-title">
        <h1>승인대기</h1>
        <span className="muted">먼저 요청한 기사가 위에 있습니다.</span>
      </div>
      <section className="panel">
        <ArticleTable rows={data ?? []} showAuthor empty="승인을 기다리는 기사가 없습니다." />
      </section>
    </>
  );
}
