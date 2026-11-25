'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/auth';
import { friendlyError, fromKstInput } from '@/lib/format';
import { isCategory } from '@/lib/site';
import type { ArticleStatus, FormState } from '@/lib/types';

function str(fd: FormData, key: string, max = 100_000) {
  return String(fd.get(key) ?? '').trim().slice(0, max);
}

function okUrl(value: string) {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

// 공개 화면 갱신 (첫 화면, 목록, 기사 페이지)
function refreshPublic() {
  revalidatePath('/', 'layout');
  revalidatePath('/rss.xml');
  revalidatePath('/sitemap.xml');
}

// 기사 저장. intent: draft(임시저장) | submit(승인요청) | publish(게재, 데스크) | save(상태 유지)
export async function saveArticle(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, profile } = await requireMember();
  const desk = profile.role === 'desk';
  const id = Number(fd.get('id')) || null;
  const intent = str(fd, 'intent');

  const title = str(fd, 'title', 200);
  const category = str(fd, 'category');
  if (!title) return { error: '제목을 적어 주세요.' };
  if (!isCategory(category)) return { error: '분야를 골라 주세요.' };
  const cover = okUrl(str(fd, 'cover_url', 2000));
  const video = okUrl(str(fd, 'video_url', 2000));
  if (cover === undefined) return { error: '대표 사진 주소가 올바르지 않습니다.' };
  if (video === undefined) return { error: '영상 주소는 https:// 로 시작하는 전체 주소로 적어 주세요.' };

  type Existing = { status: ArticleStatus; published_at: string | null };
  let existing: Existing | null = null;
  if (id) {
    const { data } = await supabase.from('articles').select('status, published_at').eq('id', id).maybeSingle<Existing>();
    if (!data) return { error: '기사를 찾을 수 없거나 볼 권한이 없습니다.' };
    existing = data;
  }

  let status: ArticleStatus;
  if (intent === 'draft') status = 'draft';
  else if (intent === 'submit') status = 'pending';
  else if (intent === 'publish') {
    if (!desk) return { error: '게재는 데스크만 할 수 있습니다. 승인요청을 해 주세요.' };
    status = 'published';
  } else status = existing?.status ?? 'draft';

  if (status === 'pending' && str(fd, 'body').length < 20) {
    return { error: '본문이 너무 짧습니다. 내용을 채운 뒤 승인요청을 해 주세요.' };
  }

  const row: Record<string, unknown> = {
    title,
    subtitle: str(fd, 'subtitle', 300),
    body: str(fd, 'body'),
    category,
    cover_url: cover,
    cover_caption: str(fd, 'cover_caption', 300),
    video_url: video,
    status,
  };

  if (desk) {
    row.is_headline = fd.get('is_headline') === 'on';
    const pa = str(fd, 'published_at');
    if (pa) {
      const iso = fromKstInput(pa);
      if (!iso) return { error: '게재 일시 형식이 올바르지 않습니다.' };
      row.published_at = iso;
    } else {
      row.published_at = status === 'published' && existing?.status === 'published' ? existing.published_at : null;
    }
  }

  let savedId = id;
  if (id) {
    const { data, error } = await supabase.from('articles').update(row).eq('id', id).select('id');
    if (error) return { error: friendlyError(error.message) };
    if (!data?.length) return { error: '이 기사를 수정할 권한이 없습니다. 게재된 기사는 데스크만 고칠 수 있습니다.' };
  } else {
    const { data, error } = await supabase.from('articles').insert(row).select('id').single();
    if (error) return { error: friendlyError(error.message) };
    savedId = data.id;
  }

  if (status === 'published' || existing?.status === 'published') refreshPublic();
  revalidatePath('/admin', 'layout');
  redirect(`/admin/articles/${savedId}?done=${intent || 'save'}`);
}

// 승인·반려·내림·삭제 등 상태 처리
export async function reviewArticle(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, profile } = await requireMember();
  const desk = profile.role === 'desk';
  const id = Number(fd.get('id'));
  const op = str(fd, 'op');
  if (!id) return { error: '기사를 찾을 수 없습니다.' };

  const deskOnly = ['publish', 'reject', 'unpublish', 'headline_on', 'headline_off'];
  if (deskOnly.includes(op) && !desk) return { error: '데스크만 할 수 있는 작업입니다.' };

  if (op === 'delete') {
    const { data, error } = await supabase.from('articles').delete().eq('id', id).select('id, status');
    if (error) return { error: friendlyError(error.message) };
    if (!data?.length) return { error: '삭제할 권한이 없습니다. 기자는 작성중이거나 반려된 자기 기사만 지울 수 있습니다.' };
    if (data[0].status === 'published') refreshPublic();
    revalidatePath('/admin', 'layout');
    redirect('/admin/articles?done=deleted');
  }

  let patch: Record<string, unknown>;
  switch (op) {
    case 'publish': {
      const pa = str(fd, 'published_at');
      const iso = pa ? fromKstInput(pa) : null;
      if (pa && !iso) return { error: '게재 일시 형식이 올바르지 않습니다.' };
      patch = { status: 'published', published_at: iso };
      break;
    }
    case 'reject': {
      const reason = str(fd, 'reason', 1000);
      if (!reason) return { error: '반려 사유를 적어 주세요. 기자에게 그대로 보입니다.' };
      patch = { status: 'rejected', reject_reason: reason };
      break;
    }
    case 'unpublish':
      patch = { status: 'unpublished' };
      break;
    case 'withdraw':
      patch = { status: 'draft' };
      break;
    case 'headline_on':
      patch = { is_headline: true };
      break;
    case 'headline_off':
      patch = { is_headline: false };
      break;
    default:
      return { error: '알 수 없는 작업입니다.' };
  }

  const { data, error } = await supabase.from('articles').update(patch).eq('id', id).select('id');
  if (error) return { error: friendlyError(error.message) };
  if (!data?.length) return { error: '권한이 없거나 이미 다른 사람이 처리한 기사입니다. 새로고침해 주세요.' };

  if (['publish', 'unpublish', 'headline_on', 'headline_off'].includes(op)) refreshPublic();
  revalidatePath('/admin', 'layout');
  redirect(`/admin/articles/${id}?done=${op}`);
}
