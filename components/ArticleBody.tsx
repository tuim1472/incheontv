import type { Article } from '@/lib/types';
import { categoryName } from '@/lib/site';
import { formatDateTime, parseBody } from '@/lib/format';
import { CopyLink } from './CopyLink';

// 기사 본문. 공개 기사 페이지와 관리자 미리보기에서 함께 씁니다.
export function ArticleBody({ article, url }: { article: Article; url?: string }) {
  const blocks = parseBody(article.body);
  const edited =
    article.published_at && new Date(article.updated_at).getTime() - new Date(article.published_at).getTime() > 10 * 60 * 1000;
  return (
    <article>
      <header className="article-head">
        <span className="cat">{categoryName(article.category)}</span>
        <h1>{article.title}</h1>
        {article.subtitle && <p className="sub">{article.subtitle}</p>}
        <div className="meta">
          {article.author_name && <span className="by">{article.author_name} 기자</span>}
          {article.published_at && <span className="num">입력 {formatDateTime(article.published_at)}</span>}
          {edited && <span className="num">수정 {formatDateTime(article.updated_at)}</span>}
          {url && <CopyLink url={url} />}
        </div>
      </header>
      <div className="article-body">
        {article.cover_url && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.cover_url} alt={article.cover_caption || article.title} />
            {article.cover_caption && <figcaption>{article.cover_caption}</figcaption>}
          </figure>
        )}
        {article.video_url && (
          <a className="video-link" href={article.video_url} target="_blank" rel="noopener noreferrer">
            ▶ 영상 보기
          </a>
        )}
        {blocks.map((b, i) => {
          if (b.type === 'h') return <h2 key={i}>{b.text}</h2>;
          if (b.type === 'img')
            return (
              <figure key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.src} alt={b.alt} loading="lazy" />
                {b.alt && <figcaption>{b.alt}</figcaption>}
              </figure>
            );
          return <p key={i}>{b.text}</p>;
        })}
      </div>
      {article.author_name && <p className="byline-end">{article.author_name} 기자</p>}
    </article>
  );
}
