'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Supabase 기본 메일 양식으로 온 링크는 로그인 정보를 주소의 # 뒤에 담아 보냅니다.
// 그 정보로 로그인한 뒤 화면을 다시 불러옵니다.
export function HashSession() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get('access_token');
    const refresh_token = hash.get('refresh_token');
    if (!access_token || !refresh_token) {
      setFailed(true);
      return;
    }
    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) return setFailed(true);
        // 로그인 쿠키가 저장됐으니 # 부분을 지우고 페이지를 새로 불러옵니다.
        window.location.replace(window.location.pathname);
      });
  }, []);

  if (!failed) return <p className="alert info">링크를 확인하는 중입니다…</p>;
  return (
    <>
      <p className="alert error">링크가 만료됐거나 이미 사용됐습니다. 데스크에게 초대를 다시 요청하거나 비밀번호 찾기를 해 주세요.</p>
      <Link className="btn" href="/login">
        로그인 화면으로
      </Link>
    </>
  );
}
