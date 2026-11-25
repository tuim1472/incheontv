import type { Metadata } from 'next';
import Link from 'next/link';
import { getMember } from '@/lib/auth';
import { HashSession } from './HashSession';
import { SetPasswordForm } from './SetPasswordForm';
import '../../admin.css';

export const metadata: Metadata = { title: '비밀번호 정하기', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function SetPasswordPage() {
  const m = await getMember();
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="logo-mark">
          인천<b>TV</b>
        </Link>
        {m ? (
          <>
            <h1>{m.profile.email} 계정의 비밀번호를 정해 주세요</h1>
            <SetPasswordForm defaultName={m.profile.name} />
          </>
        ) : (
          <HashSession />
        )}
      </div>
    </div>
  );
}
