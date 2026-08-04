import Link from 'next/link';
import { Suspense } from 'react';
import { AuthButton } from '@/components/auth-button';
import { EnvVarWarning } from '@/components/env-var-warning';
import { hasEnvVars } from '@/lib/utils';

/**
 * 모든 페이지 공통 상단 내비게이션.
 *
 * `<Suspense>`는 `AuthButton` 하나만 감싼다. AuthButton이 세션을 읽는 동적
 * 컴포넌트라 cacheComponents(PPR) 환경에서 경계가 필요하지만, 헤더 전체를
 * 감싸면 정적 셸 범위가 줄어 초대 페이지 캐시 이점을 미리 깎아먹는다.
 */
export function SiteHeader() {
	return (
		<nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
			<div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
				<Link href="/" className="font-semibold">
					모임 이벤트 관리
				</Link>
				{!hasEnvVars ? (
					<EnvVarWarning />
				) : (
					<Suspense>
						<AuthButton />
					</Suspense>
				)}
			</div>
		</nav>
	);
}
