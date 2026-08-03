# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**2. `cacheComponents: true`가 켜져 있습니다** (`next.config.ts`). Partial Prerendering이 활성화된 상태라, **동적 데이터를 읽는 컴포넌트는 반드시 `<Suspense>` 안에 있어야 합니다.** 안 그러면 빌드가 실패합니다. `app/instruments/page.tsx`(데이터 페칭 부분만 분리)와 `app/protected/layout.tsx`(`<AuthButton />` 감싸기)가 이 패턴의 예시입니다. 빌드 출력의 `◐`는 PPR이 적용된 라우트입니다.

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

라우트 보호는 페이지가 아니라 **proxy에서 일괄 처리**됩니다. `/`와 `/auth/*`를 제외한 모든 경로는 세션이 없으면 `/auth/login`으로 리다이렉트됩니다. 새 보호 페이지를 만들 때 별도 가드 코드는 필요 없습니다.

콜백 라우트가 두 개이고 **용도가 다릅니다**:

- `app/auth/confirm/route.ts` — 이메일 링크용. `verifyOtp()` 사용
- `app/auth/callback/route.ts` — OAuth(Google) PKCE용. `exchangeCodeForSession()` 사용. `next` 파라미터는 오픈 리다이렉트 방지를 위해 내부 경로만 허용하고, 프로덕션에서는 `x-forwarded-host`를 우선합니다

인증 폼(`login-form`, `sign-up-form`)은 클라이언트 컴포넌트에서 직접 Supabase를 호출합니다. Server Action을 쓰지 않습니다.

`lib/utils.ts`의 `hasEnvVars`는 환경 변수 미설정 시 UI를 대체 표시하는 스타터 잔재입니다. proxy도 이 값이 falsy면 인증 검사를 건너뜁니다.

### UI

shadcn/ui (new-york 스타일, neutral 베이스, lucide 아이콘), Tailwind CSS v3, `next-themes` 다크 모드. 모든 import는 `@/` 별칭을 사용합니다.

## 코드 스타일

Prettier: **탭 들여쓰기(폭 2)**, 작은따옴표, 세미콜론, `arrowParens: 'avoid'`, `printWidth: 80`.

`eslint.config.mjs`가 `eslint-plugin-prettier`로 **포맷 위반을 ESLint 에러로 승격**시킵니다. 따라서 `npm run lint` 에러의 대부분은 실제로 포맷 문제이고, `npm run format`을 먼저 돌리면 대량으로 사라집니다.

**`eslint-config-next`의 메이저 버전은 `next`와 반드시 일치해야 합니다.** 어긋나면 `eslint.config.mjs`가 import하는 flat config 서브패스(`eslint-config-next/core-web-vitals` 등)가 존재하지 않아 ESLint가 설정 로드 단계에서 크래시합니다 — 린트 결과가 아니라 `ERR_MODULE_NOT_FOUND`가 뜹니다. Next.js를 올릴 때 함께 올리세요.

## 알려진 이슈

`components/theme-switcher.tsx:21` — `react-hooks/set-state-in-effect` 에러 1건. next-themes의 하이드레이션 가드 패턴을 React 19의 새 훅 규칙이 잡는 것으로, 실제 버그는 아닙니다. 미해결 상태이므로 lint 결과에 항상 나타납니다.

## 환경 변수

`.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`가 필요합니다. 후자는 신규 publishable 키와 레거시 anon 키 둘 다 호환됩니다.

## MCP 서버

`.mcp.json`에 `supabase`, `context7`, `playwright`, `sequential-thinking`, `shrimp-task-manager`가 설정되어 있습니다.

DB 작업 시: DDL은 `execute_sql`이 아니라 **`apply_migration`** 을 사용하고, 스키마 변경 전에는 `list_tables`로 현재 구조를 먼저 확인하세요.
