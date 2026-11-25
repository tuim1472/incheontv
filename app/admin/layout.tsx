import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { AdminNav } from './AdminNav';
import '../admin.css';

export const metadata: Metadata = { title: { default: '기사관리', template: '%s | 인천TV 기사관리' }, robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireMember();
  const desk = profile.role === 'desk';
  let pending = 0;
  if (desk) {
    const { count } = await supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    pending = count ?? 0;
  }

  return (
    <div className="adm">
      <aside className="adm-side">
        <Link href="/admin" className="logo-mark">
          인천<b>TV</b>
          <small>기사관리</small>
        </Link>
        <AdminNav desk={desk} pending={pending} />
        <div className="adm-user">
          <span className="who">{profile.name || profile.email}</span>
          <span className="role">
            <span className={`chip ${profile.role}`}>{desk ? '데스크' : '기자'}</span>
          </span>
          <Link href="/" target="_blank">
            사이트 보기 ↗
          </Link>
          <form action="/auth/signout" method="post">
            <button>로그아웃</button>
          </form>
        </div>
      </aside>
      <main className="adm-main">
        <div className="adm-inner">{children}</div>
      </main>
    </div>
  );
}
