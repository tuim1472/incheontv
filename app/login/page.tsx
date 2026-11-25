import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from './LoginForm';
import '../admin.css';

export const metadata: Metadata = { title: '로그인', robots: { index: false } };

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = searchParams.next?.startsWith('/') && !searchParams.next.startsWith('//') ? searchParams.next : '/admin';
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="logo-mark">
          인천<b>TV</b>
        </Link>
        <h1>기자·데스크 로그인</h1>
        {searchParams.error === 'link' && (
          <p className="alert error">링크가 만료됐거나 이미 사용됐습니다. 데스크에게 초대를 다시 요청하거나 비밀번호 찾기를 해 주세요.</p>
        )}
        <LoginForm next={next} />
        <p className="foot">
          <Link href="/login/reset">비밀번호를 잊으셨나요?</Link>
          <br />
          계정은 데스크의 초대로만 만들 수 있습니다.
        </p>
      </div>
    </div>
  );
}
