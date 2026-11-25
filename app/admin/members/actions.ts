'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireDesk } from '@/lib/auth';
import { friendlyError } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import type { FormState } from '@/lib/types';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function back(msg: string, kind: 'ok' | 'error' = 'ok'): never {
  redirect(`/admin/members?${kind}=${encodeURIComponent(msg)}`);
}

// 초대: 초대 목록에 넣고 → 초대 메일 발송. 가입 처리 트리거가 목록을 보고 역할을 정합니다.
export async function inviteMember(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireDesk();
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const name = String(fd.get('name') ?? '').trim().slice(0, 40);
  const role = fd.get('role') === 'desk' ? 'desk' : 'reporter';
  if (!EMAIL.test(email)) return { error: '이메일 주소를 확인해 주세요.' };
  if (!name) return { error: '이름을 적어 주세요. 기사에 “OOO 기자”로 표시됩니다.' };

  const { data: exists } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
  if (exists) return { error: '이미 등록된 구성원입니다. 목록에서 역할이나 상태를 바꿔 주세요.' };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  await supabase.from('invitations').delete().eq('email', email);
  const { error: invErr } = await supabase.from('invitations').insert({ email, name, role });
  if (invErr) return { error: friendlyError(invErr.message) };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name },
    redirectTo: `${site}/auth/set-password`,
  });
  if (error) {
    await supabase.from('invitations').delete().eq('email', email);
    if (/already been registered|already registered|exists/i.test(error.message)) {
      return { error: '이미 가입된 이메일입니다.' };
    }
    if (/rate limit/i.test(error.message)) {
      return { error: '메일 발송 한도를 넘었습니다. 잠시 후 다시 시도하거나 메일 발송 설정(SMTP)을 확인해 주세요.' };
    }
    return { error: `초대 메일을 보내지 못했습니다: ${error.message}` };
  }

  revalidatePath('/admin/members');
  return { ok: `${email} 으로 초대 메일을 보냈습니다. 메일의 링크로 비밀번호를 정하면 바로 쓸 수 있습니다.` };
}

// 역할 변경 / 정지 / 정지 해제 (RLS 와 트리거가 권한을 다시 확인합니다)
export async function updateMember(fd: FormData) {
  const { supabase } = await requireDesk();
  const id = String(fd.get('id') ?? '');
  const op = String(fd.get('op') ?? '');
  const patch =
    op === 'make_desk' ? { role: 'desk' } : op === 'make_reporter' ? { role: 'reporter' } : op === 'suspend' ? { status: 'suspended' } : op === 'activate' ? { status: 'active' } : null;
  if (!id || !patch) back('알 수 없는 작업입니다.', 'error');

  const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select('name, email');
  if (error) back(friendlyError(error.message), 'error');
  if (!data?.length) back('구성원을 찾을 수 없습니다.', 'error');

  const who = data[0].name || data[0].email;
  const msg =
    op === 'make_desk' ? `${who}님을 데스크로 바꿨습니다.` : op === 'make_reporter' ? `${who}님을 기자로 바꿨습니다.` : op === 'suspend' ? `${who}님의 계정을 정지했습니다.` : `${who}님의 정지를 풀었습니다.`;
  revalidatePath('/admin/members');
  back(msg);
}

// 아직 로그인한 적 없는 초대 취소 (계정 삭제)
export async function cancelInvite(fd: FormData) {
  const { supabase, profile } = await requireDesk();
  const id = String(fd.get('id') ?? '');
  const admin = createAdminClient();

  const { data: u, error } = await admin.auth.admin.getUserById(id);
  if (error || !u.user) back('구성원을 찾을 수 없습니다.', 'error');
  if (u.user.last_sign_in_at) back('이미 로그인한 구성원은 초대를 취소할 수 없습니다. 대신 정지해 주세요.', 'error');

  const { count } = await supabase.from('articles').select('id', { count: 'exact', head: true }).eq('author_id', id);
  if (count) back('기사를 쓴 구성원은 삭제할 수 없습니다. 대신 정지해 주세요.', 'error');

  const { error: delErr } = await admin.auth.admin.deleteUser(id);
  if (delErr) back(`초대를 취소하지 못했습니다: ${delErr.message}`, 'error');
  await admin.from('member_log').insert({ actor_id: profile.id, target_email: u.user.email ?? '', action: 'invite_cancelled' });

  revalidatePath('/admin/members');
  back(`${u.user.email} 초대를 취소했습니다.`);
}
