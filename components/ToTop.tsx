'use client';

import { useEffect, useState } from 'react';

export function ToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button
      className={`to-top${show ? ' show' : ''}`}
      aria-label="맨 위로"
      onClick={() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      }}
    >
      <svg viewBox="0 0 24 24">
        <path d="M6 15l6-6 6 6" />
      </svg>
    </button>
  );
}
