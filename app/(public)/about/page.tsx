import type { Metadata } from 'next';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: '매체소개' };

export default function AboutPage() {
  return (
    <div className="wrap">
      <div className="prose">
        <h1>매체소개</h1>
        <p className="todo">이 페이지의 문구는 예시입니다. app/(public)/about/page.tsx 에서 실제 내용으로 바꿔 주세요.</p>
        <p>
          {SITE.name}은 인천의 동네 소식과 시정, 문화, 스포츠를 전하는 지역 인터넷 신문입니다. 시민의 눈높이에서 빠르고 정확하게 전하겠습니다.
        </p>

        <h2 id="tip">기사제보</h2>
        <p>제보는 아래 이메일로 보내 주세요. 사진이나 영상이 있으면 함께 보내 주시면 좋습니다. 제보자의 신원은 보호됩니다.</p>
        <p>
          이메일: <a href={`mailto:${SITE.tipEmail}`}>{SITE.tipEmail}</a>
          <br />
          전화: {SITE.company.phone}
        </p>

        <h2 id="ad">광고문의</h2>
        <p>배너 광고, 기획 기사 문의는 대표전화나 이메일로 연락해 주세요.</p>
      </div>
    </div>
  );
}
