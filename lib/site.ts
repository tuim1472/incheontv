// 사이트 기본 정보. 실제 정보로 바꿔 주세요.
export const SITE = {
  name: '인천TV',
  tagline: 'INCHEON LOCAL NEWS',
  description: '인천의 오늘을 전하는 지역 인터넷 신문',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  tipEmail: 'tip@example.com',
  company: {
    address: 'OO시 OO구 OO로 00, 0층',
    phone: '000-0000-0000',
    corp: '(예시) 주식회사 OO미디어',
    regNo: 'OO 아 00000',
    regDate: '0000-00-00',
    publisher: '홍길동',
    youthOfficer: '홍길동',
  },
};

// supabase/schema.sql 의 categories 와 같게 유지합니다.
export const CATEGORIES = [
  { slug: 'news', name: '뉴스' },
  { slug: 'culture', name: '문화/여행' },
  { slug: 'tech', name: 'IT/과학' },
  { slug: 'sports', name: '스포츠' },
  { slug: 'trend', name: '트렌드' },
  { slug: 'shorts', name: '쇼츠' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export function categoryName(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}

export function isCategory(slug: string): slug is CategorySlug {
  return CATEGORIES.some((c) => c.slug === slug);
}
