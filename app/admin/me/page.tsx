import type { Metadata } from 'next';
import { requireMember } from '@/lib/auth';
import { MeForms } from './MeForms';

export const metadata: Metadata = { title: '내 정보' };

export default async function MePage() {
  const { profile } = await requireMember();
  return (
    <>
      <div className="adm-title">
        <h1>내 정보</h1>
        <span className="muted">{profile.email}</span>
      </div>
      <MeForms name={profile.name} />
    </>
  );
}
