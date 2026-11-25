'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    const { error } = await createClient().auth.signInWithPassword({
      email: String(fd.get('email')).trim(),
      password: String(fd.get('password')),
    });
    if (error) {
      setBusy(false);
      setError(/invalid/i.test(error.message) ? '이메일 또는 비밀번호가 맞지 않습니다.' : error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      {error && <p className="alert error">{error}</p>}
      <label className="field">
        <span>이메일</span>
        <input className="input" id="login-email" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        <span>비밀번호</span>
        <input className="input" id="login-password" name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className="btn primary" disabled={busy}>
        {busy ? '로그인 중…' : '로그인'}
      </button>
    </form>
  );
}
