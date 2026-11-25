# 인천TV 기사관리 시스템

지역 인터넷 신문 사이트와, 기자가 기사를 쓰고 데스크가 승인해서 게재하는 관리 화면입니다.

- **공개 사이트**: 첫 화면(헤드라인, 인기 콘텐츠, 분야별 최신뉴스, 쇼츠, 전체기사), 분야별 목록, 기사 페이지, 검색, RSS, 사이트맵
- **관리 화면** (`/admin`): 로그인, 기사 쓰기(사진 업로드 포함), 승인요청, 승인·반려·게재·내림, 헤드라인 지정, 예약 게재, 구성원 초대·역할 변경·정지, 처리 기록

## 역할

| 역할 | 할 수 있는 일 |
|---|---|
| 기자 | 자기 기사 작성·수정, 승인요청, 승인요청 취소, 작성중·반려 기사 삭제 |
| 데스크 | 모든 기사 수정·승인·반려·게재·내림·삭제, 헤드라인, 예약 게재, **구성원 초대, 역할 변경(기자↔데스크), 정지** |

- 자기 자신의 역할·상태는 바꿀 수 없습니다. 데스크가 0명이 되는 일을 막기 위해서입니다.
- 권한은 데이터베이스(RLS 정책과 트리거)가 직접 지킵니다. 화면을 거치지 않고 API를 직접 불러도 기자는 기사를 게재할 수 없습니다.

## 기사 상태

```
작성중 ──(승인요청)──▶ 승인대기 ──(승인)──▶ 게재 ──(내림)──▶ 내림
   ▲                    │
   └──────(반려+사유)────┘
```

---

## 처음 설치하기

필요한 것: GitHub 계정, Supabase 계정(무료), Vercel 계정(무료), 가지고 계신 도메인.

### 1. Supabase 프로젝트 만들기

1. https://supabase.com 에서 **New project** 를 만듭니다. 지역(Region)은 **Northeast Asia (Seoul)** 를 고르세요.
2. 왼쪽 **SQL Editor** 에서 `supabase/schema.sql` 파일 내용을 전부 붙여넣고 **Run** 을 누릅니다.
3. **Authentication → Sign In / Providers** 에서 **Allow new users to sign up** 을 끕니다. (초대로만 가입)
4. **Authentication → URL Configuration**
   - **Site URL**: `https://내도메인` (예: `https://www.incheontv.co.kr`)
   - **Redirect URLs** 에 `https://내도메인/**` 를 추가합니다.
5. (권장) **Authentication → Emails → Templates** 에서 두 양식의 링크를 바꿉니다. 바꾸지 않아도 동작하지만, 바꾸면 메일 링크가 더 안정적입니다.
   - **Invite user**: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/auth/set-password">초대 수락하기</a>`
   - **Reset Password**: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/set-password">비밀번호 다시 정하기</a>`
6. (운영 시 필수) **Project Settings → Authentication → SMTP Settings** 에 메일 발송 서비스를 연결합니다. Supabase 기본 메일은 시간당 몇 통으로 제한되어 있어서 기자를 여러 명 초대하기 어렵습니다. (예: Resend, Amazon SES, 네이버 웍스 SMTP 등)

### 2. 첫 데스크 계정 만들기

**Authentication → Users → Add user → Create new user** 에서 본인 이메일과 비밀번호를 넣고 **Auto Confirm User** 를 켠 채 만듭니다.
**구성원이 하나도 없을 때 만든 첫 계정이 자동으로 데스크가 됩니다.** 그다음부터는 관리 화면의 **구성원** 메뉴에서 초대합니다.

### 3. Vercel 에 올리기

1. 이 폴더를 GitHub 저장소에 올립니다.
2. https://vercel.com 에서 **Add New → Project** 로 그 저장소를 고릅니다.
3. **Environment Variables** 에 네 가지를 넣습니다. 값은 Supabase **Project Settings → API** 에 있습니다.

   | 이름 | 값 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public 키 |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role 키 (**절대 공개 금지**, 구성원 초대에 사용) |
   | `NEXT_PUBLIC_SITE_URL` | `https://내도메인` |

4. **Deploy** 를 누릅니다.

### 4. 도메인 연결

Vercel 프로젝트 **Settings → Domains** 에 도메인을 넣으면, 도메인 업체(가비아, 후이즈 등)에 넣을 DNS 값(A 레코드 또는 CNAME)을 알려줍니다. 그대로 넣고 몇 분~몇 시간 기다리면 연결됩니다. HTTPS 인증서는 Vercel 이 자동으로 붙입니다.

### 5. 실제 정보 채우기

- `lib/site.ts`: 제보 이메일, 회사 주소·전화·법인명·등록번호·발행인 등 푸터 정보
- `app/(public)/about/page.tsx`: 매체소개 문구
- `app/(public)/policy/[slug]/page.tsx`: 개인정보처리방침·청소년보호정책·저작권보호정책 전문

---

## 사용법 요약

- **기자**: `/admin` 로그인 → **기사 쓰기** → 제목·본문·사진 → **승인요청**. 반려되면 대시보드에 알림과 사유가 뜹니다. 고쳐서 **다시 승인요청**.
- **데스크**: **승인대기** 에서 기사를 열고 **승인하고 바로 게재** 또는 **반려하기**(사유 필수). 게재 일시를 미래로 정하면 예약 게재됩니다.
- **본문 쓰는 법**: 문단 사이는 한 줄 비우기 · `## 소제목` · 사진은 **본문에 사진 넣기** 버튼

## 개발

```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev                  # http://localhost:3000
```

데이터베이스 권한 테스트 (PostgreSQL 16 필요):

```bash
PGHOST=/var/run/postgresql ./supabase/test/run.sh
```

## 구성

- Next.js 14 (App Router) + TypeScript
- Supabase: 로그인(Auth), 데이터베이스(PostgreSQL + RLS), 사진 저장소(Storage)
- `supabase/schema.sql`: 테이블, 권한 정책, 트리거 전부
- `app/(public)`: 공개 사이트 / `app/admin`: 관리 화면 / `design/prototype.html`: 처음 만든 디자인 시안
