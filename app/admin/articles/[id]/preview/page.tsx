import { notFound } from 'next/navigation';
import { ArticleBody } from '@/components/ArticleBody';
import { requireMember } from '@/lib/auth';
import { STATUS_LABEL } from '@/lib/format';
import type { Article } from '@/lib/types';

export default async function PreviewPage({ params }: { params: { id: string } }) {
  const { supabase } = await requireMember();
  const { data: article } = await supabase.from('articles').select('*').eq('id', Number(params.id)).maybeSingle<Article>();
  if (!article) notFound();
  return (
    <>
      <p className="alert warn">
        <b>미리보기 ({STATUS_LABEL[article.status]})</b>
        독자에게는 게재된 뒤에만 보입니다.
      </p>
      <div className="panel" style={{ padding: '28px max(16px, 4vw)' }}>
        <ArticleBody article={{ ...article, published_at: article.published_at ?? article.updated_at }} />
      </div>
    </>
  );
}
