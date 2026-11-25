'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArticleSummary } from '@/lib/types';
import { categoryName } from '@/lib/site';
import { Thumb } from './Thumb';

export function HeadlineSlider({ items }: { items: ArticleSummary[] }) {
  const n = items.length;
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startX = useRef<number | null>(null);

  const go = useCallback((i: number) => setIdx(((i % n) + n) % n), [n]);
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  const play = useCallback(() => {
    stop();
    if (n < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer.current = setInterval(() => setIdx((i) => (i + 1) % n), 5000);
  }, [n]);

  useEffect(() => {
    play();
    return stop;
  }, [play]);

  if (n === 0) return null;

  return (
    <section className="slider" aria-label="주요 기사" aria-roledescription="carousel">
      <div
        className="slides"
        onMouseEnter={stop}
        onMouseLeave={play}
        onTouchStart={(e) => {
          startX.current = e.touches[0].clientX;
          stop();
        }}
        onTouchEnd={(e) => {
          if (startX.current === null) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
          startX.current = null;
          play();
        }}
      >
        <div className="track" style={{ transform: `translateX(${-idx * 100}%)` }}>
          {items.map((a, i) => (
            <Link
              key={a.id}
              className="slide"
              href={`/news/${a.id}`}
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${n}`}
              aria-hidden={i !== idx}
              tabIndex={i === idx ? 0 : -1}
            >
              <Thumb src={a.cover_url} id={a.id} />
              <div className="cap">
                <span className="cat">{categoryName(a.category)}</span>
                <h3 className="t">{a.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
      {n > 1 && (
        <div className="ctrl">
          <div className="dots">
            {items.map((a, i) => (
              <button
                key={a.id}
                aria-label={`${i + 1}번 기사 보기`}
                aria-current={i === idx}
                onClick={() => {
                  go(i);
                  play();
                }}
              />
            ))}
          </div>
          <div className="arrows">
            <span className="count num">
              {idx + 1} / {n}
            </span>
            <button aria-label="이전 기사" onClick={() => (go(idx - 1), play())}>
              <svg viewBox="0 0 24 24">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <button aria-label="다음 기사" onClick={() => (go(idx + 1), play())}>
              <svg viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
