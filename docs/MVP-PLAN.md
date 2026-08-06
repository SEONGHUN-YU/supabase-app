# 모임 이벤트 관리 웹 MVP 기획 (v3)

## 배경

수영·헬스·친구 모임의 주최자는 공지 전달, 참석자 집계, 카풀 조율, 정산까지 혼자 떠안는다. 현실에서 이 일은 카카오톡 단톡방에서 처리되는데, 공지는 대화에 묻히고 참석 여부는 "저요"가 흩어져 세기 어려우며 정산은 주최자가 엑셀을 켜야 한다.

현재 코드베이스는 Next.js 16 + Supabase 스타터 상태다. 인증(구글/이메일), proxy 기반 라우트 보호, shadcn/ui가 완성되어 있고 도메인 테이블은 `profiles` 하나뿐이다. 즉 **인프라는 있고 제품은 없는** 상태에서 시작한다.

### 개정 이력

초안(v1)을 리스크 분석으로 검증해 23개 문제를 찾았고, 그 결과 두 번의 방향 전환이 있었다.

**1차 전환 (v2)** — 리스크 R1·R2 대응

- v1의 1차 범위(공지 + 참석 집계)는 **카카오톡 투표 기능 대비 우위가 전혀 없었다.** 마찰·집계·마감·비용 전 항목에서 카톡이 같거나 나아, 가설 검증이 성공해도 제품 생존 근거가 되지 못했다 → **정산을 1차 범위로 편입**
- 참여자가 비로그인이라 **도달 수단이 0**이었다. 공지를 올려도 아무도 못 보고 주최자는 결국 단톡방에 다시 글을 쓴다 → **카톡 공유 텍스트 생성**으로 전환

**2차 전환 (v3, 현재)** — 비로그인 참여 폐기

- 참여자도 **로그인 필수**로 변경. 이것이 아키텍처의 가장 큰 난제였던 RLS 충돌을 제거한다

### v3에서 사라진 것 (아키텍처 단순화)

로그인 필수화로 v1·v2의 "핵심 난제"였던 **RLS와 비로그인 참여의 구조적 충돌이 해소**된다.

| 없어짐                                           | 이유                           |
| ------------------------------------------------ | ------------------------------ |
| `lib/supabase/admin.ts` + `SUPABASE_SECRET_KEY`  | `service_role`이 불필요        |
| "모든 공개 Server Action 첫 줄에 토큰 검증" 규율 | RLS가 `auth.uid()`로 정상 작동 |
| 3단 폴백 본인 식별 (R5)                          | 계정이 곧 신원                 |
| 단일 쿠키 LRU 관리 (R4)                          | 세션 쿠키 하나                 |
| 중복 응답 병합 (R15)                             | `unique(event_id, user_id)`    |

`service_role`은 RLS를 통째로 우회하므로 검증 한 줄만 빠뜨려도 전체 데이터가 노출되는 설계였다. **그 시한폭탄이 제거된다.** 봇 스팸(R6)도 로그인 장벽으로 대부분 막힌다.

### v3에서 새로 생긴 치명적 리스크

**N1 — 카카오톡 인앱 브라우저에서 구글 OAuth가 차단된다.** Google은 embedded WebView에서 오는 OAuth 요청을 `disallowed_useragent`로 거부하는데, 카톡 인앱 브라우저가 정확히 그 WebView다. 링크가 카톡으로 유통되는 것이 이 제품의 전제이므로, 구글 로그인만 두면 **참여자 대다수가 로그인 자체를 못 해 제품이 동작하지 않는다.**

→ **카카오 로그인을 도입**한다. Supabase 공식 프로바이더(`provider: 'kakao'`)이고, 카톡 인앱 브라우저에서는 이미 로그인된 계정으로 탭 한 번에 인증된다.

### 확정된 결정

| 항목        | 결정                                              |
| ----------- | ------------------------------------------------- |
| 1차 범위    | 공지 + 참여자 관리 + **정산**                     |
| 참여 방식   | **전원 로그인 필수**                              |
| 로그인 수단 | **카카오 + 구글** (카카오가 모바일 주 경로)       |
| 초대 페이지 | **이벤트 정보만 비로그인 공개**, 응답은 로그인 후 |
| 알림        | 카톡 공유 텍스트 생성 (발송 인프라 없음)          |
| 명단 공개   | 이름 공개(주최자가 토글), `note`는 주최자 전용    |
| 데이터 구조 | 이벤트 단건 중심 (그룹 계층 없음)                 |
| 검증 범위   | 지인 모임 우선 → 경량 개인정보 대응               |

---

## 1. 포지션과 지표

> **카카오톡을 대체하지 않는다. 카톡에서 하는 일을 쉽게 만든다.**

이 한 줄이 R1과 R2의 공통 해답이다. 참여자를 우리 쪽으로 끌어오려 애쓰지 않고, 주최자에게 **카톡에 붙여넣을 것**을 만들어 준다. 알림 인프라가 필요 없어지고 포지션도 선명해진다.

### 가설

> 주최자는 참석 집계보다 **정산에서 더 아프다.** 참석자 데이터가 이미 있으면 정산은 버튼 몇 번으로 끝나고, 이 조합은 카톡 투표가 흉내 낼 수 없다. 참여자에게 로그인을 요구하는 마찰은 이 가치가 상쇄한다.

### 지표 (로그인 필수 구조에 맞춰 재조정)

v2의 "RSVP 응답률 60%"는 로그인 장벽이 생긴 지금 비현실적이다. 신규/재방문을 분리해 측정한다.

| 지표                                             | 목표 | 비고                                                 |
| ------------------------------------------------ | ---- | ---------------------------------------------------- |
| **주최자 재사용률** (첫 이벤트 후 14일 내 2번째) | 40%  | **주 지표**                                          |
| **재방문 참여자 응답률** (세션 보유자)           | 75%  | 마찰이 0인 구간. 여기가 낮으면 제품 가치 자체가 문제 |
| 신규 참여자 전환율 (열람 → 로그인 → 응답)        | 35%  | 로그인 장벽의 실제 비용 측정                         |
| 정산 완료율 (생성 → 전원 입금 체크)              | 70%  | 정산이 끝까지 쓰이는가                               |
| 이벤트 생성 소요 시간                            | 60초 | 카톡 투표보다 빨라야 함                              |

**판정 조건 (R21)**: 이벤트 10건 · 봇 제외 열람 100건 이전에는 판단하지 않는다. 모임 빈도상 최소 한 달이 걸린다 (R23).

**신규 전환율이 20% 미만이면** 로그인 필수 결정을 재검토한다. 이 숫자가 로그인 장벽의 비용을 직접 말해 준다.

## 2. 범위

### 포함

**이벤트 · 참여자**

- 이벤트 생성 (제목, 일시, 장소, 안내, 정원, 응답 마감)
- 공개 초대 링크 → **비로그인은 이벤트 정보까지, 응답하려면 로그인**
- RSVP (참석·불참·미정 / 동반 인원 / 한마디)
- 주최자 현황판, 참여자 수동 추가·수정·삭제 (계정 없는 사람 대리 등록)
- 이벤트 복제, 마감/취소 전환

**공지 · 공유 (R2)**

- 공지 누적 → 초대 페이지 상단 표시
- **카톡 공유 텍스트 자동 생성 + 복사** — 이벤트 생성 / 공지 추가 / 정산 요청 3종

**정산 (R1)**

- 총액 입력 → 참석자 N빵 (불참자 제외, 나머지 금액은 주최자 귀속)
- 계좌 정보 등록 + 복사
- 입금 체크 → 미입금자 수·금액 실시간
- 참여자는 초대 페이지에서 본인 몫·입금 여부 확인

### 명시적 제외 (근거 포함)

| 제외 항목              | 근거                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| **카풀 매칭**          | 수요 폭이 좁고(원정 모임 한정) 좌석 배정·경로·유류비까지 붙으면 나머지 전부를 합친 것보다 복잡     |
| **알림톡·이메일 발송** | 카톡 공유 텍스트로 대체. 이메일은 한국에서 열람률이 낮아 **카톡 공유보다 도달이 나쁠 가능성**이 큼 |
| **결제·송금 연동**     | 계좌 복사로 90% 해결. 딥링크 규격 대응 비용이 큼                                                   |
| **그룹/정기모임 계층** | "복제하기" 버튼으로 반복 일정 커버                                                                 |
| **댓글·채팅**          | 단톡방이 이미 잘 하는 일. 경쟁하지 않음                                                            |
| **웹 푸시**            | iOS는 홈 화면 추가가 필요해 참여자에게 요구할 수 없음                                              |

## 3. 사용자 흐름

### 주최자

```
카카오/구글 로그인 → 대시보드 → [새 이벤트] → 폼 작성
  → 생성 완료 화면에서 카톡 공유 텍스트 복사 → 단톡방에 붙여넣기
  → 현황판에서 집계 확인 → 필요 시 공지 추가(+공유 텍스트)
  → 마감 → 정산 생성 → 입금 체크
```

### 참여자

```
[신규] 단톡방 링크 클릭 → 이벤트 정보 확인(로그인 없이)
  → [응답하기] → 카카오 로그인 → 원래 이벤트로 복귀
  → 참석/불참/미정 + 동반 인원 + 한마디 → 완료
[재방문] 링크 클릭 → 세션 유지 → 기존 응답이 수정 모드로 바로 표시
```

## 4. 화면 목록

| 경로                  | 인증          | 설명                                        |
| --------------------- | ------------- | ------------------------------------------- |
| `/`                   | 공개          | 랜딩. 기존 `app/page.tsx` 히어로 교체       |
| `/dashboard`          | 필요          | 내 이벤트 (주최 / 참여 탭)                  |
| `/events/new`         | 필요          | 이벤트 생성 폼                              |
| `/events/[id]/manage` | 필요(주최자)  | 현황판 + 공지 + 공유 텍스트 + 정산          |
| `/e/[token]`          | **부분 공개** | 이벤트 정보는 누구나, 응답·명단은 로그인 후 |
| `/privacy`            | 공개          | 개인정보 처리 안내 (R9)                     |

**모바일 우선 (R20)**: 참여자 트래픽은 사실상 100% 모바일이고 대부분 카톡 인앱 브라우저다. `/e/[token]`은 모바일 레이아웃을 먼저 만들고 데스크톱을 나중에 맞춘다.

## 5. 데이터 모델

`apply_migration`으로 적용한다 (`execute_sql` 아님 — CLAUDE.md 규칙). 변경 전 `list_tables`로 현재 구조를 확인한다.

기존 `public.profiles`(`full_name`, `avatar_url`, `auth.users`와 1:1)를 **그대로 재사용**한다. 참여자 표시 이름은 여기서 가져온다.

```sql
create table public.events (
  id            uuid primary key default gen_random_uuid(),
  host_id       uuid not null references auth.users(id) on delete cascade,
  public_token  text not null unique,              -- base62 12자
  title         text not null,
  description   text,
  starts_at     timestamptz not null,
  location      text,
  location_url  text,
  capacity      int,                               -- null=무제한, 동반 인원 포함 (R14)
  rsvp_deadline timestamptz,
  status        text not null default 'open'
                check (status in ('open','closed','cancelled')),   -- R11
  show_names    boolean not null default true,     -- R10
  created_at    timestamptz not null default now()
);

create table public.participants (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,   -- 주최자 대리 등록 시 null
  display_name text check (char_length(display_name) between 1 and 20),
                                                   -- null이면 profiles.full_name 사용
  status       text not null check (status in ('going','not_going','maybe')),
  guest_count  int  not null default 0 check (guest_count between 0 and 10),
  note         text check (char_length(note) <= 200),   -- 주최자에게만 노출 (R10)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (event_id, user_id)                       -- R15: 중복 응답 원천 차단
);

create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  body       text not null check (char_length(body) <= 1000),
  created_at timestamptz not null default now()
);

create table public.event_views (                  -- R3: 지표 측정
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  session_hash text not null,                      -- IP+UA 해시. 원본 IP 미저장 (R9)
  created_at   timestamptz not null default now()
);
create unique index on public.event_views (event_id, session_hash);

create table public.settlements (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  title        text not null,
  total_amount int not null check (total_amount >= 0),
  account_info text,                 -- "카카오뱅크 3333-01-1234567 홍길동"
  created_at   timestamptz not null default now()
);

create table public.settlement_shares (
  id             uuid primary key default gen_random_uuid(),
  settlement_id  uuid not null references public.settlements(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  amount         int not null,
  paid           boolean not null default false,
  paid_at        timestamptz,
  unique (settlement_id, participant_id)
);

create index on public.participants (event_id);
create index on public.announcements (event_id);
create index on public.event_views (event_id);
create index on public.events (host_id, starts_at desc);

create or replace function public.touch_updated_at()      -- R12
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger participants_touch before update on public.participants
for each row execute function public.touch_updated_at();
```

`unique (event_id, user_id)`는 Postgres에서 `user_id`가 null인 행끼리는 충돌하지 않으므로, 주최자가 계정 없는 사람을 여러 명 대리 등록하는 것을 막지 않는다.

## 6. 보안 설계

### 남은 하나의 예외 — 비로그인 미리보기

로그인 필수로 RLS 충돌은 사라졌지만, **"이벤트 정보만 비로그인 공개"** 결정 때문에 익명 읽기 경로가 하나 남는다. 여기서 `events`에 anon SELECT 정책을 주면 `USING (true)`가 되어 v1과 똑같은 구멍이 생긴다 — RLS는 클라이언트가 보낸 `where public_token = ...` 조건을 볼 수 없고 행 단위로만 판단하기 때문이다.

**`SECURITY DEFINER` 함수로 푼다.** anon에게 테이블 권한은 일절 주지 않고, 함수 하나만 실행 가능하게 한다.

```sql
-- 비로그인 미리보기: 반환 필드가 고정이라 과다 노출이 불가능하다
-- Task 008에서 description/location_url/capacity/rsvp_deadline/show_names 추가
-- (마이그레이션 005, 008). 전부 "이벤트 정보" 범주라 위 확정된 결정에 부합하고,
-- note 등 참여자 개인정보는 여전히 미노출이다.
create or replace function public.get_event_preview(p_token text)
returns table (title text, starts_at timestamptz, location text,
               location_url text, description text, capacity int,
               rsvp_deadline timestamptz, show_names boolean, status text,
               going_count int)
language sql security definer set search_path = public as $$
  select e.title, e.starts_at, e.location, e.location_url, e.description,
         e.capacity, e.rsvp_deadline, e.show_names, e.status,
         (select coalesce(sum(1 + p.guest_count), 0)::int
            from participants p
           where p.event_id = e.id and p.status = 'going')
    from events e where e.public_token = p_token;
$$;

revoke all on function public.get_event_preview(text) from public, anon, authenticated;
grant execute on function public.get_event_preview(text) to anon, authenticated;
```

토큰 검증이 **함수 안에** 있으므로 v1처럼 "모든 Server Action 첫 줄에서 검증"을 사람이 지킬 필요가 없다. 규율이 아니라 구조로 강제된다.

### 비로그인 공지 열람 (Task 008 추가)

`announcements` 테이블에는 `announcements_host`(호스트 전용) 정책만 있어 초대 페이지가 공지를 표시할 방법이 없었다. 공지는 호스트가 전원에게 보이려고 쓰는 글이라 참여자 개인정보와 무관하므로, `get_event_preview`와 같은 위협 모델로 별도 함수를 추가했다.

```sql
create or replace function public.get_event_announcements(p_token text)
returns table (id uuid, body text, created_at timestamptz)
language sql security definer set search_path = public as $$
  select a.id, a.body, a.created_at
    from announcements a
    join events e on e.id = a.event_id
   where e.public_token = p_token
   order by a.created_at desc;
$$;

revoke all on function public.get_event_announcements(text) from public, anon, authenticated;
grant execute on function public.get_event_announcements(text) to anon, authenticated;
```

### 참여 흐름 — 토큰에서 멤버십으로

로그인 사용자도 아직 참여하지 않았다면 `events`를 읽을 권한이 없다. 참여 자체를 RPC로 처리해 **토큰 → 참여 → 멤버십** 순서를 만든다.

```sql
create or replace function public.join_event(
  p_token text, p_status text, p_guest_count int default 0, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_event events; v_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  select * into v_event from events where public_token = p_token;
  if not found then raise exception '이벤트를 찾을 수 없습니다'; end if;
  if v_event.status <> 'open' then raise exception '마감된 모임입니다'; end if;      -- R16
  if v_event.rsvp_deadline is not null and now() > v_event.rsvp_deadline then
    raise exception '응답 기한이 지났습니다'; end if;
  if (select count(*) from participants where event_id = v_event.id) >= 500 then
    raise exception '참여 인원 상한을 초과했습니다'; end if;                          -- R6

  insert into participants (event_id, user_id, status, guest_count, note)
  values (v_event.id, auth.uid(), p_status, p_guest_count, p_note)
  on conflict (event_id, user_id)
  do update set status = excluded.status, guest_count = excluded.guest_count,
                note = excluded.note
  returning id into v_id;
  return v_id;
end $$;
```

`on conflict do update` 덕분에 **최초 응답과 수정이 같은 경로**를 탄다.

### RLS 정책

```sql
-- events: 주최자이거나 이미 참여한 사람만
create policy events_select on events for select to authenticated
using (host_id = auth.uid()
       or exists (select 1 from participants p
                   where p.event_id = events.id and p.user_id = auth.uid()));

create policy events_write on events for all to authenticated
using (host_id = auth.uid()) with check (host_id = auth.uid());

-- participants: 직접 조회는 주최자만 (note 보호)
create policy participants_host on participants for all to authenticated
using (exists (select 1 from events e
                where e.id = participants.event_id and e.host_id = auth.uid()));

-- 본인 응답은 본인이 조회·수정
create policy participants_self on participants for select to authenticated
using (user_id = auth.uid());
```

### `note` 컬럼 보호 (R10)

RLS는 행 단위라 **컬럼 단위 제어를 못 한다.** 위 정책에서 일반 참여자는 `participants`를 직접 읽지 못하게 막고, 멤버용 명단은 전용 함수로만 제공한다.

```sql
create or replace function public.get_event_participants(p_event_id uuid)
returns table (display_name text, status text, guest_count int)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from participants
                  where event_id = p_event_id and user_id = auth.uid())
     and not exists (select 1 from events
                      where id = p_event_id and host_id = auth.uid())
  then raise exception '접근 권한이 없습니다'; end if;

  return query
    select coalesce(p.display_name, pr.full_name, '이름 없음'), p.status, p.guest_count
      from participants p left join profiles pr on pr.id = p.user_id
     where p.event_id = p_event_id
       and (select show_names from events where id = p_event_id);
end $$;
```

`note`가 반환 목록에 아예 없으므로 실수로 노출될 수 없다.

### 호스트 참여자 이름 해석 (Task 008 추가)

`participants_host` RLS로 호스트는 `note`를 포함한 참여자 원본 행을 직접 읽을 수 있지만, `profiles` 테이블은 "본인 프로필 조회" 정책(`auth.uid() = id`)이라 타인의 `full_name`을 읽지 못한다. `get_event_participants`는 `note`를 의도적으로 반환하지 않으므로(R10) 이 용도로 재사용할 수 없다. 이름 해석만 하는 별도 함수로 좁혔다.

```sql
create or replace function public.get_host_participant_names(p_event_id uuid)
returns table (user_id uuid, full_name text)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from events
                  where id = p_event_id and host_id = auth.uid())
  then raise exception '접근 권한이 없습니다'; end if;

  return query
    select p.user_id, pr.full_name
      from participants p
      join profiles pr on pr.id = p.user_id
     where p.event_id = p_event_id and p.user_id is not null;
end $$;

revoke all on function public.get_host_participant_names(uuid) from public, anon;
grant execute on function public.get_host_participant_names(uuid) to authenticated;
```

### 그 외

- **R6 쓰기 남용**: 로그인 장벽 + `join_event` 내 인원 상한 + DB `check` 길이 제약. 애플리케이션 검증을 우회당해도 DB가 막는다
- **R18 XSS**: `location_url`을 `<a href>`에 넣기 전 `http:`/`https:` 스킴만 허용. `javascript:` 스킴이 실행되면 모든 참여자에게 렌더된다
- **R9 개인정보**: 로그인 시 정식 동의 절차가 생겨 v1보다 명확해진다. `/privacy` 페이지 + `event_views`에 원본 IP 대신 해시 저장
- 배포 전 `get_advisors`로 RLS·`SECURITY DEFINER` 관련 경고를 반드시 확인한다

## 7. 기술 주의사항

### 카카오 로그인 (N1)

기존 `components/google-auth-button.tsx`를 복제해 `provider: 'kakao'`로 바꾼다. 그 파일의 `next` prop이 `app/auth/callback/route.ts:33-37`의 오픈 리다이렉트 방어와 이미 연결되어 있으므로, **`next="/e/<token>"`만 넘기면 로그인 후 원래 초대 페이지로 복귀하는 흐름이 그대로 동작**한다. 신규 로직이 거의 없다.

- Supabase 대시보드에 Kakao provider 활성화 + Redirect URL 등록
- 카카오 개발자 콘솔에 앱 등록
- 모바일에서는 카카오를 **위에**, 구글을 아래에 배치

**비즈 앱 전환은 필수다.** 초안의 "반나절 소요"에는 내역이 없었고, 한때 "이메일을 안 받으면 전환도 불필요"로 정정했으나 **그 판단이 틀렸다.** 실측으로 확정된 사실은 다음과 같다.

Supabase(GoTrue)의 Kakao provider는 scope를 **`account_email profile_image profile_nickname`으로 하드코딩**해 요청한다. `signInWithOAuth`에 `scopes`를 넘겨도 교체되지 않고 **뒤에 덧붙기만 한다** (`?scopes=profile_nickname`을 넘기면 `... profile_nickname profile_nickname`이 된다). 즉 요청 scope는 카카오 콘솔·Supabase 대시보드·앱 코드 **어디에서도 줄일 수 없다.**

그리고 카카오는 설정되지 않은 동의항목이 요청에 섞이면 무시하지 않고 **거부한다**:

> 잘못된 요청 (KOE205) — 설정하지 않은 카카오 로그인 동의 항목을 포함해 인가 코드를 요청했습니다.
> 설정하지 않은 동의 항목: account_email

Supabase 문서의 _"you can omit `account_email` and enable Allow users without an email"_ 안내는 이 조합에서 성립하지 않는다. 그 문장을 실측 없이 믿었던 것이 오판의 원인이다.

따라서 **동의항목은 `profile_nickname`·`profile_image`·`account_email` 세 개를 모두 설정해야 하고, `account_email`은 비즈 앱에서만 켤 수 있으므로 비즈 앱 전환이 전제된다.** 전환은 완료했다.

`account_email`은 가능하면 **필수 동의**로 둔다. 선택 동의로 두면 거부한 사용자에게 이메일이 없어 N4 계정 분리가 그 사용자에 한해 되살아난다.

카카오 콘솔의 Redirect URI에는 **Supabase 콜백(`https://<project-ref>.supabase.co/auth/v1/callback`)만** 넣는다. 최종 복귀 주소는 `redirectTo`로 넘어가고 그 값을 검사하는 쪽은 Supabase이므로, 터널·프로덕션 도메인은 **Supabase의 Redirect URLs 허용 목록**에 등록한다. 사이트 도메인(웹 플랫폼)은 카카오 JS SDK용이라 이 흐름과 무관하다.

**이메일을 수집하게 되므로 개인정보 처리방침(F015)의 수집 항목에 이메일을 명시해야 한다.**

### `cacheComponents`와 인증 (R7)

`next.config.ts`에 `cacheComponents: true`가 켜져 있어 PPR이 활성 상태다. **동적 데이터를 읽는 컴포넌트는 반드시 `<Suspense>` 안에 있어야 하고, 아니면 빌드가 실패한다.**

`cookies()`나 세션을 읽으면 그 요청은 동적이 되어 캐시되지 않는다. `/e/[token]`은 트래픽이 가장 몰리는 페이지이므로, **`get_event_preview` 기반 정적 셸과 세션 의존 영역(응답 폼·명단)을 분리하고 후자만 Suspense 경계 안에 둔다.**

- `/dashboard`, `/events/[id]/manage`: 목록 페칭 부분을 Suspense로 분리
- 기존 참고 패턴: `app/instruments/page.tsx`, `app/protected/layout.tsx`

### 타임존 (R8)

서버는 UTC, 사용자는 KST다. 각자 포맷하면 문자열이 달라져 하이드레이션 에러가 나거나 시간이 깜빡인다. `timestamptz`를 써도 표시 계층에서 터진다. **모임 시간이 9시간 틀리게 보이면 그 모임은 다시 오지 않는다.**

`lib/date.ts`에 `Asia/Seoul` 고정 포맷터를 만들고 **모든 날짜 출력을 여기로만 통과**시킨다. 입력 폼에도 KST 기준임을 표기한다.

### proxy 수정

`lib/supabase/proxy.ts:50-60`이 `/`와 `/auth/*` 외 전 경로에 로그인을 요구한다. `/e/`와 `/privacy`를 예외에 추가한다 (미리보기가 비로그인으로 열려야 함).

```ts
// 기존 조건에 추가
!request.nextUrl.pathname.startsWith('/e/') &&
	!request.nextUrl.pathname.startsWith('/privacy');
```

**주의**: 이 파일은 `createServerClient()`와 `getClaims()` 사이에 코드를 넣으면 안 되고, 새 `NextResponse`를 만들면 쿠키를 복사해야 한다. 어기면 사용자가 무작위로 로그아웃되는 추적 난이도 최상의 버그가 생긴다 (파일 내 주석·CLAUDE.md에 명시).

### Supabase 클라이언트

컨텍스트별로 구분해서 쓴다 — 서버는 `lib/supabase/server.ts`의 `await createClient()`, 클라이언트 컴포넌트는 `lib/supabase/client.ts`의 `createClient()`. **모듈 최상위 변수에 담지 않는다** (Fluid compute에서 요청 간 오염). **`admin.ts`는 만들지 않는다.**

## 8. 개발 단계 (총 7.5일)

### Phase 0 — 기반 (1일)

- 스타터 잔재 제거: `app/instruments/`, `components/hero.tsx`, `components/deploy-button.tsx`, `components/tutorial/`
- 스키마 + RLS 정책 + 3개 RPC 함수 + `touch_updated_at` 트리거 마이그레이션
- **카카오 로그인** (`kakao-auth-button.tsx`, Supabase·카카오 콘솔 설정)
- `lib/date.ts` KST 포맷터 (R8), `proxy.ts` 예외, `/privacy`
- **완료 조건**: `npm run build` 통과 + 로그아웃 상태에서 `/e/test`가 리다이렉트되지 않음 + `get_advisors` 경고 없음

### Phase 1 — 핵심 루프 (2.5일)

- `/events/new` 생성 폼 + `public_token` 생성 (base62 12자)
- `/e/[token]`: `get_event_preview` 정적 셸 + 로그인 유도 + `join_event` 응답 폼 (R7 분리 구조)
- `event_views` 기록 + 봇 UA 제외 (R3) — `kakaotalk-scrap`, `facebookexternalhit`, `Twitterbot`, `Slackbot`
- 링크 복사 UI, `/dashboard` (주최 / 참여 탭)
- **완료 조건**: **실제 안드로이드·iOS 카톡 인앱 브라우저**에서 링크 → 카카오 로그인 → 응답 → 복귀가 끊김 없이 동작. N1의 유일한 검증법이며 데스크톱으로 대체할 수 없다

### Phase 2 — 주최자 도구 + 카톡 공유 (2일)

- `/events/[id]/manage` 현황판 (상태별 그룹, 동반 포함 합계, 정원 대비)
- 참여자 수동 추가·수정·삭제 (계정 없는 사람 대리 등록)
- 공지 추가 → 초대 페이지 누적 표시
- **카톡 공유 텍스트 생성 + 복사 (R2)**

```
[공지] 8/15 한강 수영
⚠️ 장소가 잠원지구로 변경됐습니다.
현재 12명 참석 예정 (정원 15명)
👉 아직 응답 안 하신 분: https://.../e/a1b2c3
```

- `show_names` 토글 (R10), 마감/취소 전환 (R16·R17), 이벤트 복제 (정기모임 대응)
- **완료 조건**: 타인 이벤트의 `/events/[id]/manage` 접근 차단

### Phase 3 — 정산 (2일) ★ 1차 출시 범위

- 총액 입력 → 참석자(`going`) N빵, 1원 단위 나머지는 주최자 귀속
- 계좌 정보 등록 + 복사, 입금 체크 → 미입금자 수·금액 실시간
- 정산 요청 카톡 텍스트, 참여자 본인 몫 확인
- **완료 조건**: 참석자 5명 이벤트로 정산 생성 → 전원 입금 체크 완주

## 9. 전체 검증 방법

```bash
npm run build      # 타입 에러 + PPR Suspense 위반까지 잡힘. 최종 검증용
npm run format     # lint 에러 대부분이 포맷 문제이므로 먼저 실행
npm run lint
npx tsc --noEmit   # 타입만 빠르게 확인
```

테스트 프레임워크가 설치되어 있지 않으므로 자동화 테스트는 없다. Playwright MCP로 아래 시나리오를 확인한다.

1. 주최자 로그인 → 이벤트 생성 → 링크 복사
2. **시크릿 창**에서 링크 접속 → 제목·일시·장소·인원수가 **로그인 없이** 보임
3. 응답 시도 → 로그인 유도 → 로그인 후 **원래 이벤트로 복귀**
4. 응답 저장 → 재접속 시 기존 응답이 수정 모드로 표시
5. 주최자 현황판 집계 → 공지 추가 → 공유 텍스트에 최신 인원 반영
6. 정산 생성 → N빵 금액 검산 → 입금 체크 → 참여자 화면 반영
7. **보안**: 참여하지 않은 계정으로 `/e/<token>` 접근 시 명단이 안 보임 / 타인 `manage` 차단 / `note`가 일반 참여자에게 노출되지 않음
8. **XSS**: `location_url`에 `javascript:alert(1)` 입력 시 거부 (R18)
9. **실기기**: 안드로이드·iOS 카톡 인앱 브라우저에서 카카오 로그인 완주 (N1) — Playwright로 대체 불가
   - **HTTPS 공개 URL이 선행 조건이다.** 카톡 인앱 브라우저는 `localhost`에 접근할 수 없다. 배포(Phase 4) 전에는 `cloudflared tunnel --url http://localhost:3000` 같은 임시 터널로 주소를 확보하고, 그 주소를 Supabase Redirect URLs 허용 목록에 등록한다
   - 터널 URL을 **카톡으로 자신에게 보내 인앱 브라우저에서 연다.** 외부 브라우저로 열면 검증이 성립하지 않는다

DB 상태는 `list_tables`, `execute_sql`(조회용)로 확인하고, 스키마 변경은 `apply_migration`으로만 수행한다. 배포 전 `get_advisors`로 RLS 누락 경고를 반드시 확인한다.

## 10. 남은 리스크

| #      | 리스크                                          | 대응                                                                                                                                   |
| ------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **N1** | 카톡 인앱 브라우저 구글 OAuth 차단              | 카카오 로그인 도입. Phase 1 실기기 검증 필수                                                                                           |
| **N2** | 로그인 마찰로 신규 참여 이탈                    | 이벤트 정보 선공개로 완화. 신규 전환율 20% 미만이면 결정 재검토                                                                        |
| **N3** | R1 악화 — 카톡 투표와 마찰 격차 확대            | 정산이 유일한 방어선. 1차 편입 결정이 더 중요해짐                                                                                      |
| **N4** | 구글·카카오 계정 분리                           | **잔존.** 이메일을 수집하게 됐지만 자동 연결은 두 수단의 이메일이 **같을 때만** 일어난다. 한국에서는 다른 경우가 일반적이다. 아래 상세 |
| R13    | 정원 동시성 — 동시 응답 시 초과 가능            | **정원은 표시용으로 정의.** 하드 제한은 트랜잭션 비용 대비 실익 없음                                                                   |
| R19    | Supabase 무료 플랜 **1주일 미사용 시 일시정지** | 검증 중 DB가 자고 있으면 첫인상을 잃고 지표도 오염된다. 검증 시작 전 유료 전환 또는 keep-alive cron 결정                               |
| R22    | 초기 사용자 확보                                | 본인이 주최하는 실제 모임에 직접 사용                                                                                                  |
| R23    | 낮은 모임 빈도 → 긴 검증 주기                   | 최소 한 달 확보                                                                                                                        |
| —      | 카카오 계정 미보유자                            | 구글 병행으로 커버                                                                                                                     |
| —      | 링크 무단 확산                                  | MVP는 감수. `show_names` 토글이 1차 완충. 실제 문제화되면 이벤트 잠금 추가                                                             |

### N4 — 구글·카카오 계정 분리

Supabase 문서:

> Supabase Auth automatically links identities with **the same email address** to a single user.

**연결 조건은 "이메일이 있는 것"이 아니라 "이메일이 같은 것"이다.** 비즈 앱 전환으로 이메일 수집 자체는 해결됐지만, 그것이 곧 계정 통합을 뜻하지는 않는다. 한때 이 문서에 "N4 해소"라고 적었던 것은 두 조건을 혼동한 오판이다.

**한국에서는 두 이메일이 다른 것이 일반적이다.** 카카오 계정은 네이버·한메일 등으로, 구글 계정은 gmail로 만드는 경우가 흔하다. 실제로 이 프로젝트의 첫 테스트 계정도 카카오는 `naver.com`이고 구글은 다른 주소여서 **연결이 성립하지 않는다.**

**증상**: 주최자가 데스크톱에서 구글로 로그인해 이벤트를 만든다. 나중에 단톡방에서 자기 링크를 열면 카톡 인앱 브라우저이므로 카카오로 로그인한다. 두 이메일이 다르면 **별개 사용자**가 되어, 자기가 만든 이벤트가 대시보드에서 사라진다. 버그로 오인하기 쉽다.

**MVP 대응**: 감수한다. 참여자는 링크로 진입해 한 기기·한 수단만 쓰므로 영향이 거의 없고, 주최자도 수단을 하나로 고정하면 문제가 없다. 로그인 페이지에 _"가입할 때 쓴 수단으로 로그인해 주세요"_ 안내를 **유지한다.**

**부분 완화**: 두 이메일이 우연히 같은 사용자에게는 자동 연결이 동작한다. `account_email`을 필수 동의로 두었고 카카오가 `email_verified: true`로 넘겨주는 것을 확인했으므로, 조건이 맞는 경우의 전제는 갖춰져 있다. **다만 실측하지 못했다** — 아래 참조.

**미검증 (이연)**: 자동 연결의 실동작은 확인하지 못했다. 같은 이메일을 쓰는 구글 계정이 없어 테스트를 만들 수 없었다. 검증하려면 카카오 계정과 **동일한 이메일**로 가입된 구글 계정이 필요하고, 로그인 후 `auth.identities`에서 두 provider 행이 같은 `user_id`로 묶이는지 보면 된다. 우선순위는 낮다 — 어차피 대부분의 사용자에게는 이메일이 달라 해당되지 않기 때문이다.

**완화 경로 (필요해지면)**: Supabase의 **manual linking**(`linkIdentity()`, beta)은 로그인 상태에서 **이메일이 달라도** 다른 provider를 연결할 수 있다. 이것이 N4의 진짜 해법이며, 계정 분리가 실제 문제로 드러나면 이걸로 푼다. 대시보드에서 활성화가 필요하다.

**재검토 조건**: 주최자가 "만든 이벤트가 안 보인다"고 보고하면 즉시. 그때는 manual linking 도입을 검토한다.

## 부록 — 리스크 대응 매핑

| 리스크                     | 상태                                       |
| -------------------------- | ------------------------------------------ |
| R1 차별점 부재             | §1 포지션 + 정산 1차 편입                  |
| R2 알림 부재               | Phase 2 카톡 공유 텍스트                   |
| R3 지표 측정 불가          | §5 `event_views` + 봇 필터                 |
| R4 쿠키 초과               | **해소** — 로그인 세션                     |
| R5 인앱 브라우저 쿠키 유실 | **해소** — 계정 기반. 단 N1으로 대체됨     |
| R6 무인증 쓰기             | **대폭 완화** — 로그인 + `join_event` 상한 |
| R7 PPR 무력화              | §7 정적 셸 분리                            |
| R8 타임존                  | §7 `lib/date.ts`                           |
| R9 개인정보                | §6 정식 동의 + `/privacy` + IP 해시        |
| R10 명단 공개              | §6 `get_event_participants` (note 미반환)  |
| R11 status 제약            | §5 `check`                                 |
| R12 updated_at             | §5 트리거                                  |
| R13 정원 동시성            | §10 표시용 정의                            |
| R14 capacity·guest 관계    | §5 (동반 포함)                             |
| R15 중복 응답              | **해소** — `unique(event_id, user_id)`     |
| R16 마감 후 동작           | §6 `join_event` 내 검증                    |
| R17 취소 시 처리           | Phase 2 (보존 + 취소 배너)                 |
| R18 URL XSS                | §6, §9 검증 8                              |
| R19 Supabase pause         | §10                                        |
| R20 모바일 우선            | §4                                         |
| R21 표본 부족              | §1 판정 조건                               |
| R22·R23                    | §10                                        |
| **RLS 근본 충돌**          | **해소** — `service_role` 불필요           |
