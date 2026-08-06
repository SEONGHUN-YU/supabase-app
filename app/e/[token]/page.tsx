import { Suspense } from 'react';
import { cn } from '@/lib/utils';
import { InviteShell } from './shell';

/**
 * 초대 페이지 (F003, F004, F005, F009) — 이 제품에서 트래픽이 가장 몰리는 화면.
 *
 * `params`(token)를 이 파일 자체는 읽지 않는다. 토큰을 읽는 순간 그 하위
 * 트리가 `cacheComponents` 환경에서 동적이 되므로, 토큰 의존 렌더링은
 * `./shell.tsx`의 `InviteShell`로 몰아 단일 `<Suspense>`로 감싼다. 그 안에서
 * 세션 의존 3영역은 각자 독립된 `<Suspense>`를 또 가진다(`./sections.tsx`).
 *
 * 이 경로는 proxy 인증 예외라 비로그인으로 열린다. 비로그인 상태에서 이벤트
 * 정보는 보이고 응답 영역만 로그인을 유도한다.
 */

function InviteSkeleton() {
	return (
		<div className="flex flex-col gap-5">
			<div className={cn('bg-muted h-24 animate-pulse rounded-md')} />
			<div className={cn('bg-muted h-40 animate-pulse rounded-md')} />
			<div className={cn('bg-muted h-24 animate-pulse rounded-md')} />
		</div>
	);
}

export default function InvitePage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	return (
		<main className="flex flex-col gap-5 py-4">
			<Suspense fallback={<InviteSkeleton />}>
				<InviteShell params={params} />
			</Suspense>
		</main>
	);
}
