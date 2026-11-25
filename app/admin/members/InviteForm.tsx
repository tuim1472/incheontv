'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { inviteMember } from './actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn primary" disabled={pending}>
      {pending ? '보내는 중…' : '초대 메일 보내기'}
    </button>
  );
}

export function InviteForm() {
  const [state, action] = useFormState(inviteMember, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="panel form">
      <h2 style={{ margin: 0 }}>구성원 초대</h2>
      {state?.error && <p className="alert error">{state.error}</p>}
      {state?.ok && <p className="alert ok">{state.ok}</p>}
      <div className="row2">
        <label className="field">
          <span>이메일</span>
          <input className="input" id="inv-email" name="email" type="email" required placeholder="reporter@example.com" />
        </label>
        <label className="field">
          <span>이름</span>
          <input className="input" id="inv-name" name="name" required maxLength={40} placeholder="홍길동" />
        </label>
      </div>
      <label className="field">
        <span>역할</span>
        <select className="select" id="inv-role" name="role" defaultValue="reporter">
          <option value="reporter">기자: 기사 작성, 승인요청</option>
          <option value="desk">데스크: 승인·게재, 구성원 관리까지 모두</option>
        </select>
      </label>
      <div className="actions">
        <Submit />
      </div>
    </form>
  );
}
