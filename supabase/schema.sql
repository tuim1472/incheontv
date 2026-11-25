-- =====================================================================
-- 인천TV 기사관리 시스템 데이터베이스
-- Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 한 번 실행하세요.
--
-- 역할
--   desk     : 모든 기사 수정·승인·반려·게재·내림, 구성원 초대·역할 변경·정지
--   reporter : 자기 기사 작성·수정, 승인요청
--
-- 기사 상태
--   draft(작성중) → pending(승인대기) → published(게재) → unpublished(내림)
--                      └→ rejected(반려) → 수정 후 다시 pending
--
-- 권한은 이 파일의 RLS 정책과 트리거가 직접 지킵니다.
-- 화면을 거치지 않고 API 를 직접 호출해도 같은 규칙이 적용됩니다.
-- =====================================================================

-- ---------- 타입 ----------
create type public.member_role as enum ('desk', 'reporter');
create type public.member_status as enum ('active', 'suspended');
create type public.article_status as enum ('draft', 'pending', 'rejected', 'published', 'unpublished');

-- ---------- 카테고리 ----------
create table public.categories (
  slug text primary key,
  name text not null,
  sort int not null default 0
);

insert into public.categories (slug, name, sort) values
  ('news', '뉴스', 1),
  ('culture', '문화/여행', 2),
  ('tech', 'IT/과학', 3),
  ('sports', '스포츠', 4),
  ('trend', '트렌드', 5),
  ('shorts', '쇼츠', 6);

-- ---------- 구성원 ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role public.member_role not null default 'reporter',
  status public.member_status not null default 'active',
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- 초대 대기 목록. 초대받은 사람이 가입을 마치면 profiles 로 옮겨지고 여기서 지워집니다.
create table public.invitations (
  email text primary key check (email = lower(email)),
  name text not null default '',
  role public.member_role not null,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- 구성원 관련 기록 (누가 누구를 초대했고, 언제 역할·상태를 바꿨는지)
create table public.member_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  target_email text not null,
  action text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- 기사 ----------
create table public.articles (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 200),
  subtitle text not null default '',
  body text not null default '',
  category text not null references public.categories (slug),
  cover_url text,
  cover_caption text not null default '',
  video_url text,
  author_id uuid not null default auth.uid() references public.profiles (id),
  author_name text not null default '',
  status public.article_status not null default 'draft',
  reject_reason text,
  is_headline boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_public_idx on public.articles (status, published_at desc);
create index articles_category_idx on public.articles (category, status, published_at desc);
create index articles_author_idx on public.articles (author_id, updated_at desc);

-- 기사 처리 기록 (작성, 승인요청, 승인, 반려, 내림, 수정)
create table public.article_history (
  id bigint generated always as identity primary key,
  article_id bigint not null references public.articles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  from_status public.article_status,
  to_status public.article_status,
  note text,
  created_at timestamptz not null default now()
);
create index article_history_article_idx on public.article_history (article_id, created_at desc);

-- 조회수 (인기 콘텐츠용). 기사 테이블과 분리해서 방문자가 기사 행을 건드리지 않게 합니다.
create table public.article_stats (
  article_id bigint primary key references public.articles (id) on delete cascade,
  views bigint not null default 0
);

-- =====================================================================
-- 권한 확인 함수
-- =====================================================================
create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'active');
$$;

create or replace function public.is_desk()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'active' and role = 'desk');
$$;

-- =====================================================================
-- 가입 처리: 초대받은 이메일만 활동 계정이 됩니다.
--   - 초대 목록에 있는 이메일 → 초대한 역할로 활동 계정
--   - 구성원이 아무도 없을 때 만든 첫 계정 → 데스크 (최초 관리자)
--   - 그 밖의 계정 → 정지 상태 (아무 권한 없음)
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  inv invitations%rowtype;
  is_first boolean;
begin
  select * into inv from invitations where email = lower(new.email);
  select not exists (select 1 from profiles) into is_first;

  if inv.email is not null then
    insert into profiles (id, email, name, role, status, invited_by)
    values (new.id, lower(new.email), coalesce(nullif(inv.name, ''), new.raw_user_meta_data ->> 'name', ''), inv.role, 'active', inv.invited_by);
    delete from invitations where email = inv.email;
  elsif is_first then
    insert into profiles (id, email, name, role, status)
    values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'name', ''), 'desk', 'active');
  else
    insert into profiles (id, email, name, role, status)
    values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'name', ''), 'reporter', 'suspended');
  end if;

  insert into member_log (actor_id, target_email, action, detail)
  values (new.id, lower(new.email), 'joined',
          case when inv.email is not null then '초대 수락'
               when is_first then '최초 데스크 계정'
               else '초대 없이 생성됨 (정지 상태)' end);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 구성원 변경 규칙
--   - 역할·상태는 데스크만 바꿀 수 있습니다 (RLS).
--   - 자기 자신의 역할·상태는 바꿀 수 없습니다 (데스크가 0명이 되는 일 방지).
--   - id, email 은 바꿀 수 없습니다.
-- =====================================================================
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.id := old.id;
  new.email := old.email;
  new.created_at := old.created_at;
  new.invited_by := old.invited_by;

  if (new.role is distinct from old.role or new.status is distinct from old.status) then
    if auth.uid() is not null and old.id = auth.uid() then
      raise exception '자기 자신의 역할이나 상태는 바꿀 수 없습니다. 다른 데스크에게 요청하세요.';
    end if;
    if new.role is distinct from old.role then
      insert into member_log (actor_id, target_email, action, detail)
      values (auth.uid(), old.email, 'role_changed',
              case when new.role = 'desk' then '기자 → 데스크' else '데스크 → 기자' end);
    end if;
    if new.status is distinct from old.status then
      insert into member_log (actor_id, target_email, action, detail)
      values (auth.uid(), old.email, case when new.status = 'suspended' then 'suspended' else 'reactivated' end, '');
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- 이름 바꾸기 (본인)
create or replace function public.update_my_name(new_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  update profiles set name = left(trim(new_name), 40) where id = auth.uid();
  -- 작성자 이름만 바꾸는 내부 갱신이므로 기사 규칙 검사(guard_article)를 건너뜁니다.
  perform set_config('app.system_update', 'on', true);
  update articles set author_name = left(trim(new_name), 40) where author_id = auth.uid();
  perform set_config('app.system_update', 'off', true);
end;
$$;

-- 초대 기록
create or replace function public.log_invitation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.invited_by := auth.uid();
    insert into member_log (actor_id, target_email, action, detail)
    values (auth.uid(), new.email, 'invited', case when new.role = 'desk' then '데스크로 초대' else '기자로 초대' end);
    return new;
  else
    -- 가입 완료로 지워지는 경우(handle_new_user)는 기록하지 않습니다.
    if auth.uid() is not null and not exists (select 1 from profiles where email = old.email) then
      insert into member_log (actor_id, target_email, action, detail)
      values (auth.uid(), old.email, 'invite_cancelled', '');
    end if;
    return old;
  end if;
end;
$$;

create trigger invitations_log_insert
  before insert on public.invitations
  for each row execute function public.log_invitation();
create trigger invitations_log_delete
  after delete on public.invitations
  for each row execute function public.log_invitation();

-- =====================================================================
-- 기사 변경 규칙
--   기자: 상태를 draft / pending 으로만 바꿀 수 있고,
--         헤드라인·게재일·작성자는 바꿀 수 없습니다.
--   데스크: 무엇이든 바꿀 수 있습니다. 게재할 때 게재일이 비어 있으면 지금으로 채웁니다.
--           반려할 때는 사유가 있어야 합니다.
-- =====================================================================
create or replace function public.guard_article()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  desk boolean := public.is_desk();
begin
  -- update_my_name 같은 내부 함수가 작성자 이름만 바꿀 때
  if tg_op = 'UPDATE' and current_setting('app.system_update', true) = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.author_id := coalesce(auth.uid(), new.author_id);
    new.created_at := now();
    if not desk then
      if new.status not in ('draft', 'pending') then
        raise exception '기자는 작성중 또는 승인요청 상태로만 저장할 수 있습니다.';
      end if;
      new.is_headline := false;
      new.published_at := null;
      new.reject_reason := null;
    end if;
  else
    new.id := old.id;
    new.author_id := old.author_id;
    new.created_at := old.created_at;
    if not desk then
      if new.status not in ('draft', 'pending') then
        raise exception '기자는 기사를 게재하거나 반려할 수 없습니다. 승인요청을 해 주세요.';
      end if;
      new.is_headline := old.is_headline;
      new.published_at := old.published_at;
      if new.status = 'pending' then new.reject_reason := null; else new.reject_reason := old.reject_reason; end if;
    end if;
  end if;

  new.author_name := coalesce((select name from profiles where id = new.author_id), new.author_name, '');

  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'rejected' and coalesce(trim(new.reject_reason), '') = '' then
    raise exception '반려할 때는 사유를 적어 주세요.';
  end if;
  if new.status <> 'rejected' and desk then
    new.reject_reason := null;
  end if;
  if new.status <> 'published' then
    new.is_headline := false;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger articles_guard
  before insert or update on public.articles
  for each row execute function public.guard_article();

create or replace function public.log_article()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  act text;
begin
  if tg_op = 'INSERT' then
    insert into article_history (article_id, actor_id, action, to_status)
    values (new.id, auth.uid(), case when new.status = 'pending' then 'submitted' when new.status = 'published' then 'published' else 'created' end, new.status);
    return new;
  end if;

  if new.status is distinct from old.status then
    act := case new.status
      when 'pending' then 'submitted'
      when 'published' then 'published'
      when 'rejected' then 'rejected'
      when 'unpublished' then 'unpublished'
      when 'draft' then 'withdrawn'
    end;
    insert into article_history (article_id, actor_id, action, from_status, to_status, note)
    values (new.id, auth.uid(), act, old.status, new.status, case when new.status = 'rejected' then new.reject_reason end);
  elsif (new.title, new.subtitle, new.body, new.category, new.cover_url, new.cover_caption, new.video_url)
        is distinct from
        (old.title, old.subtitle, old.body, old.category, old.cover_url, old.cover_caption, old.video_url) then
    -- 같은 사람이 10분 안에 여러 번 저장하면 기록을 한 줄로 합칩니다.
    if not exists (
      select 1 from article_history
      where article_id = new.id and actor_id is not distinct from auth.uid()
        and action = 'edited' and created_at > now() - interval '10 minutes'
    ) then
      insert into article_history (article_id, actor_id, action, from_status, to_status)
      values (new.id, auth.uid(), 'edited', old.status, new.status);
    end if;
  end if;
  return new;
end;
$$;

create trigger articles_log
  after insert or update on public.articles
  for each row execute function public.log_article();

-- =====================================================================
-- 조회수와 인기 기사
-- =====================================================================
create or replace function public.increment_view(aid bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from articles where id = aid and status = 'published' and published_at <= now()) then
    insert into article_stats (article_id, views) values (aid, 1)
    on conflict (article_id) do update set views = article_stats.views + 1;
  end if;
end;
$$;

-- 최근 days 일 동안 게재된 기사 중 조회수 순 (RLS 가 그대로 적용됩니다)
create or replace function public.popular_articles(lim int default 7, days int default 30)
returns setof public.articles language sql stable set search_path = public as $$
  select a.*
  from articles a
  left join article_stats s on s.article_id = a.id
  where a.status = 'published' and a.published_at <= now()
    and a.published_at > now() - make_interval(days => days)
  order by coalesce(s.views, 0) desc, a.published_at desc
  limit lim;
$$;

-- =====================================================================
-- RLS (행 단위 권한)
-- =====================================================================
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.member_log enable row level security;
alter table public.articles enable row level security;
alter table public.article_history enable row level security;
alter table public.article_stats enable row level security;

-- 카테고리: 누구나 읽기, 데스크만 수정
create policy categories_read on public.categories for select using (true);
create policy categories_write on public.categories for all to authenticated
  using (public.is_desk()) with check (public.is_desk());

-- 구성원: 활동 중인 구성원끼리 서로 볼 수 있음, 본인은 정지 상태여도 자기 정보를 볼 수 있음
create policy profiles_read on public.profiles for select to authenticated
  using (public.is_active_member() or id = auth.uid());
create policy profiles_desk_update on public.profiles for update to authenticated
  using (public.is_desk()) with check (public.is_desk());

-- 초대: 데스크만
create policy invitations_desk on public.invitations for all to authenticated
  using (public.is_desk()) with check (public.is_desk());

-- 구성원 기록: 데스크만 읽기 (쓰기는 트리거만)
create policy member_log_read on public.member_log for select to authenticated
  using (public.is_desk());

-- 기사 읽기: 게재된 기사는 누구나 / 내 기사는 나 / 데스크는 전부
create policy articles_public_read on public.articles for select
  using (status = 'published' and published_at <= now());
create policy articles_own_read on public.articles for select to authenticated
  using (author_id = auth.uid() and public.is_active_member());
create policy articles_desk_read on public.articles for select to authenticated
  using (public.is_desk());

-- 기사 쓰기: 활동 중인 구성원은 자기 이름으로 작성
create policy articles_insert on public.articles for insert to authenticated
  with check (public.is_active_member() and author_id = auth.uid());

-- 기사 수정: 기자는 자기 기사 중 작성중·승인대기·반려 상태만 / 데스크는 전부
create policy articles_update_own on public.articles for update to authenticated
  using (author_id = auth.uid() and public.is_active_member() and status in ('draft', 'pending', 'rejected'))
  with check (author_id = auth.uid() and status in ('draft', 'pending'));
create policy articles_update_desk on public.articles for update to authenticated
  using (public.is_desk()) with check (public.is_desk());

-- 기사 삭제: 기자는 자기 작성중·반려 기사만 / 데스크는 전부
create policy articles_delete_own on public.articles for delete to authenticated
  using (author_id = auth.uid() and public.is_active_member() and status in ('draft', 'rejected'));
create policy articles_delete_desk on public.articles for delete to authenticated
  using (public.is_desk());

-- 기사 기록: 데스크는 전부, 기자는 자기 기사 기록만 (쓰기는 트리거만)
create policy history_read on public.article_history for select to authenticated
  using (
    public.is_desk()
    or exists (select 1 from public.articles a where a.id = article_id and a.author_id = auth.uid() and public.is_active_member())
  );

-- 조회수: 읽기만 공개 (쓰기는 increment_view 함수만)
create policy stats_read on public.article_stats for select using (true);

grant execute on function public.increment_view(bigint) to anon, authenticated;
grant execute on function public.popular_articles(int, int) to anon, authenticated;
grant execute on function public.update_my_name(text) to authenticated;
revoke execute on function public.update_my_name(text) from anon;

-- =====================================================================
-- 기사 사진 저장소
--   누구나 볼 수 있고, 활동 중인 구성원만 올릴 수 있습니다.
--   지우기는 올린 사람 또는 데스크만.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-images', 'article-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy article_images_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'article-images' and public.is_active_member());
create policy article_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'article-images' and (owner = auth.uid() or public.is_desk()));
