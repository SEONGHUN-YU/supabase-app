# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 이 저장소가 무엇인지

Supabase Next.js 스타터를 기반으로 **모임 이벤트 관리 MVP**를 만드는 중입니다. 모임 주최자가 단톡방에서 손으로 처리하던 참석 집계·공지·회비 정산을 초대 링크 하나로 옮기는 제품입니다.

**기획은 확정됐고 구현은 Phase 1(라우트 골격)까지 끝났습니다.** 화면 안쪽은 아직 자리표시자이므로, 기능을 물어보면 코드가 아니라 아래 문서를 읽으세요.

| 문서                  | 내용                                                   |
| --------------------- | ------------------------------------------------------ |
| `docs/MVP-PLAN.md`    | 기획 원본. 스키마 DDL, RLS 정책, RPC 함수 설계, 리스크 |
| `docs/PRD.md`         | 기능 명세 `F001`~`F015`, 화면 7개, 데이터 모델         |
| `docs/ROADMAP.md`     | Phase 1-4, Task 001-013 분해                           |
| `docs/LEAN-CANVAS.md` | 린 캔버스 9블록, 지표 목표치                           |

파생 관계는 `MVP-PLAN → PRD → ROADMAP·LEAN-CANVAS`입니다. 기능을 추가·삭제하면 `PRD.md` 기능표와 `ROADMAP.md` Task를 함께 고치세요.

**`shrimp-rules.md`가 별도로 있습니다.** 이 파일보다 더 세밀한 금지 사항과 의사결정 트리가 들어 있으므로, 코드를 고치기 전에 함께 읽으세요.

`/docs:update-roadmap` 슬래시 커맨드는 shrimp-task-manager의 완료 작업을 `docs/ROADMAP.md`에 ✅로 동기화합니다. ROADMAP의 `- **Task 001: 제목**` 줄 형식에 의존하므로 이 형식을 바꾸지 마세요.

## 명령어

```bash
npm run dev           # 개발 서버 (localhost:3000)
npm run build         # 프로덕션 빌드 — 타입 에러까지 잡히므로 최종 검증용
npm run lint          # ESLint (Prettier 규칙 포함)
npm run lint:fix      # ESLint 자동 수정
npm run format        # Prettier 전체 적용
npm run format:check  # Prettier 검사만
npx tsc --noEmit      # 타입 체크 (전용 스크립트 없음)
```

**테스트 프레임워크가 설치되어 있지 않습니다.** 테스트 러너, 설정 파일, 테스트 파일 모두 없으므로 "테스트 실행" 요청을 받으면 먼저 도입 여부를 확인하세요.

`.claude/agents/nextjs-supabase-expert.md`는 `npm run check-all`, `npm run typecheck`, Next.js 15.5.3을 언급하지만 **셋 다 현재 상태와 다릅니다**. 실제 스크립트는 위 목록이 전부이고, Next.js는 16.x입니다.

## 아키텍처

### Next.js 16 — 주의해야 할 두 가지

**1. 미들웨어 파일명이 `proxy.ts`입니다** (`middleware.ts` 아님). Next.js 16에서 이름이 바뀌었습니다. 루트 `proxy.ts`가 matcher를 정의하고 실제 로직은 `lib/supabase/proxy.ts`의 `updateSession()`에 있습니다. 빌드 출력에도 `ƒ Proxy (Middleware)`로 표시됩니다.

**2. `cacheComponents: true`가 켜져 있습니다** (`next.config.ts`). Partial Prerendering이 활성화된 상태라, **동적 데이터를 읽는 컴포넌트는 반드시 `<Suspense>` 안에 있어야 합니다.** 안 그러면 빌드가 실패합니다. `components/site-header.tsx`가 이 패턴의 예시입니다 — 세션을 읽는 `<AuthButton />` **하나만** `<Suspense>`로 감쌉니다. 경계는 최소 단위로 두세요. 헤더 전체를 감싸면 정적 셸 범위가 줄어 초대 페이지 캐시 이점이 사라집니다. 빌드 출력의 `◐`는 PPR이 적용된 라우트입니다.

### Supabase 클라이언트 — 컨텍스트별로 3개

| 파일                     | 사용처                          | 생성 방식                |
| ------------------------ | ------------------------------- | ------------------------ |
| `lib/supabase/server.ts` | Server Component, Route Handler | `await createClient()`   |
| `lib/supabase/client.ts` | `'use client'` 컴포넌트         | `createClient()` (동기)  |
| `lib/supabase/proxy.ts`  | proxy 전용                      | `updateSession(request)` |

**클라이언트를 모듈 최상위 변수에 담지 마세요.** Fluid compute 환경에서 요청 간 오염이 발생합니다. 항상 함수 안에서 새로 생성합니다.

`lib/supabase/proxy.ts` 수정 시: `createServerClient()`와 `supabase.auth.getClaims()` 사이에 코드를 넣으면 안 되고, 새 `NextResponse`를 만들면 쿠키를 반드시 복사해야 합니다. 어기면 사용자가 무작위로 로그아웃되는, 원인 추적이 매우 어려운 버그가 생깁니다. 파일 내 주석에도 명시되어 있습니다.

세션 조회는 `getUser()`가 아니라 **`getClaims()`** 를 씁니다 (JWT 로컬 검증이라 더 빠름).

### 인증 흐름

라우트 보호는 페이지가 아니라 **proxy에서 일괄 처리**됩니다. `/`, `/auth/*`, `/e/*`, `/privacy`를 제외한 모든 경로는 세션이 없으면 `/auth/login`으로 리다이렉트됩니다. 새 보호 페이지를 만들 때 별도 가드 코드는 필요 없습니다.

콜백 라우트가 두 개이고 **용도가 다릅니다**:

- `app/auth/confirm/route.ts` — 이메일 링크용. `verifyOtp()` 사용
- `app/auth/callback/route.ts` — OAuth(Google) PKCE용. `exchangeCodeForSession()` 사용. `next` 파라미터는 오픈 리다이렉트 방지를 위해 내부 경로만 허용하고, 프로덕션에서는 `x-forwarded-host`를 우선합니다

인증 폼(`login-form`, `sign-up-form`)은 클라이언트 컴포넌트에서 직접 Supabase를 호출합니다. Server Action을 쓰지 않습니다.

`lib/utils.ts`의 `hasEnvVars`는 환경 변수 미설정 시 UI를 대체 표시하는 스타터 잔재입니다. **주석에 "제거 가능"이라고 적혀 있지만 지우지 마세요.** `lib/supabase/proxy.ts`가 이 값이 falsy면 인증 검사를 통째로 건너뜁니다. 제거하면 환경 변수 미설정 시 모든 경로가 로그인으로 튕겨 개발이 막힙니다.

### 라우트 구조

| 경로                  | 인증         | 용도              |
| --------------------- | ------------ | ----------------- |
| `/`                   | 불필요       | 랜딩              |
| `/e/[token]`          | 불필요(열람) | 초대 페이지       |
| `/privacy`            | 불필요       | 개인정보 처리방침 |
| `/dashboard`          | 필요         | 주최/참여 허브    |
| `/events/new`         | 필요         | 이벤트 생성       |
| `/events/[id]/manage` | 주최자 본인  | 이벤트 관리       |

비로그인 열람이 필요한 경로는 `lib/supabase/proxy.ts`의 인증 조건문에 예외를 추가해야 합니다. 그 조건문은 `getClaims()` 호출 **이후** 블록이라 예외를 늘려도 안전합니다.

Phase 1에서 라우트 골격만 만들어 둔 상태라 `/dashboard` 이하는 자리표시자입니다. 헤더·푸터는 `app/layout.tsx`에 한 번만 배치되므로 **개별 페이지에서 다시 그리지 마세요.**

스타터 데모 코드(`app/instruments/`, `app/protected/`, `components/tutorial/`, `components/hero.tsx` 등)는 Task 001에서 제거됐습니다.

### UI

shadcn/ui (new-york 스타일, neutral 베이스, lucide 아이콘), Tailwind CSS v4, `next-themes` 다크 모드. 모든 import는 `@/` 별칭을 사용합니다.

**Tailwind는 v4이므로 `tailwind.config.ts`가 없습니다.** 테마 토큰은 `app/globals.css`의 `@theme` 블록에, 다크 모드는 같은 파일의 `@custom-variant dark (&:is(.dark *))`에 정의돼 있습니다. 색상을 추가하려면 config가 아니라 이 CSS를 고치세요. PostCSS는 `@tailwindcss/postcss` 하나만 쓰고 autoprefixer는 제거됐습니다(v4가 자동 처리).

v3 문법을 쓰면 조용히 무시되므로 주의합니다 — `shadow` → `shadow-sm`, 기존 `shadow-sm` → `shadow-xs`, `outline-none` → `outline-hidden`, `bg-gradient-to-r` → `bg-linear-to-r`, `!leading-tight` → `leading-tight!`, `origin-[--var]` → `origin-(--var)`.

## 코드 스타일

Prettier: **탭 들여쓰기(폭 2)**, 작은따옴표, 세미콜론, `arrowParens: 'avoid'`, `printWidth: 80`.

`eslint.config.mjs`가 `eslint-plugin-prettier`로 **포맷 위반을 ESLint 에러로 승격**시킵니다. 따라서 `npm run lint` 에러의 대부분은 실제로 포맷 문제이고, `npm run format`을 먼저 돌리면 대량으로 사라집니다.

**`eslint-config-next`의 메이저 버전은 `next`와 반드시 일치해야 합니다.** 어긋나면 `eslint.config.mjs`가 import하는 flat config 서브패스(`eslint-config-next/core-web-vitals` 등)가 존재하지 않아 ESLint가 설정 로드 단계에서 크래시합니다 — 린트 결과가 아니라 `ERR_MODULE_NOT_FOUND`가 뜹니다. Next.js를 올릴 때 함께 올리세요.

`package.json`에서 **`next`, `@supabase/ssr`, `@supabase/supabase-js`가 `"latest"`로 지정**되어 있습니다. `eslint-config-next`는 `^16.2.12`로 고정이므로, `npm install`만 돌려도 Next.js 메이저가 올라가 위 크래시가 저절로 발생할 수 있습니다. 의존성 설치 직후 ESLint나 인증이 갑자기 깨지면 `package-lock.json` 변경분을 먼저 확인하세요.

## 알려진 이슈

`components/theme-switcher.tsx:21` — `react-hooks/set-state-in-effect` 에러 1건. next-themes의 하이드레이션 가드 패턴을 React 19의 새 훅 규칙이 잡는 것으로, 실제 버그는 아닙니다. 미해결 상태이므로 lint 결과에 항상 나타납니다.

## 환경 변수

`.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`가 필요합니다. 후자는 신규 publishable 키와 레거시 anon 키 둘 다 호환됩니다.

서버 전용 변수(`SLACK_WEBHOOK_URL`, `CONTEXT7_API_KEY`)는 `env.d.ts`에 타입 선언되어 있습니다. **`NEXT_PUBLIC_` 접두사가 없는 변수만 여기에 선언하는 관례**이며, 변수를 추가하면 `.env.local` · `.env.example` · `env.d.ts` 세 곳을 함께 고칩니다.

## MCP 서버

`.mcp.json`에 `supabase`, `context7`, `playwright`, `sequential-thinking`, `shrimp-task-manager`가 설정되어 있습니다.

DB 작업 시: DDL은 `execute_sql`이 아니라 **`apply_migration`** 을 사용하고, 스키마 변경 전에는 `list_tables`로 현재 구조를 먼저 확인하세요.

`.claude/settings.json`에 **Stop 훅**이 걸려 있습니다. 작업이 끝날 때마다 `.env.local`의 `SLACK_WEBHOOK_URL`로 완료 알림을 보냅니다. 해당 변수가 없으면 조용히 넘어갑니다.
