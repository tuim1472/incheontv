import Link from 'next/link';
import { SITE } from '@/lib/site';
import { ToTop } from './ToTop';

export function SiteFooter() {
  const c = SITE.company;
  const rows: [string, string][] = [
    ['주소', c.address],
    ['대표전화', c.phone],
    ['법인명', c.corp],
    ['등록번호', c.regNo],
    ['등록일', c.regDate],
    ['발행·편집인', c.publisher],
    ['청소년보호책임자', c.youthOfficer],
  ];
  return (
    <footer className="site">
      <div className="f-links">
        <div className="wrap">
          <Link href="/about">매체소개</Link>
          <Link href="/about#tip">기사제보</Link>
          <Link href="/about#ad">광고문의</Link>
          <Link href="/policy/privacy">
            <b>개인정보처리방침</b>
          </Link>
          <Link href="/policy/youth">청소년보호정책</Link>
          <Link href="/policy/copyright">저작권보호정책</Link>
          <Link href="/rss.xml">RSS</Link>
        </div>
      </div>
      <div className="f-info">
        <div className="wrap">
          <span className="logo-mark">
            인천<b>TV</b>
          </span>
          <div>
            <dl>
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="copy">
              Copyright © <span className="num">{new Date().getFullYear()}</span> {SITE.name}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
      <ToTop />
    </footer>
  );
}
