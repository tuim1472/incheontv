'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import '../../admin.css';

export default function ResetPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email')).trim();
    setBusy(true);
    setError('');
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/auth/set-password`,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="logo-mark">
          인천<b>TV</b>
        </Link>
        <h1>비밀번호 찾기</h1>
        {sent ? (
          <p className="alert ok">메일을 보냈습니다. 메일의 링크를 눌러 새 비밀번호를 정해 주세요. 메일이 안 보이면 스팸함도 확인해 주세요.</p>
        ) : (
          <form className="form" onSubmit={onSubmit}>
            {error && <p className="alert error">{error}</p>}
            <label className="field">
              <span>가입한 이메일</span>
              <input className="input" id="reset-email" name="email" type="email" required autoComplete="email" />
            </label>
            <button className="btn primary" disabled={busy}>
              {busy ? '보내는 중…' : '재설정 메일 받기'}
            </button>
          </form>
        )}
        <p className="foot">
          <Link href="/login">로그인으로 돌아가기</Link>
        </p>
      </div>
    </div>
  );
}
