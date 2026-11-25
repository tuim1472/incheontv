import type { CSSProperties } from 'react';
import { hue } from '@/lib/format';

// 대표 사진. 사진이 없으면 기사 번호로 색을 정한 자리표시를 보여줍니다.
export function Thumb({ src, id, alt = '' }: { src?: string | null; id: number; alt?: string }) {
  if (src) {
    return (
      <div className="thumb has-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" />
      </div>
    );
  }
  return <div className="thumb" style={{ '--h': hue(id) } as CSSProperties} aria-hidden="true" />;
}
