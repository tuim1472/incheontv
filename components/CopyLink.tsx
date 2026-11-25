'use client';

import { useState } from 'react';

export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="copy-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt('아래 주소를 복사하세요', url);
        }
      }}
    >
      {done ? '주소를 복사했습니다' : '기사 주소 복사'}
    </button>
  );
}
