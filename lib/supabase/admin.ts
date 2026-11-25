import 'server-only';
import { createClient } from '@supabase/supabase-js';

// 서비스 키를 쓰는 관리용 클라이언트. RLS 를 건너뛰므로 구성원 초대·삭제에만 씁니다.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
