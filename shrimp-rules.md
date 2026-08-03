# Development Guidelines

## 프로젝트 개요

- **스택**: Next.js 16.2.12 (App Router) · React 19 · TypeScript strict · Supabase (`@supabase/ssr`) · Tailwind CSS v3 · shadcn/ui (new-york)
- **버전 의존 규칙이 존재하므로 Next.js 15 기준 지식을 적용하지 말 것.** 미들웨어 파일명과 캐시 동작이 다르다.
- `.claude/agents/nextjs-supabase-expert.md`의 "Next.js 15.5.3", `npm run check-all`, `npm run typecheck` 기술은 **오류**다. 해당 문서를 근거로 명령을 실행하지 말 것.

## 프로젝트 아키텍처

| 경로                     | 책임                    | 수정 시 주의                        |
| ------------------------ | ----------------------- | ----------------------------------- |
| `proxy.ts` (루트)        | matcher 정의만          | 로직을 여기 넣지 말 것              |
| `lib/supabase/proxy.ts`  | 세션 갱신 + 라우트 보호 | 아래 "proxy 금기" 준수              |
| `lib/supabase/server.ts` | Server 측 클라이언트    | 반환값을 모듈 스코프에 저장 금지    |
| `lib/supabase/client.ts` | 브라우저 클라이언트     | Server Component에서 import 금지    |
| `app/auth/**`            | 인증 라우트             | proxy가 무조건 통과시키는 경로      |
| `components/ui/**`       | shadcn 생성물           | 직접 수정 금지 (CLI 재생성 시 소실) |
| `components/tutorial/**` | 스타터 잔재             | 신규 기능을 여기 추가 금지          |

## 코드 표준

### 포맷 (`.prettierrc.js`가 유일한 기준)

- 들여쓰기는 **탭 문자**, 폭 2
- 문자열은 **작은따옴표**
- 세미콜론 필수, `trailingComma: 'all'`, `printWidth: 80`
- 화살표 함수 단일 인자에 괄호 금지 → `e => setEmail(...)` (O) / `(e) => setEmail(...)` (X)

### 언어

- 코드 주석: **한국어**
- 문서(`.md`): **한국어**
- 커밋 메시지: **영어**
- 변수명·함수명·UI 표시 문자열: **영어** (기존 화면이 전부 영어이므로 한국어 UI 문자열을 섞지 말 것)

### import

- 전부 `@/` 별칭 사용. 상대 경로 `../../lib/...` 금지
- 예외: `components/` 내부의 기존 `./ui/button` 형태는 유지 (신규 파일은 `@/` 사용)

## 기능 구현 표준

### 보호 페이지 추가

- `app/<경로>/page.tsx` 생성만 하면 된다. **페이지 안에 세션 검사 코드를 추가하지 말 것** — `lib/supabase/proxy.ts`가 일괄 처리한다
- 로그인 없이 접근 가능해야 하면 경로를 `app/auth/**` 아래 두거나 `lib/supabase/proxy.ts`의 예외 조건을 수정한다

### Server Component에서 DB 조회

```tsx
// O: 데이터 페칭을 별도 async 컴포넌트로 분리하고 Suspense로 감싼다
async function Data() {
	const supabase = await createClient(); // @/lib/supabase/server
	const { data } = await supabase.from('table').select();
	return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
export default function Page() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<Data />
		</Suspense>
	);
}
```

```tsx
// X: page 본문에서 직접 await → cacheComponents 활성 상태에서 빌드 실패
export default async function Page() {
	const supabase = await createClient();
	const { data } = await supabase.from('table').select();
}
```

- `next.config.ts`의 `cacheComponents: true` 때문에 **동적 데이터·쿠키·헤더를 읽는 컴포넌트는 반드시 `<Suspense>` 경계 안에 있어야 한다**
- 참조 구현: `app/instruments/page.tsx`, `app/protected/layout.tsx`

### 인증 폼 / 클라이언트 상호작용

- `'use client'` 선언 후 `@/lib/supabase/client`의 `createClient()` 사용 (`await` 붙이지 말 것)
- Server Action을 새로 도입하지 말 것 — 기존 폼은 전부 클라이언트에서 Supabase를 직접 호출한다. 패턴을 섞지 않는다
- 에러는 `useState<string | null>`에 담아 `<p className="text-sm text-red-500">`로 표시 (기존 폼과 동일)

### OAuth provider 추가

1. `components/<provider>-auth-button.tsx` 생성 — `signInWithOAuth({ provider, options: { redirectTo } })`
2. `redirectTo`는 반드시 `${window.location.origin}/auth/callback?next=...` 형태
3. `components/login-form.tsx`와 `components/sign-up-form.tsx` **양쪽 모두**에 삽입
4. `app/auth/callback/route.ts`는 provider 무관하게 재사용한다. **provider마다 콜백 라우트를 새로 만들지 말 것**
5. 리다이렉트 성공 경로에서 `setIsLoading(false)` 호출 금지 (페이지 이탈 직전 버튼 깜빡임 발생)

### 콜백 라우트 선택

| 상황                        | 사용할 라우트                | API                        |
| --------------------------- | ---------------------------- | -------------------------- |
| 이메일 링크 (가입확인/비번) | `app/auth/confirm/route.ts`  | `verifyOtp()`              |
| OAuth 소셜 로그인           | `app/auth/callback/route.ts` | `exchangeCodeForSession()` |

- 두 라우트를 통합하지 말 것
- `next` 쿼리 파라미터를 리다이렉트에 쓸 때는 `/`로 시작하고 `//`로 시작하지 않는 값만 허용할 것 (오픈 리다이렉트 방지)

### shadcn/ui 컴포넌트

- `npx shadcn@latest add <name>`으로 추가한다. `components/ui/**`를 손으로 작성하지 말 것
- 스타일 변형이 필요하면 `components/ui/**`를 고치지 말고 사용처에서 `cn()`으로 클래스를 덧씌운다

## 프레임워크 사용 표준

### Supabase 클라이언트 선택 (분기 기준)

```
Route Handler / Server Component  → @/lib/supabase/server   → await createClient()
'use client' 컴포넌트              → @/lib/supabase/client   → createClient()
proxy.ts                          → @/lib/supabase/proxy    → updateSession(request)
```

- **모듈 최상위에 클라이언트 인스턴스를 만들지 말 것.** 반드시 함수 내부에서 매 호출마다 생성한다 (Fluid compute 요청 간 오염)
- 세션 조회는 `getClaims()`를 쓴다. `getUser()`로 바꾸지 말 것

### `lib/supabase/proxy.ts` 금기

- `createServerClient()` 호출과 `supabase.auth.getClaims()` 호출 **사이에 어떤 코드도 삽입 금지**
- `supabaseResponse`를 그대로 반환할 것. 새 `NextResponse`를 만들면 `supabaseResponse.cookies.getAll()`을 반드시 복사할 것
- `getClaims()` 호출 자체를 제거하지 말 것

### 의존성 버전 연동

- `next`의 메이저 버전을 변경하면 `eslint-config-next`를 **같은 메이저로 동시에** 변경할 것
- 불일치 시 `eslint.config.mjs`의 `eslint-config-next/core-web-vitals` import가 해석되지 않아 ESLint가 `ERR_MODULE_NOT_FOUND`로 크래시한다 (린트 에러가 아니라 실행 자체가 실패)

## 워크플로 표준

### 코드 변경 후 검증 순서

```bash
npm run format     # 1. 먼저 포맷 (lint 에러 대부분이 포맷 문제이므로 순서 중요)
npm run lint       # 2. 남은 실제 린트 문제만 확인
npx tsc --noEmit   # 3. 타입 체크
npm run build      # 4. 최종 확인 (cacheComponents 위반은 여기서만 드러남)
```

- `npm run check-all`, `npm run typecheck`는 **존재하지 않는다**. 실행하지 말 것
- 테스트 프레임워크가 설치되어 있지 않다. 테스트 실행을 시도하지 말고, 필요하면 도입 여부를 먼저 확인할 것
- `components/theme-switcher.tsx:21`의 `react-hooks/set-state-in-effect` 에러 1건은 **기존 미해결 항목**이다. 신규 에러와 혼동하지 말 것

## 핵심 파일 상호작용 표준

**아래 조합은 반드시 동시에 수정한다.**

| 변경 대상                 | 함께 수정해야 하는 파일                                                    |
| ------------------------- | -------------------------------------------------------------------------- |
| 환경 변수 추가            | `.env.local` + `.env.example` + `env.d.ts` (`NEXT_PUBLIC_` 제외 서버 변수) |
| `next` 버전               | `package.json`의 `eslint-config-next`                                      |
| `.prettierrc.js` 들여쓰기 | `.editorconfig`의 `indent_style` / `indent_size`                           |
| OAuth provider 추가       | `components/login-form.tsx` + `components/sign-up-form.tsx`                |
| proxy 예외 경로 추가      | `lib/supabase/proxy.ts` 조건문 + 필요 시 루트 `proxy.ts`의 matcher         |
| 새 npm 스크립트           | `CLAUDE.md`의 명령어 표 + 본 문서의 워크플로 절                            |

- `env.d.ts`에는 `NEXT_PUBLIC_` 접두사가 없는 서버 전용 변수만 선언되어 있다. 이 관례를 유지할 것

## AI 의사결정 표준

### 'use client'를 붙일지 판단

```
useState/useEffect/이벤트 핸들러/브라우저 API 필요?
├─ 예 → 'use client'. 단, 해당 부분만 최소 단위로 분리한다
└─ 아니오 → Server Component 유지 (기본값). 'use client' 금지
```

### 사용자가 "포맷"과 "린트"를 구분 없이 말할 때

```
"포맷/format" → npm run format (Prettier만)
"린트/lint"   → npm run lint
범위 지정 없음 → 전체가 아니라 변경한 파일 범위를 먼저 제안할 것
```

- 대량 포맷(수십 개 파일 변경)은 실행 전 범위를 확인받을 것

### DB 스키마 변경 요청

```
DDL(CREATE/ALTER/DROP) → mcp__supabase__apply_migration
DML(SELECT/INSERT/...)  → mcp__supabase__execute_sql
```

- 변경 전 `mcp__supabase__list_tables`로 현재 구조를 확인할 것
- DDL을 `execute_sql`로 실행하지 말 것

### 파괴적 git 작업 요청

- `reset --hard`, `stash drop`, `clean` 실행 전 대상 범위를 명시하고, 사용자 작업분이 섞여 있으면 그 사실을 먼저 알릴 것

## 금지 사항

- ❌ `middleware.ts` 생성 — 이 프로젝트의 미들웨어는 `proxy.ts`다
- ❌ Supabase 클라이언트를 모듈 스코프 변수에 할당
- ❌ Server Component 본문에서 `<Suspense>` 없이 동적 데이터 await
- ❌ `components/ui/**` 직접 편집
- ❌ `createServerClient()`와 `getClaims()` 사이 코드 삽입
- ❌ `getClaims()`를 `getUser()`로 교체
- ❌ provider별 OAuth 콜백 라우트 신규 생성
- ❌ `npm run check-all` / `npm run typecheck` 실행
- ❌ 스페이스 들여쓰기 · 큰따옴표 문자열
- ❌ `.env.local` 값을 커밋하거나 문서·로그에 출력
