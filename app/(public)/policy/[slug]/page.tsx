import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE } from '@/lib/site';

const POLICIES: Record<string, { title: string; intro: string }> = {
  privacy: {
    title: '개인정보처리방침',
    intro: `${SITE.name}은 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 관련 고충을 처리하기 위해 다음과 같이 개인정보처리방침을 둡니다.`,
  },
  youth: {
    title: '청소년보호정책',
    intro: `${SITE.name}은 청소년이 유해한 정보에 노출되지 않도록 「청소년 보호법」에 따라 청소년보호정책을 시행합니다.`,
  },
  copyright: {
    title: '저작권보호정책',
    intro: `${SITE.name}에 게재된 기사와 사진, 영상의 저작권은 ${SITE.name}에 있으며, 무단 전재와 재배포를 금지합니다.`,
  },
};

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return { title: POLICIES[params.slug]?.title ?? '정책' };
}

export default function PolicyPage({ params }: { params: { slug: string } }) {
  const p = POLICIES[params.slug];
  if (!p) notFound();
  return (
    <div className="wrap">
      <div className="prose">
        <h1>{p.title}</h1>
        <p className="todo">
          아래는 첫 문단만 있는 초안입니다. 인터넷신문 등록 요건에 맞게 전체 내용을 채워 주세요 (app/(public)/policy/[slug]/page.tsx).
        </p>
        <p>{p.intro}</p>
        <p>
          책임자: {SITE.company.youthOfficer} / 연락처: {SITE.company.phone}
        </p>
      </div>
    </div>
  );
}
