import type { ArticleStatus } from './types';

const TZ = 'Asia/Seoul';

function parts(iso: string) {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? '';
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour') === '24' ? '00' : get('hour'), min: get('minute') };
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  const p = parts(iso);
  return `${p.y}-${p.m}-${p.d}`;
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '';
  const p = parts(iso);
  return `${p.y}-${p.m}-${p.d} ${p.h}:${p.min}`;
}

// <input type="datetime-local"> 값 (한국 시간)
export function toKstInput(iso: string | null | undefined) {
  if (!iso) return '';
  const p = parts(iso);
  return `${p.y}-${p.m}-${p.d}T${p.h}:${p.min}`;
}

// datetime-local 값(한국 시간) → ISO
export function fromKstInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00+09:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function todayKst() {
  const d = new Date();
  const p = parts(d.toISOString());
  const wd = new Intl.DateTimeFormat('ko-KR', { timeZone: TZ, weekday: 'short' }).format(d);
  return `${p.y}-${p.m}-${p.d} (${wd})`;
}

export const STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: '작성중',
  pending: '승인대기',
  rejected: '반려',
  published: '게재',
  unpublished: '내림',
};

export const HISTORY_LABEL: Record<string, string> = {
  created: '작성',
  submitted: '승인요청',
  withdrawn: '요청 취소',
  published: '게재',
  rejected: '반려',
  unpublished: '게재 내림',
  edited: '수정',
};

export const MEMBER_LOG_LABEL: Record<string, string> = {
  invited: '초대',
  invite_cancelled: '초대 취소',
  joined: '가입',
  role_changed: '역할 변경',
  suspended: '정지',
  reactivated: '정지 해제',
};

// 썸네일 자리표시 색상
export function hue(id: number) {
  return (id * 47 + 190) % 360;
}

// 본문 블록: 빈 줄로 문단을 나누고, "## " 는 소제목, "![설명](주소)" 한 줄은 사진
export type BodyBlock =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'img'; src: string; alt: string };

const IMG_LINE = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/;

export function parseBody(body: string): BodyBlock[] {
  return body
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .flatMap<BodyBlock>((chunk) => {
      const img = chunk.match(IMG_LINE);
      if (img) return [{ type: 'img', alt: img[1], src: img[2] }];
      if (chunk.startsWith('## ')) return [{ type: 'h', text: chunk.slice(3).trim() }];
      return [{ type: 'p', text: chunk }];
    });
}

export function excerpt(body: string, len = 120) {
  const text = parseBody(body)
    .filter((b): b is { type: 'p'; text: string } => b.type === 'p')
    .map((b) => b.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > len ? `${text.slice(0, len)}…` : text;
}

export function friendlyError(message: string | undefined) {
  if (!message) return '알 수 없는 오류가 났습니다. 잠시 후 다시 시도해 주세요.';
  if (/row-level security|permission denied/i.test(message)) return '이 작업을 할 권한이 없습니다.';
  if (/duplicate key/i.test(message)) return '이미 등록된 항목입니다.';
  if (/violates check constraint .*title/i.test(message)) return '제목은 1~200자로 적어 주세요.';
  return message;
}
