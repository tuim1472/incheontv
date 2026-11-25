'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function MeForms({ name }: { name: string }) {
  const router = useRouter();
  const [nameMsg, setNameMsg] = useState<{ ok?: string; error?: string }>({});
  const [pwMsg, setPwMsg] = useState<{ ok?: string; error?: string }>({});

  async function saveName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get('name')).trim();
    if (!value) return setNameMsg({ error: '이름을 적어 주세요.' });
    const { error } = await createClient().rpc('update_my_name', { new_name: value });
    setNameMsg(error ? { error: error.message } : { ok: '이름을 바꿨습니다. 내가 쓴 기사의 작성자 이름도 함께 바뀝니다.' });
    router.refresh();
  }

  async function savePw(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const pw = String(fd.get('password'));
    if (pw.length < 8) return setPwMsg({ error: '비밀번호는 8자 이상으로 정해 주세요.' });
    if (pw !== String(fd.get('password2'))) return setPwMsg({ error: '두 비밀번호가 같지 않습니다.' });
    const { error } = await createClient().auth.updateUser({ password: pw });
    if (error) return setPwMsg({ error: error.message });
    form.reset();
    setPwMsg({ ok: '비밀번호를 바꿨습니다.' });
  }

  return (
    <>
      <form className="panel form" onSubmit={saveName}>
        <h2 style={{ margin: 0 }}>이름</h2>
        {nameMsg.error && <p className="alert error">{nameMsg.error}</p>}
        {nameMsg.ok && <p className="alert ok">{nameMsg.ok}</p>}
        <label className="field">
          <span>
            이름 <small>기사에 “OOO 기자”로 표시됩니다</small>
          </span>
          <input className="input" id="me-name" name="name" defaultValue={name} maxLength={40} required />
        </label>
        <div className="actions">
          <button className="btn primary">이름 저장</button>
        </div>
      </form>
      <form className="panel form" onSubmit={savePw}>
        <h2 style={{ margin: 0 }}>비밀번호 바꾸기</h2>
        {pwMsg.error && <p className="alert error">{pwMsg.error}</p>}
        {pwMsg.ok && <p className="alert ok">{pwMsg.ok}</p>}
        <div className="row2">
          <label className="field">
            <span>새 비밀번호 (8자 이상)</span>
            <input className="input" id="me-pw" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <label className="field">
            <span>새 비밀번호 확인</span>
            <input className="input" id="me-pw2" name="password2" type="password" autoComplete="new-password" minLength={8} required />
          </label>
        </div>
        <div className="actions">
          <button className="btn primary">비밀번호 저장</button>
        </div>
      </form>
    </>
  );
}
