'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminNav({ desk, pending }: { desk: boolean; pending: number }) {
  const path = usePathname();
  const is = (href: string, exact = false) => (exact ? path === href : path === href || path.startsWith(`${href}/`));
  const item = (href: string, label: string, opts: { exact?: boolean; badge?: number } = {}) => (
    <Link href={href} aria-current={is(href, opts.exact) ? 'page' : undefined}>
      <span>{label}</span>
      {opts.badge ? <span className="badge">{opts.badge}</span> : null}
    </Link>
  );
  return (
    <nav className="adm-nav" aria-label="관리 메뉴">
      {item('/admin', '대시보드', { exact: true })}
      {item('/admin/articles/new', '기사 쓰기', { exact: true })}
      {item('/admin/articles', desk ? '기사 목록' : '내 기사', { exact: true })}
      {desk && (
        <>
          <span className="label">데스크</span>
          {item('/admin/review', '승인대기', { badge: pending })}
          {item('/admin/members', '구성원')}
          {item('/admin/logs', '처리 기록')}
        </>
      )}
      <span className="label">계정</span>
      {item('/admin/me', '내 정보')}
    </nav>
  );
}
