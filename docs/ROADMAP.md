# 모임 이벤트 관리 MVP 개발 로드맵

단톡방에서 손으로 세던 참석 인원과 회비를, 링크 하나로 끝낸다.

## 개요

모임 이벤트 관리 MVP는 수영·헬스·친구 모임을 정기적으로 주최하는 사람을 위한 참석 집계·정산 도구로 다음 기능을 제공합니다:

- **참석 응답 집계**: 초대 링크 하나로 참석/불참/미정과 동반 인원을 자동 집계
- **공지와 카톡 공유**: 변경 사항을 누적 공지하고, 현재 현황이 담긴 단톡방용 문구를 자동 생성
- **정산 N빵**: 총액만 입력하면 참석자별 금액을 분배하고 입금 여부까지 추적

## 개발 워크플로우

1. **작업 계획**

- 기존 코드베이스를 학습하고 현재 상태를 파악
- 새로운 작업을 포함하도록 `docs/ROADMAP.md` 업데이트
- 우선순위 작업은 마지막 완료된 작업 다음에 삽입

2. **작업 생성**

- `/tasks` 디렉토리에 새 작업 파일 생성
- 명명 형식: `XXX-description.md` (예: `001-setup.md`)
- 고수준 명세서, 관련 파일, 수락 기준, 구현 단계 포함
- **API/비즈니스 로직 작업 시 "## 테스트 체크리스트" 섹션 필수 포함 (Playwright MCP 테스트 시나리오 작성)**
- 직전 완료 작업을 예시로 참조. 새 작업 파일은 빈 체크박스 상태로 작성

3. **작업 구현**

- 작업 파일의 명세서를 따름
- **API 연동 및 비즈니스 로직 구현 시 Playwright MCP로 테스트 수행 필수** (이 프로젝트에는 테스트 프레임워크가 설치되어 있지 않으므로 Playwright MCP가 유일한 검증 수단)
- 각 단계 후 작업 파일 내 진행 상황 업데이트
- 검증 순서: `npm run format` → `npm run lint` → `npx tsc --noEmit` → `npm run build`
- 각 단계 완료 후 중단하고 추가 지시를 기다림

4. **로드맵 업데이트**

- 로드맵에서 완료된 작업을 ✅로 표시

## 개발 단계

### Phase 1: 애플리케이션 골격 구축

- **Task 001: 라우트 구조 및 공통 레이아웃 구성** ✅ - 우선순위
  - App Router 라우트 골격 생성: `/dashboard`, `/events/new`, `/events/[id]/manage`, `/e/[token]`, `/privacy`
  - 각 페이지를 제목과 자리표시자만 있는 빈 껍데기로 생성 (기능 구현 제외)
  - `lib/supabase/proxy.ts` 인증 예외에 `/e/`, `/privacy` 추가 — 초대 페이지는 비로그인 열람이 전제. 조건문(50-55행)은 `getClaims()` 호출(47행) **이후** 블록이라 "`createServerClient`와 `getClaims` 사이 삽입 금지" 규칙에 저촉되지 않고, 새 `NextResponse`를 만들지 않으므로 쿠키 복사도 불필요하다
  - 스타터 잔재 제거: `app/instruments/`, `app/protected/`, `components/tutorial/`, `components/hero.tsx`, `components/deploy-button.tsx`, `components/next-logo.tsx`, `components/supabase-logo.tsx`
  - **`/protected` 참조 6곳을 `/dashboard`로 재지정** — 제거와 반드시 같은 단계에서 처리한다. 분리하면 중간 상태에서 로그인 후 404가 발생한다
    - `components/google-auth-button.tsx:38` (`next` 기본값), `components/login-form.tsx:43` (`router.push`), `components/sign-up-form.tsx:48` (`emailRedirectTo`), `components/update-password-form.tsx:37` (`router.push`), `app/auth/callback/route.ts:33,37` (`next` 폴백 2곳)
  - 공통 헤더·푸터를 `components/site-header.tsx`·`components/site-footer.tsx`로 **추출**해 `app/layout.tsx`에 한 번만 배치 — 신규 작성이 아니라 중복 제거다. `app/page.tsx:16-54`와 `app/protected/layout.tsx:17-51`이 nav·푸터를 거의 동일하게 복제하고 있어, 신규 라우트 5개에 또 복제하면 7중복이 된다
  - `<Suspense>`는 `SiteHeader` 전체가 아니라 **`AuthButton` 하나만** 감싼다 — `components/auth-button.tsx`가 `getClaims()`를 호출하는 async 서버 컴포넌트라 경계가 필요하지만, 헤더 전체를 감싸면 정적 셸 범위가 좁아져 Task 006(초대 페이지 캐시)의 이점을 미리 깎아먹는다. `app/page.tsx:27-29`가 이미 올바른 형태다
  - `app/layout.tsx` 제품화: `lang="en"`(28행) → `lang="ko"`, `metadata.title`(12행)을 제품명으로 교체. `metadataBase`의 `VERCEL_URL` 분기(6-8행)는 배포에 필요하므로 유지
  - **`lib/utils.ts`의 `hasEnvVars`를 제거하지 말 것** — 8행 주석이 "튜토리얼용이라 제거 가능"이라고 하지만, `lib/supabase/proxy.ts:12-14`가 이 값으로 인증 검사를 통째로 건너뛴다. 지우면 환경 변수 미설정 시 모든 경로가 로그인으로 튕겨 개발이 막힌다
  - `CLAUDE.md`의 PPR 참조 경로 갱신 — 예시로 지목된 `app/instruments/page.tsx`와 `app/protected/layout.tsx`가 모두 사라지므로 `app/layout.tsx`의 Suspense 예시로 교체
  - 완료 조건: `npm run build` 통과 + 로그아웃 상태에서 `/e/test` 접속 시 로그인 페이지로 리디렉션되지 않음 + `/dashboard` 접속 시 리디렉션됨

- **Task 002: 타입 정의 및 데이터 모델 설계** ✅
  - **`npm install zod`부터 시작** — 현재 미설치 상태다(`npm ls zod` 결과 비어 있음). PRD 기술 스택의 "신규 도입 필요" 표기가 사실이며, 빠뜨리면 첫 줄부터 컴파일되지 않는다
  - PRD 데이터 모델 6개 테이블(`events`, `participants`, `announcements`, `settlements`, `settlement_shares`, `event_views`) 스키마 설계 — 마이그레이션 실행은 Task 007
  - `types/` 디렉터리를 **신규 생성**하고(현재 없음, `lib/`에는 `supabase/`와 `utils.ts`뿐) 도메인 인터페이스 정의. `status`·`participant_status`는 리터럴 유니온으로 선언
  - Zod 스키마 작성 (이벤트 생성 / RSVP 응답 / 정산 입력). 숫자 범위와 문자열 길이는 `docs/MVP-PLAN.md`의 DDL `check` 제약과 일치시킨다 — `guest_count` 0-10, `note` 200자, `display_name` 1-20자. 어긋나면 클라이언트는 통과시키고 DB가 거부하는 상태가 된다
  - `lib/date.ts`에 `Asia/Seoul` 고정 포맷터 구현 — 서버는 UTC, 사용자는 KST라 각자 포맷하면 하이드레이션 불일치와 9시간 오차가 발생
  - Phase 2 UI용 더미 데이터 팩토리 작성
  - 완료 조건: `npx tsc --noEmit` 통과

- **Task 003: 카카오 로그인 도입** - 우선순위
  - 배치 근거: 초대 링크가 카카오톡으로 유통되는 것이 이 제품의 전제인데, 구글 OAuth는 인앱 브라우저(embedded WebView)를 `disallowed_useragent`로 차단한다. 카카오 로그인이 없으면 참여자 대다수가 로그인 자체를 못 해 제품이 동작하지 않으므로, 외부 콘솔 설정 리드타임까지 감안해 골격 단계에서 처리한다
  - 카카오 개발자 콘솔 앱 등록 및 키 발급. 콘솔 클릭 작업 자체는 20-30분이지만 **비즈 앱 전환이 선행되어야 한다**(아래)
  - **비즈 앱 전환은 필수다.** Supabase(GoTrue)가 scope를 `account_email profile_image profile_nickname`으로 **하드코딩**해 요청하는데, `signInWithOAuth`의 `scopes`는 이를 교체하지 않고 뒤에 덧붙기만 한다. 요청에서 뺄 방법이 세 곳(카카오 콘솔·Supabase 대시보드·앱 코드) 모두에 없고, 카카오는 미설정 동의항목이 섞이면 **KOE205로 거부**한다. Supabase 문서의 "account_email을 빼고 Allow users without an email을 켜라"는 안내는 이 조합에서 성립하지 않는다 — 실측으로 확인했다
  - **동의항목은 `profile_nickname`·`profile_image`·`account_email` 세 개 모두** 설정한다. `account_email`은 **필수 동의**로 둔다 (설정 완료)
  - **이메일 수집이 곧 계정 통합은 아니다.** Supabase의 자동 연결은 두 provider의 이메일이 **같을 때만** 동작하는데, 한국에서는 카카오=네이버·한메일, 구글=gmail로 다른 경우가 일반적이다. 따라서 N4 계정 분리는 **잔존**하며, 로그인 페이지의 "가입할 때 쓴 수단으로 로그인해 주세요" 안내를 **유지한다**. 진짜 해법은 manual linking(`linkIdentity()`)이며 MVP 범위 밖이다
  - Supabase 대시보드에서 Kakao provider 활성화 + Client ID/Secret 입력. Client Secret은 발급만으로 부족하고 **활성화 상태**여야 한다
  - 카카오 콘솔 Redirect URI에는 **Supabase 콜백(`https://<project-ref>.supabase.co/auth/v1/callback`)만** 넣는다. 최종 복귀 주소는 `redirectTo`로 넘어가고 그 값을 검사하는 쪽은 Supabase이므로, 터널·프로덕션 도메인은 **Supabase의 Redirect URLs 허용 목록**에 등록한다. 사이트 도메인(웹 플랫폼)은 카카오 JS SDK용이라 이 흐름과 무관하다
  - 이메일을 수집하게 되므로 **개인정보 처리방침(F015)의 수집 항목에 이메일을 명시**한다 (Task 012와 연결)
  - **선행 리팩터링: divider를 그룹 레벨로 승격** — `components/google-auth-button.tsx:70-74`가 "Or continue with" 구분선을 컴포넌트 **내부**에 품고 있어, 카카오 버튼을 같은 구조로 복제하면 구분선이 두 번 렌더된다. `components/social-auth-buttons.tsx`로 divider를 올리고 각 버튼은 버튼만 렌더하도록 축소한다
  - `components/kakao-auth-button.tsx` 생성 (`signInWithOAuth({ provider: 'kakao' })`). 에러 표시는 `useState<string | null>` + `<p className="text-sm text-red-500">`, 리다이렉트 성공 경로에서 `setIsLoading(false)` 호출 금지 — 기존 구글 버튼의 관례를 그대로 따른다
  - `components/login-form.tsx`와 `components/sign-up-form.tsx` **양쪽 모두**에 삽입, 모바일 기준 카카오를 상단 배치
  - 기존 `app/auth/callback/route.ts` 재사용 — provider별 콜백 라우트를 새로 만들지 않음. 단 이 파일은 Task 001에서 `/protected` 폴백 때문에 이미 수정되며, 여기서 말하는 것은 **Task 003 범위에서 추가 수정하지 않는다**는 의미다
  - 회귀 확인: divider 승격이 기존 구글 로그인을 깨지 않았는지 `/auth/login`·`/auth/sign-up` 양쪽에서 확인 (구분선이 한 번만 렌더되는지 포함)
  - **이연 ①: 계정 자동 연결 실동작 미검증.** 카카오 계정과 **같은 이메일**을 쓰는 구글 계정이 없어 테스트를 만들 수 없었다. 검증하려면 동일 이메일의 구글 계정으로 로그인한 뒤 `auth.identities`에서 두 provider 행이 같은 `user_id`로 묶이는지 확인한다. 우선순위는 낮다 — 대부분의 사용자는 두 이메일이 달라 애초에 해당되지 않는다
  - **이연 ②: 실기기 카톡 인앱 브라우저 검증을 Task 013으로 옮긴다.** 카톡 인앱은 `localhost`에 접근할 수 없어 HTTPS 공개 URL이 필요한데, 임시 터널 대신 **실제 배포 주소로 한 번에 처리하기로 했다.** 터널은 실행할 때마다 주소가 바뀌고 Supabase 허용 목록을 두 번 손봐야 하므로, 배포 이후에 하면 그 왕복이 사라진다
    - **대가**: N1(카톡 인앱에서 로그인이 되는가)이 이 제품의 전제인데, 그 검증이 Phase 4까지 미뤄진다. 원래 Task 003을 Phase 1에 배치한 이유가 이 리스크를 앞당기려는 것이었으므로 **의도적으로 되돌린 결정**이다. 만약 인앱에서 문제가 드러나면 Phase 2-3을 쌓아올린 뒤에 발견하게 된다
    - **잔여 리스크 평가**: 카카오 로그인은 카톡 인앱을 위해 만들어진 표준 경로이고 데스크톱 완주는 이미 확인했다. 남은 미지수는 WebView의 리디렉션 처리와 세션 쿠키 유지뿐이라 실패 가능성은 낮게 본다. 다만 **검증 전까지는 가정**이다
  - 완료 조건(개정): 데스크톱 브라우저에서 카카오 로그인 완주 → `/dashboard` 도달, DB에 `provider=kakao` identity와 `profiles` 행 생성 확인. **실기기 완주는 Task 013의 완료 조건으로 이관**

### Phase 2: UI/UX 완성 (더미 데이터 활용)

- **Task 004: 공통 컴포넌트 라이브러리 구현** ✅
  - **선행: `app/globals.css`의 shadcn 테마 토큰 복구** — 현재 CSS 리셋(62줄)만 있고 `--background`·`--foreground`·`--primary` 등이 **전부 정의되어 있지 않다**. 브라우저 실측 결과 Login 버튼 배경이 `rgba(0,0,0,0)` 투명으로 계산되고 다크 모드도 동작할 수 없다. `components/ui/**`가 전부 이 토큰을 참조하므로 Task 005·006이 색 없는 화면 위에 쌓인다. `@custom-variant dark` + `:root`/`.dark` 변수 + `@theme inline` 노출을 함께 복구한다
  - 필요한 shadcn/ui 컴포넌트 추가 설치 (`tabs`, `dialog`, `select`, `textarea`, `switch`, `sonner`) — `badge`·`button`·`card`·`checkbox`·`dropdown-menu`·`input`·`label` 7개는 이미 설치되어 있다
  - 도메인 공통 컴포넌트 구현: 이벤트 카드, 참석 상태 배지, 인원 요약 블록, 빈 상태, 복사 버튼
  - 카톡 공유 문구 미리보기·복사 컴포넌트 (Clipboard API + 비지원 환경 폴백)
  - 모바일 우선 반응형 기준 확립 — 참여자 트래픽은 사실상 전량 모바일이며 대부분 카톡 인앱 브라우저
  - Tailwind v4 `@theme` 토큰 기준으로 라이트·다크 모드 표시 확인
  - 완료 조건: 공통 컴포넌트가 두 개 이상의 페이지에서 재사용되는 구조

- **Task 005: 주최자 화면 UI 완성**
  - 대시보드: 주최/참여 탭 전환, 다가오는 모임과 지난 모임 구분, 항목별 일시·장소·인원 요약, [새 이벤트] 버튼
  - 이벤트 생성 폼: 제목·일시·장소·지도 링크·안내·정원·응답 마감 입력, 일시가 한국 시간 기준임을 명시
  - 생성 완료 화면: 초대 링크와 카톡 공유 문구를 함께 표시하고 복사
  - 이벤트 관리 페이지: 상태별 참여자 목록, 동반 포함 총원과 정원 대비 표시, 한마디 확인 영역, 공지 작성·목록, 명단 공개 토글, 마감/취소 전환, 복제, 정산 섹션
  - 전 화면을 더미 데이터로 구성하고 반응형 적용 — **`lib/fixtures.ts`를 페이지에서 직접 호출한다.** 조회 함수 계층을 따로 두지 않는다. Task 008에서 Supabase 쿼리로 바꿀 때 호출 한 줄만 교체되어 경계가 명확하다
  - `[id]`·`[token]` 페이지에서 **`params`를 읽지 않는다** — `cacheComponents` 환경에서 `params`는 동적 API라 읽는 순간 `<Suspense>` 경계가 필요해진다. 더미 단계에서는 불필요한 복잡도이고, 실제 연동(Task 008·009) 때 함께 처리한다
  - 완료 조건: 더미 상태로 랜딩 → 대시보드 → 생성 → 관리 전 구간 네비게이션 완주

- **Task 006: 초대 페이지 UI 완성 (모바일 우선)**
  - 이벤트 정보 헤더(제목·일시·장소·현재 참석 인원), 누적 공지 목록, 마감·취소 상태 배너
  - 응답 폼: 참석/불참/미정 선택, 동반 인원, 한마디. 기존 응답이 있으면 수정 모드로 표시
  - 비로그인 상태의 로그인 유도 블록 (카카오 우선 배치)
  - 참석자 명단 영역, 본인 정산 몫·입금 여부 카드
  - 개인정보 수집 안내 문구와 `/privacy` 링크
  - **정적 셸(이벤트 정보)과 세션 의존 영역(응답 폼·명단·정산)을 컴포넌트 경계로 분리** — `cacheComponents: true` 환경에서 동적 데이터를 읽는 컴포넌트가 `<Suspense>` 밖에 있으면 빌드가 실패하며, 이 페이지는 트래픽이 가장 몰리므로 셸의 캐시 이점을 잃으면 안 됨
  - 완료 조건: 모바일 뷰포트에서 스크롤 한 화면 안에 정보 확인과 응답이 가능

### Phase 3: 핵심 기능 구현

- **Task 007: 데이터베이스 스키마 및 보안 정책 구축** - 우선순위
  - `apply_migration`으로 6개 테이블·인덱스·`updated_at` 트리거 생성 (DDL을 `execute_sql`로 실행하지 않음). 변경 전 `list_tables`로 현재 구조 확인
  - `participants`에 `unique (event_id, user_id)` 부여 — 중복 응답을 DB 차원에서 차단
  - RLS 활성화 및 정책 작성: `events`는 주최자 또는 이미 참여한 사용자만, `participants` 직접 조회는 주최자와 본인 응답만
  - `get_event_preview(text)` SECURITY DEFINER 함수 — 비로그인 미리보기용. 반환 필드를 고정해 과다 노출을 구조적으로 차단하고 토큰 검증을 함수 내부에 둔다
  - `join_event(...)` SECURITY DEFINER 함수 — 로그인·이벤트 상태·응답 기한·인원 상한을 검증한 뒤 `on conflict do update`로 최초 응답과 수정을 단일 경로로 처리
  - `get_event_participants(uuid)` SECURITY DEFINER 함수 — 멤버십 확인 후 명단 반환. RLS는 컬럼 단위 제어가 불가능하므로 `note`를 반환 목록에서 제외해 노출 자체를 차단
  - `generate_typescript_types`로 DB 타입 생성 후 Task 002 타입 정의와 정합성 확인
  - 완료 조건: `get_advisors` 실행 시 RLS·SECURITY DEFINER 관련 경고 0건

- **Task 008: 이벤트 생성·조회 연동**
  - 이벤트 생성 폼을 실제 저장으로 교체, `public_token`(base62 12자) 생성 및 유니크 충돌 시 재시도
  - 대시보드 주최/참여 목록을 실제 조회로 교체
  - 이벤트 관리 페이지 진입 시 주최자 본인 여부 확인
  - 초대 페이지 정적 셸을 `get_event_preview` 결과로 교체
  - Playwright MCP 테스트: 이벤트 생성 → 링크 발급 → 시크릿 창에서 비로그인 열람 시 제목·일시·장소·인원이 표시되는지 확인

- **Task 009: 참석 응답(RSVP) 기능 구현**
  - `join_event` RPC 연동으로 응답 저장·수정 처리
  - 비로그인 응답 시도 → `next=/e/<token>`으로 로그인 유도 → 인증 후 원래 초대 페이지 복귀
  - 마감·취소·응답 기한 초과 시 응답 차단 및 안내 문구 표시
  - 참석 현황 집계 (동반 인원 합산, 정원 대비 표시)
  - `get_event_participants`로 명단 조회하고 `show_names` 설정 반영
  - Playwright MCP 테스트: 응답 저장 → 재접속 시 수정 모드 표시 / 마감된 이벤트 응답 차단 / 미참여 계정에서 명단 비노출

- **Task 010: 주최자 도구 및 공지·공유 구현**
  - 공지 등록 및 초대 페이지 상단 누적 노출
  - 참여자 수동 추가·수정·삭제 — 계정 없는 사람은 `user_id`가 없는 행으로 대리 등록
  - 이벤트 상태 전환(모집중/마감/취소)과 기존 이벤트 복제
  - 참석자 명단 공개 토글
  - 카톡 공유 문구 3종(이벤트 생성·공지 추가·정산 요청) 생성 — 생성 시점의 최신 집계를 반영
  - `location_url` 스킴 검증: `http:`/`https:`만 허용해 `javascript:` 삽입 차단
  - Playwright MCP 테스트: 타인 이벤트의 관리 페이지 접근 차단 / `javascript:` URL 입력 거부 / 공지 추가 후 공유 문구에 최신 인원 반영

- **Task 011: 정산 기능 구현**
  - 정산 생성: 총액 입력 시 참석(`going`) 상태 참여자로 N빵, 1원 단위 나머지는 주최자 귀속
  - `settlement_shares` 생성 및 계좌 정보 등록·복사
  - 입금 체크와 미입금 인원·금액 실시간 요약
  - 참여자가 초대 페이지에서 본인 몫과 입금 처리 여부 확인
  - 정산 요청 카톡 문구 생성
  - Playwright MCP 테스트: 참석자 5명 이벤트로 정산 생성 → 분담 금액 합계가 총액과 일치하는지 검산 → 전원 입금 체크 완주 → 참여자 화면 반영 확인

- **Task 011-1: 핵심 기능 통합 테스트**
  - Playwright MCP 전체 사용자 플로우 테스트: 주최자 생성 → 링크 공유 → 참여자 응답 → 공지 추가 → 정산 생성 → 입금 완료
  - 권한 경계 검증: 미참여 계정의 명단 접근, 타인 주최 이벤트 관리 페이지 접근, 일반 참여자에 대한 `note` 노출 여부
  - 엣지 케이스: 마감 직후 응답, 정원 초과 응답, 중복 응답, 존재하지 않는 토큰 접근
  - 에러 핸들링 및 사용자 안내 문구 검증
  - 완료 조건: 위 시나리오 전체가 수동 개입 없이 통과

### Phase 4: 고급 기능 및 최적화

- **Task 012: 개인정보 대응 및 지표 계측**
  - `/privacy` 내용 작성: 수집 항목, 이용 목적, 보유 기간, 공개 범위(이름은 해당 모임 주최자·참여자에게만 노출)
    - 수집 항목에 **소셜 로그인으로 받는 이메일·닉네임·프로필 사진**을 반드시 포함한다. 카카오 비즈 앱 전환으로 `account_email`을 받게 됐다(Task 003). **이메일은 어디에도 노출하지 않는다**는 점도 함께 적는다
  - `event_views` 기록 구현 — 봇 User-Agent 제외, 원본 IP 대신 해시 저장
  - 지표 산출 쿼리 작성: 주최자 재사용률, 신규 참여자 전환율, 재방문 응답률, 정산 완료율
  - Supabase 무료 플랜의 1주 미사용 시 일시정지 정책 대응 결정 (유료 전환 또는 keep-alive) — 검증 기간 중 DB가 정지되면 첫인상을 잃고 지표도 오염됨
  - 배포 전 `get_advisors` 재확인

- **Task 013: 성능 최적화 및 배포**
  - Cache Components 경계 점검 — 빌드 출력의 `◐` 표시로 초대 페이지 정적 셸이 프리렌더되는지 확인
  - 번들·이미지·폰트 점검 및 모바일 로딩 확인
  - Vercel 배포, 환경 변수 설정, 프로덕션 도메인 기준 OAuth Redirect URL 등록 — Supabase Redirect URLs와 카카오 웹 플랫폼 사이트 도메인 양쪽. 카카오 Redirect URI는 Supabase 콜백 그대로 두고 건드리지 않는다
  - 프로덕션에서 `x-forwarded-host` 기반 콜백 리디렉션 동작 확인
  - **N1 검증 게이트 — Task 003에서 이관됨.** 실기기 **안드로이드·iOS 카카오톡 인앱 브라우저**에서 카카오 로그인 완주 후 `next` 경로 복귀. 특히 `next=/e/<token>` 형태(이 제품의 실제 진입 경로). 데스크톱 브라우저와 Playwright로 대체 불가
    - 여기서 실패하면 제품의 전제가 무너지므로 **다른 최적화보다 먼저 확인한다.** Phase 1에서 미뤄온 리스크가 여기서 정산된다
  - 실기기 최종 점검: 안드로이드·iOS 카카오톡 인앱 브라우저에서 링크 → 로그인 → 응답 → 정산 확인 완주

---

## 참고 — 구현 시 지켜야 할 제약

로드맵 실행 중 반복해서 어겨지기 쉬운 항목입니다. 상세 근거는 `CLAUDE.md`와 `shrimp-rules.md`에 있습니다.

- **Server Action을 새로 도입하지 않습니다.** PRD 기술 스택에는 React Server Actions가 적혀 있지만, 이 저장소의 기존 폼은 전부 클라이언트 컴포넌트에서 Supabase를 직접 호출합니다. 두 패턴을 섞지 말고 기존 방식을 따릅니다
- 미들웨어 파일명은 `middleware.ts`가 아니라 **`proxy.ts`** 입니다 (Next.js 16에서 변경)
- Supabase 클라이언트를 **모듈 최상위 변수에 담지 않습니다**. Fluid compute 환경에서 요청 간 오염이 발생합니다
- `lib/supabase/proxy.ts`에서 `createServerClient()`와 `getClaims()` 사이에 코드를 넣지 않고, 새 `NextResponse`를 만들면 쿠키를 반드시 복사합니다
- 세션 조회는 `getUser()`가 아니라 **`getClaims()`** 를 사용합니다
- Tailwind는 v4이므로 `tailwind.config.ts`가 없습니다. 테마 토큰은 `app/globals.css`의 `@theme` 블록에서 수정합니다
- `components/ui/**`는 shadcn CLI 생성물이므로 직접 수정하지 않고, 변형이 필요하면 사용처에서 `cn()`으로 덮어씁니다
- 테스트 프레임워크가 설치되어 있지 않습니다. `npm run check-all`과 `npm run typecheck`는 존재하지 않는 스크립트입니다
