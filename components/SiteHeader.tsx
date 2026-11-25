'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, SITE } from '@/lib/site';
import { todayKst } from '@/lib/format';

function Logo() {
  return (
    <span className="logo-mark">
      인천<b>TV</b>
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const focusSearch = useRef(false);

  useEffect(() => setToday(todayKst()), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => (focusSearch.current ? searchRef.current : closeRef.current)?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function show(search: boolean) {
    focusSearch.current = search;
    setOpen(true);
  }
  function close() {
    setOpen(false);
    openRef.current?.focus();
  }
  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = searchRef.current?.value.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const active = (slug: string) => pathname === `/section/${slug}`;

  return (
    <>
      <div className="util">
        <div className="wrap">
          <span className="num">{today}</span>
          <ul>
            <li className="hide-m">
              <Link href="/about">매체소개</Link>
            </li>
            <li>
              <Link href="/about#tip">기사제보</Link>
            </li>
            <li>
              <Link href="/admin">기자 로그인</Link>
            </li>
          </ul>
        </div>
      </div>

      <header className="masthead">
        <div className="wrap">
          <Link href="/" className="logo" aria-label={`${SITE.name} 홈`}>
            <Logo />
            <span className="logo-sub">{SITE.tagline}</span>
          </Link>
        </div>
      </header>

      <nav className="nav" aria-label="주요 메뉴">
        <div className="wrap">
          <button ref={openRef} className="icon-btn" aria-label="전체메뉴 열기" aria-expanded={open} aria-controls="drawer" onClick={() => show(false)}>
            <svg viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="menu">
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/section/${c.slug}`} aria-current={active(c.slug) ? 'page' : undefined}>
                {c.name}
              </Link>
            ))}
          </div>
          <button className="icon-btn" aria-label="기사검색" onClick={() => show(true)}>
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
        </div>
      </nav>

      <div className={open ? 'drawer-open' : undefined}>
        <div className="drawer-bg" onClick={close} />
        <aside className="drawer" id="drawer" aria-label="전체메뉴" aria-hidden={!open}>
          <div className="drawer-head">
            <Logo />
            <button ref={closeRef} className="icon-btn" aria-label="전체메뉴 닫기" onClick={close}>
              <svg viewBox="0 0 24 24">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <form className="search" role="search" onSubmit={onSearch}>
            <label htmlFor="drawer-q" className="sr-only">
              기사검색
            </label>
            <input id="drawer-q" ref={searchRef} type="search" placeholder="검색어를 입력하세요" />
            <button type="submit">검색</button>
          </form>
          <nav>
            <Link href="/news">전체기사</Link>
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/section/${c.slug}`}>
                {c.name}
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
}
