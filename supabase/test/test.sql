-- 권한 규칙 테스트 (로컬 PostgreSQL 전용)
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = warning;

create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
  if uid is null then execute 'set role anon'; else execute 'set role authenticated'; end if;
end $$;

create function pg_temp.reset_user() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', false);
end $$;

create function pg_temp.expect_fail(label text, q text) returns void language plpgsql as $$
begin
  begin
    execute q;
  exception when others then
    raise warning 'PASS  %  (거부: %)', label, sqlerrm;
    return;
  end;
  raise exception 'FAIL  %  : 거부돼야 하는데 실행됨', label;
end $$;

create function pg_temp.expect_rows(label text, q text, n int) returns void language plpgsql as $$
declare rc int;
begin
  execute q;
  get diagnostics rc = row_count;
  if rc <> n then raise exception 'FAIL  %  : % 행 기대, % 행 처리', label, n, rc; end if;
  raise warning 'PASS  %', label;
end $$;

create function pg_temp.expect(label text, ok boolean) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAIL  %', label; end if;
  raise warning 'PASS  %', label;
end $$;

-- ---------- 계정 ----------
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000d', 'Desk1@Example.com');
select pg_temp.expect('첫 계정은 데스크', (select role = 'desk' and status = 'active' from profiles where email = 'desk1@example.com'));

select pg_temp.as_user(null);
select pg_temp.expect_fail('비로그인은 초대 불가', $$insert into invitations (email, role) values ('x@example.com', 'desk')$$);

select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
insert into invitations (email, name, role) values ('rep@example.com', '김기자', 'reporter'), ('desk2@example.com', '박데스크', 'desk');
select pg_temp.reset_user();

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'rep@example.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'desk2@example.com'),
  ('00000000-0000-0000-0000-0000000000ff', 'stranger@example.com');

select pg_temp.expect('초대된 기자는 기자로 가입', (select role = 'reporter' and status = 'active' and name = '김기자' and invited_by = '00000000-0000-0000-0000-00000000000d' from profiles where email = 'rep@example.com'));
select pg_temp.expect('초대된 데스크는 데스크로 가입', (select role = 'desk' and status = 'active' from profiles where email = 'desk2@example.com'));
select pg_temp.expect('초대 없이 생긴 계정은 정지', (select status = 'suspended' from profiles where email = 'stranger@example.com'));
select pg_temp.expect('가입 후 초대 목록에서 지워짐', (select count(*) = 0 from invitations));

-- ---------- 기자 ----------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect_rows('기자 기사 작성(작성중)', $$insert into articles (title, body, category) values ('기자 기사', '본문', 'news')$$, 1);
select pg_temp.expect('작성자 이름 자동 기록', (select author_name = '김기자' from articles where title = '기자 기사'));
select pg_temp.expect_fail('기자가 바로 게재 불가', $$insert into articles (title, category, status) values ('몰래 게재', 'news', 'published')$$);
select pg_temp.expect_rows('작성자 위조 시 본인으로 고정', $$insert into articles (title, category, author_id) values ('위조', 'news', '00000000-0000-0000-0000-00000000000d')$$, 1);
select pg_temp.expect('위조한 작성자 무시됨', (select author_id = '00000000-0000-0000-0000-0000000000a1' from articles where title = '위조'));
select pg_temp.expect_rows('기자 승인요청', $$update articles set status = 'pending', is_headline = true where title = '기자 기사'$$, 1);
select pg_temp.expect('기자는 헤드라인 지정 불가(무시)', (select not is_headline from articles where title = '기자 기사'));
select pg_temp.expect_fail('기자가 자기 기사 게재 불가', $$update articles set status = 'published' where title = '기자 기사'$$);
select pg_temp.reset_user();

-- ---------- 비로그인 / 다른 기자 ----------
select pg_temp.as_user(null);
select pg_temp.expect('비로그인은 승인대기 기사 못 봄', (select count(*) = 0 from articles));
select pg_temp.expect_fail('비로그인은 기사 작성 불가', $$insert into articles (title, category) values ('익명', 'news')$$);
select pg_temp.expect('비로그인은 구성원 목록 못 봄', (select count(*) = 0 from profiles));
select pg_temp.expect('비로그인은 구성원 기록 못 봄', (select count(*) = 0 from member_log));

select pg_temp.as_user('00000000-0000-0000-0000-0000000000ff');
select pg_temp.expect_fail('정지 계정은 기사 작성 불가', $$insert into articles (title, category) values ('정지', 'news')$$);
select pg_temp.expect('정지 계정은 자기 정보만 봄', (select count(*) = 1 from profiles));
select pg_temp.expect('정지 계정은 남의 기사 못 봄', (select count(*) = 0 from articles));
select pg_temp.reset_user();

-- ---------- 데스크 ----------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select pg_temp.expect('데스크는 승인대기 기사 봄', (select count(*) = 1 from articles where status = 'pending'));
select pg_temp.expect_fail('사유 없는 반려 불가', $$update articles set status = 'rejected' where title = '기자 기사'$$);
select pg_temp.expect_rows('사유 적고 반려', $$update articles set status = 'rejected', reject_reason = '출처를 보강해 주세요' where title = '기자 기사'$$, 1);
select pg_temp.reset_user();

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect('기자가 반려 사유 확인', (select reject_reason = '출처를 보강해 주세요' from articles where title = '기자 기사'));
select pg_temp.expect_rows('반려 후 수정해서 다시 승인요청', $$update articles set body = '보강한 본문', status = 'pending' where title = '기자 기사'$$, 1);
select pg_temp.expect('재요청 시 반려 사유 지워짐', (select reject_reason is null from articles where title = '기자 기사'));
select pg_temp.reset_user();

select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect_rows('데스크 승인(게재) + 헤드라인', $$update articles set status = 'published', is_headline = true where title = '기자 기사'$$, 1);
select pg_temp.expect('게재일 자동 기록', (select published_at is not null and is_headline from articles where title = '기자 기사'));
select pg_temp.expect_rows('데스크 예약 게재(내일)', $$insert into articles (title, category, status, published_at) values ('예약 기사', 'news', 'published', now() + interval '1 day')$$, 1);
select pg_temp.reset_user();

select pg_temp.as_user(null);
select pg_temp.expect('비로그인은 게재된 기사만 봄', (select count(*) = 1 and bool_and(title = '기자 기사') from articles));
select pg_temp.expect('예약 기사는 시간 전까지 안 보임', (select count(*) = 0 from articles where title = '예약 기사'));
select public.increment_view(id) from articles where title = '기자 기사';
select public.increment_view(id) from articles where title = '기자 기사';
select pg_temp.expect('조회수 증가', (select views = 2 from article_stats));
select pg_temp.expect('인기 기사 목록', (select count(*) = 1 from popular_articles(7, 30)));
select pg_temp.reset_user();
select public.increment_view(id) from articles where title = '예약 기사';
select pg_temp.expect('예약 기사는 조회수 안 오름', (select count(*) = 1 from article_stats));

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect_rows('기자는 게재된 기사 수정 불가', $$update articles set title = '바꿈' where title = '기자 기사'$$, 0);
select pg_temp.expect_rows('기자는 게재된 기사 삭제 불가', $$delete from articles where title = '기자 기사'$$, 0);
select pg_temp.expect('기자는 남의 기사 처리 기록 못 봄', (select count(*) = 0 from article_history h join articles a on a.id = h.article_id where a.author_id <> auth.uid()));
select pg_temp.expect('기자는 자기 기사 처리 기록 봄', (select count(*) >= 4 from article_history h join articles a on a.id = h.article_id where a.title = '기자 기사'));
select public.update_my_name('김인천');
select pg_temp.expect('이름 변경이 기사 작성자에도 반영', (select author_name = '김인천' from articles where title = '기자 기사'));
select pg_temp.expect_rows('기자는 자기 역할 변경 불가', $$update profiles set role = 'desk' where id = auth.uid()$$, 0);
select pg_temp.expect('기자 역할 그대로', (select role = 'reporter' from profiles where id = auth.uid()));
select pg_temp.expect_rows('기자는 남의 역할도 못 바꿈', $$update profiles set role = 'reporter' where email = 'desk1@example.com'$$, 0);
insert into storage.objects (bucket_id, name) values ('article-images', 'a.jpg');
select pg_temp.expect('구성원은 사진 업로드 가능', true);
select pg_temp.reset_user();

select pg_temp.as_user('00000000-0000-0000-0000-0000000000ff');
select pg_temp.expect_fail('정지 계정은 사진 업로드 불가', $$insert into storage.objects (bucket_id, name) values ('article-images', 'b.jpg')$$);
select pg_temp.as_user(null);
select pg_temp.expect_fail('비로그인은 사진 업로드 불가', $$insert into storage.objects (bucket_id, name) values ('article-images', 'c.jpg')$$);
select pg_temp.reset_user();

-- ---------- 구성원 관리 ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect_fail('데스크도 자기 역할은 못 바꿈', $$update profiles set role = 'reporter' where id = auth.uid()$$);
select pg_temp.expect_fail('데스크도 자기 계정은 못 정지', $$update profiles set status = 'suspended' where id = auth.uid()$$);
select pg_temp.expect_rows('데스크가 다른 데스크를 기자로', $$update profiles set role = 'reporter' where email = 'desk2@example.com'$$, 1);
select pg_temp.expect_rows('데스크가 기자를 데스크로', $$update profiles set role = 'desk' where email = 'rep@example.com'$$, 1);
select pg_temp.expect_rows('데스크가 계정 정지', $$update profiles set status = 'suspended' where email = 'desk2@example.com'$$, 1);
update profiles set email = 'hack@example.com' where email = 'rep@example.com';
select pg_temp.expect('이메일 변경은 무시됨', (select count(*) = 1 from profiles where email = 'rep@example.com'));
select pg_temp.expect('구성원 기록 남음', (select count(*) >= 7 from member_log));
select pg_temp.reset_user();

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select pg_temp.expect_fail('강등·정지된 전 데스크는 게재 불가', $$insert into articles (title, category, status) values ('x', 'news', 'published')$$);
select pg_temp.reset_user();

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect_rows('데스크로 승격된 기자는 게재 가능', $$insert into articles (title, category, status) values ('승격 후 게재', 'news', 'published')$$, 1);
select pg_temp.reset_user();

\echo '----- member_log -----'
select action, target_email, detail from member_log order by id;
\echo '----- article_history (기자 기사) -----'
select h.action, h.from_status, h.to_status, h.note from article_history h join articles a on a.id = h.article_id where a.title = '기자 기사' order by h.id;
