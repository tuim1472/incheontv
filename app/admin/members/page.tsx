import type { Metadata } from 'next';
import { requireDesk } from '@/lib/auth';
import { formatDate, formatDateTime } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/lib/types';
import { InviteForm } from './InviteForm';
import { cancelInvite, updateMember } from './actions';

export const metadata: Metadata = { title: '구성원' };

export default async function MembersPage({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const { supabase, profile: me } = await requireDesk();
  const { data: members } = await supabase.from('profiles').select('*').order('created_at', { ascending: true }).returns<Profile[]>();

  // 마지막 로그인 시각 (서비스 키가 있을 때만)
  const lastSignIn = new Map<string, string | null>();
  let adminReady = true;
  try {
    const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
    data.users.forEach((u) => lastSignIn.set(u.id, u.last_sign_in_at ?? null));
  } catch {
    adminReady = false;
  }

  const byId = new Map((members ?? []).map((m) => [m.id, m]));
  const active = (members ?? []).filter((m) => m.status === 'active');

  return (
    <>
      <div className="adm-title">
        <h1>구성원</h1>
        <span className="muted">
          활동 중 {active.length}명 · 데스크 {active.filter((m) => m.role === 'desk').length}명
        </span>
      </div>

      {searchParams.ok && <p className="alert ok">{searchParams.ok}</p>}
      {searchParams.error && <p className="alert error">{searchParams.error}</p>}
      {!adminReady && (
        <p className="alert warn">
          <b>SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.</b>
          이 키가 있어야 초대 메일을 보낼 수 있습니다. 배포 설정에 추가해 주세요.
        </p>
      )}

      <InviteForm />

      <section className="panel">
        <h2>구성원 목록</h2>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>이름</th>
                <th>역할</th>
                <th className="hide-s">초대한 사람</th>
                <th className="hide-s">마지막 로그인</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((m) => {
                const self = m.id === me.id;
                const signedIn = lastSignIn.get(m.id);
                const neverSignedIn = adminReady && !signedIn;
                return (
                  <tr key={m.id}>
                    <td>
                      <b>{m.name || '(이름 없음)'}</b>
                      {self && <span className="muted"> (나)</span>}
                      <div className="muted">{m.email}</div>
                    </td>
                    <td className="nowrap">
                      <span className={`chip ${m.role}`}>{m.role === 'desk' ? '데스크' : '기자'}</span>{' '}
                      {m.status === 'suspended' && <span className="chip suspended">정지</span>}
                    </td>
                    <td className="hide-s nowrap">{m.invited_by ? byId.get(m.invited_by)?.name || '—' : '—'}</td>
                    <td className="hide-s nowrap num muted">
                      {neverSignedIn ? <span className="chip pending">초대 수락 전</span> : signedIn ? formatDateTime(signedIn) : '—'}
                      <div>가입 {formatDate(m.created_at)}</div>
                    </td>
                    <td>
                      {self ? (
                        <span className="muted">자기 역할은 다른 데스크가 바꿀 수 있습니다</span>
                      ) : (
                        <div className="member-actions">
                          <form action={updateMember}>
                            <input type="hidden" name="id" value={m.id} />
                            {m.role === 'reporter' ? (
                              <button className="btn small" name="op" value="make_desk">
                                데스크로
                              </button>
                            ) : (
                              <button className="btn small" name="op" value="make_reporter">
                                기자로
                              </button>
                            )}
                          </form>
                          <form action={updateMember}>
                            <input type="hidden" name="id" value={m.id} />
                            {m.status === 'active' ? (
                              <button className="btn small bad" name="op" value="suspend">
                                정지
                              </button>
                            ) : (
                              <button className="btn small" name="op" value="activate">
                                정지 해제
                              </button>
                            )}
                          </form>
                          {neverSignedIn && (
                            <form action={cancelInvite}>
                              <input type="hidden" name="id" value={m.id} />
                              <button className="btn small bad">초대 취소</button>
                            </form>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          정지된 계정은 로그인해도 아무것도 할 수 없습니다. 그 사람이 쓴 기사와 기록은 그대로 남습니다.
        </p>
      </section>
    </>
  );
}
