'use client';

import { useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import type { Article } from '@/lib/types';
import { CATEGORIES } from '@/lib/site';
import { toKstInput } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { saveArticle } from '../actions';

const MAX_WIDTH = 1600;

// 큰 사진은 가로 1600px 로 줄여서 올립니다 (용량 절약).
async function shrink(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap || bitmap.width <= MAX_WIDTH) return file;
  const scale = MAX_WIDTH / bitmap.width;
  const canvas = document.createElement('canvas');
  canvas.width = MAX_WIDTH;
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.86));
}

async function upload(file: File, userId: string) {
  if (file.size > 20 * 1024 * 1024) throw new Error('사진은 20MB 이하로 올려 주세요.');
  const blob = await shrink(file);
  const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from('article-images').upload(path, blob, { contentType: blob.type || file.type, cacheControl: '31536000' });
  if (error) throw new Error(error.message);
  return supabase.storage.from('article-images').getPublicUrl(path).data.publicUrl;
}

function SubmitButton({ intent, label, className = 'btn', confirmText }: { intent: string; label: string; className?: string; confirmText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      name="intent"
      value={intent}
      disabled={pending}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {pending ? '처리 중…' : label}
    </button>
  );
}

export function ArticleEditor({ article, desk, userId }: { article: Article | null; desk: boolean; userId: string }) {
  const [state, action] = useFormState(saveArticle, null);
  const [cover, setCover] = useState(article?.cover_url ?? '');
  const [uploading, setUploading] = useState<'' | 'cover' | 'body'>('');
  const [uploadError, setUploadError] = useState('');
  const [dirty, setDirty] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [bodyLen, setBodyLen] = useState(article?.body.length ?? 0);

  const status = article?.status ?? 'draft';

  async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading('cover');
    setUploadError('');
    try {
      setCover(await upload(file, userId));
      setDirty(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '사진을 올리지 못했습니다.');
    } finally {
      setUploading('');
    }
  }

  async function onBodyImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const caption = window.prompt('사진 설명을 적어 주세요 (사진 아래에 표시됩니다)', '') ?? '';
    setUploading('body');
    setUploadError('');
    try {
      const url = await upload(file, userId);
      const ta = bodyRef.current!;
      const line = `\n\n![${caption.replace(/[\[\]]/g, '')}](${url})\n\n`;
      const at = ta.selectionStart ?? ta.value.length;
      ta.value = (ta.value.slice(0, at) + line + ta.value.slice(at)).replace(/\n{3,}/g, '\n\n');
      setBodyLen(ta.value.length);
      setDirty(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '사진을 올리지 못했습니다.');
    } finally {
      setUploading('');
    }
  }

  return (
    <form action={action} className="editor" onChange={() => setDirty(true)}>
      <input type="hidden" name="id" value={article?.id ?? ''} />
      <input type="hidden" name="cover_url" value={cover} />

      <div className="panel form">
        {state?.error && <p className="alert error">{state.error}</p>}
        {uploadError && <p className="alert error">{uploadError}</p>}

        <label className="field">
          <span>제목</span>
          <input className="input title" id="ed-title" name="title" defaultValue={article?.title} required maxLength={200} placeholder="기사 제목" />
        </label>
        <label className="field">
          <span>
            부제 <small>선택. 제목 아래에 한 줄로 표시됩니다</small>
          </span>
          <input className="input" id="ed-subtitle" name="subtitle" defaultValue={article?.subtitle} maxLength={300} />
        </label>
        <div className="field">
          <div className="body-tools">
            <label htmlFor="ed-body" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>
              본문
            </label>
            <label className="btn small" style={{ cursor: 'pointer' }}>
              {uploading === 'body' ? '사진 올리는 중…' : '본문에 사진 넣기'}
              <input type="file" accept="image/*" hidden onChange={onBodyImage} disabled={!!uploading} />
            </label>
          </div>
          <textarea
            ref={bodyRef}
            className="textarea"
            id="ed-body"
            name="body"
            defaultValue={article?.body}
            onInput={(e) => setBodyLen(e.currentTarget.value.length)}
            placeholder={'문단 사이는 한 줄을 비웁니다.\n\n## 로 시작하는 줄은 소제목이 됩니다.'}
          />
          <small className="muted">
            <span className="num">{bodyLen.toLocaleString()}</span>자 · 빈 줄로 문단을 나눕니다 · “## 소제목” · 사진은 위 버튼으로 넣으세요
          </small>
        </div>
      </div>

      <div className="editor-side">
        <div className="panel form">
          <label className="field">
            <span>분야</span>
            <select className="select" id="ed-category" name="category" defaultValue={article?.category ?? 'news'}>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="field cover-box">
            <span>대표 사진</span>
            {cover ? (
              <div className="thumb has-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="대표 사진 미리보기" />
              </div>
            ) : (
              <div className="cover-empty">{uploading === 'cover' ? '올리는 중…' : '사진을 고르면 여기에 보입니다'}</div>
            )}
            <div className="actions">
              <label className="btn small" style={{ cursor: 'pointer' }}>
                {cover ? '다른 사진' : '사진 고르기'}
                <input type="file" accept="image/*" hidden onChange={onCover} disabled={!!uploading} />
              </label>
              {cover && (
                <button type="button" className="btn small bad" onClick={() => (setCover(''), setDirty(true))}>
                  빼기
                </button>
              )}
            </div>
            <input className="input" id="ed-caption" name="cover_caption" defaultValue={article?.cover_caption} placeholder="사진 설명 (예: 24일 개통한 아암지하차도)" maxLength={300} />
          </div>

          <label className="field">
            <span>
              영상 주소 <small>선택. 유튜브 등</small>
            </span>
            <input className="input" id="ed-video" name="video_url" type="url" defaultValue={article?.video_url ?? ''} placeholder="https://" />
          </label>

          {desk && (
            <>
              <label className="check">
                <input type="checkbox" id="ed-headline" name="is_headline" defaultChecked={article?.is_headline} /> 첫 화면 헤드라인에 걸기
              </label>
              <label className="field">
                <span>
                  게재 일시 <small>비우면 게재하는 순간. 미래로 정하면 예약 게재</small>
                </span>
                <input className="input" id="ed-published-at" name="published_at" type="datetime-local" defaultValue={toKstInput(article?.published_at)} />
              </label>
            </>
          )}
        </div>

        <div className="panel form">
          {desk ? (
            <>
              {status === 'published' ? (
                <SubmitButton intent="save" label="수정 내용 게재" className="btn primary" />
              ) : (
                <SubmitButton intent="publish" label={status === 'pending' ? '승인하고 게재' : '바로 게재'} className="btn ok" />
              )}
              {status !== 'published' && <SubmitButton intent={article ? 'save' : 'draft'} label="저장만 하기" />}
            </>
          ) : status === 'pending' ? (
            <>
              <SubmitButton intent="save" label="수정 저장 (승인대기 유지)" className="btn primary" />
              <SubmitButton intent="draft" label="승인요청 취소하고 저장" />
            </>
          ) : (
            <>
              <SubmitButton intent="submit" label={status === 'rejected' ? '고쳐서 다시 승인요청' : '승인요청'} className="btn primary" confirmText="데스크에게 승인을 요청할까요?" />
              <SubmitButton intent="draft" label="임시저장" />
            </>
          )}
          {dirty && <small className="muted">저장하지 않은 변경 내용이 있습니다.</small>}
          {!desk && <small className="muted">승인요청을 하면 데스크가 확인한 뒤 게재합니다.</small>}
        </div>
      </div>
    </form>
  );
}
