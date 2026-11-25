import type { Metadata } from 'next';
import { requireMember } from '@/lib/auth';
import { ArticleEditor } from '../ArticleEditor';

export const metadata: Metadata = { title: '기사 쓰기' };

export default async function NewArticlePage() {
  const { profile } = await requireMember();
  return (
    <>
      <div className="adm-title">
        <h1>기사 쓰기</h1>
      </div>
      <ArticleEditor article={null} desk={profile.role === 'desk'} userId={profile.id} />
    </>
  );
}
