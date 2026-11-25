import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Profile } from './types';

export async function getMember() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!profile) return null;
  return { supabase, user, profile };
}

export async function requireMember() {
  const m = await getMember();
  if (!m) redirect('/login');
  if (m.profile.status !== 'active') redirect('/suspended');
  return m;
}

export async function requireDesk() {
  const m = await requireMember();
  if (m.profile.role !== 'desk') redirect('/admin');
  return m;
}
