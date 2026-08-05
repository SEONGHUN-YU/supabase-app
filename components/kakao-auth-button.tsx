'use client';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useState } from 'react';

/** 카카오 심볼 (lucide-react에는 브랜드 아이콘이 없어 인라인 SVG로 둔다) */
function KakaoIcon() {
	return (
		<svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
			<path
				fill="#000000"
				d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7-.2.7-.7 2.7-.8 3.1 0 .2.1.4.3.4.1 0 .2 0 .3-.1.4-.3 3-2 4.1-2.8.5.1 1 .1 1.4.1 5.5 0 10-3.6 10-8S17.5 3 12 3z"
			/>
		</svg>
	);
}

interface KakaoAuthButtonProps extends React.ComponentPropsWithoutRef<'div'> {
	/** 로그인 성공 후 이동할 앱 내부 경로 */
	next?: string;
}

export function KakaoAuthButton({
	next = '/dashboard',
	className,
	...props
}: KakaoAuthButtonProps) {
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleKakaoLogin = async () => {
		const supabase = createClient();
		setIsLoading(true);
		setError(null);

		try {
			// scopes를 넘기지 않는다. Supabase는 기본 scope
			// (account_email, profile_image, profile_nickname)를 덮어쓰지 않고
			// 뒤에 붙이기만 하므로, 코드로는 줄일 수 없다.
			// 실제로 요청되는 항목은 카카오 콘솔의 동의항목 설정이 결정한다.
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'kakao',
				options: {
					// Supabase가 인증 후 이 주소로 code를 붙여 되돌려 보낸다.
					// 대시보드의 Redirect URLs에 등록된 주소여야 한다.
					redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
				},
			});
			if (error) throw error;
			// 정상 흐름이면 이 시점에 카카오 페이지로 이동하므로
			// 로딩 상태를 되돌리지 않는다 (버튼 깜빡임 방지).
		} catch (error: unknown) {
			setError(error instanceof Error ? error.message : 'An error occurred');
			setIsLoading(false);
		}
	};

	return (
		<div className={cn('flex flex-col gap-2', className)} {...props}>
			{error && <p className="text-sm text-red-500">{error}</p>}
			{/* 카카오 브랜드 가이드: 배경 #FEE500 + 검정 텍스트 고정.
			    테마 토큰을 쓰면 다크 모드에서 브랜드 색이 깨진다.
			    h-11(44px)은 shadcn 기본 h-9(36px)를 덮어쓴 것이다. 이 버튼은
			    초대 페이지의 주 진입점이고 사용자는 사실상 전량 모바일이라
			    최소 터치 타겟을 지켜야 한다. */}
			<Button
				type="button"
				className="h-11 w-full bg-[#FEE500] text-black hover:bg-[#FDD835]"
				onClick={handleKakaoLogin}
				disabled={isLoading}
			>
				<KakaoIcon />
				{isLoading ? '이동 중...' : '카카오로 계속하기'}
			</Button>
		</div>
	);
}
