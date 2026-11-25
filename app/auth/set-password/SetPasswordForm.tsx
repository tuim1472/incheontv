'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function SetPasswordForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name')).trim();
    const pw = String(fd.get('password'));
    if (pw.length < 8) return setError('비밀번호는 8자 이상으로 정해 주세요.');
    if (pw !== String(fd.get('password2'))) return setError('두 비밀번호가 같지 않습니다.');
    setBusy(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setBusy(false);
      return setError(/different from the old/i.test(error.message) ? '이전과 다른 비밀번호를 정해 주세요.' : error.message);
    }
    if (name && name !== defaultName) await supabase.rpc('update_my_name', { new_name: name });
    router.replace('/admin');
    router.refresh();
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      {error && <p className="alert error">{error}</p>}
      <label className="field">
        <span>
          이름 <small>기사에 “OOO 기자”로 표시됩니다</small>
        </span>
        <input className="input" id="sp-name" name="name" defaultValue={defaultName} required maxLength={40} />
      </label>
      <label className="field">
        <span>새 비밀번호 (8자 이상)</span>
        <input className="input" id="sp-pw" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </label>
      <label className="field">
        <span>새 비밀번호 확인</span>
        <input className="input" id="sp-pw2" name="password2" type="password" autoComplete="new-password" required minLength={8} />
      </label>
      <button className="btn primary" disabled={busy}>
        {busy ? '저장 중…' : '저장하고 시작하기'}
      </button>
    </form>
  );
}
