'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// 기사를 열 때 조회수를 1 올립니다. 같은 브라우저에서 하루 한 번만 셉니다.
export function ViewCounter({ id }: { id: number }) {
  useEffect(() => {
    const key = `viewed:${id}:${new Date().toDateString()}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch {
      // 저장소를 쓸 수 없으면 그냥 셉니다.
    }
    createClient()
      .rpc('increment_view', { aid: id })
      .then(({ error }) => error && console.warn(error.message));
  }, [id]);
  return null;
}
