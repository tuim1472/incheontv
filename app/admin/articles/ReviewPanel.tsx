'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import type { Article } from '@/lib/types';
import { reviewArticle } from '../actions';

function Btn({ op, label, className = 'btn', confirmText }: { op: string; label: string; className?: string; confirmText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      name="op"
      value={op}
      disabled={pending}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {pending ? '처리 중…' : label}
    </button>
  );
}

// 데스크 처리 버튼 + 기자의 요청취소/삭제
export function ReviewPanel({ article, desk, own }: { article: Article; desk: boolean; own: boolean }) {
  const [state, action] = useFormState(reviewArticle, null);
  const [rejecting, setRejecting] = useState(false);
  const s = article.status;
  const canDelete = desk || (own && (s === 'draft' || s === 'rejected'));

  return (
    <form action={action} className="panel form">
      <input type="hidden" name="id" value={article.id} />
      <h2 style={{ margin: 0 }}>{desk ? '데스크 처리' : '기사 처리'}</h2>
      {state?.error && <p className="alert error">{state.error}</p>}

      {desk && s === 'pending' && (
        <>
          {!rejecting ? (
            <div className="actions">
              <Btn op="publish" label="승인하고 바로 게재" className="btn ok" />
              <button type="button" className="btn bad" onClick={() => setRejecting(true)}>
                반려하기
              </button>
            </div>
          ) : (
            <>
              <label className="field">
                <span>반려 사유 (기자에게 그대로 보입니다)</span>
                <textarea className="textarea short" id="rv-reason" name="reason" required autoFocus placeholder="예: 2문단 수치의 출처를 밝혀 주세요." />
              </label>
              <div className="actions">
                <Btn op="reject" label="반려 확정" className="btn bad" />
                <button type="button" className="btn" onClick={() => setRejecting(false)}>
                  취소
                </button>
              </div>
            </>
          )}
          <small className="muted">본문을 고친 뒤 게재하려면 오른쪽 편집 화면에서 ‘승인하고 게재’를 누르세요.</small>
        </>
      )}

      {desk && s === 'published' && (
        <div className="actions">
          {article.is_headline ? <Btn op="headline_off" label="헤드라인에서 빼기" /> : <Btn op="headline_on" label="헤드라인에 걸기" />}
          <Btn op="unpublish" label="게재 내리기" className="btn bad" confirmText="사이트에서 이 기사를 내릴까요? 나중에 다시 게재할 수 있습니다." />
        </div>
      )}

      {desk && (s === 'unpublished' || s === 'draft' || s === 'rejected') && (
        <div className="actions">
          <Btn op="publish" label={s === 'unpublished' ? '다시 게재' : '바로 게재'} className="btn ok" />
        </div>
      )}

      {!desk && own && s === 'pending' && (
        <div className="actions">
          <Btn op="withdraw" label="승인요청 취소" confirmText="승인요청을 취소하고 작성중으로 돌릴까요?" />
        </div>
      )}

      {canDelete && (
        <div className="actions">
          <Btn op="delete" label="기사 삭제" className="btn small bad" confirmText="이 기사를 완전히 삭제할까요? 되돌릴 수 없습니다." />
        </div>
      )}
    </form>
  );
}
