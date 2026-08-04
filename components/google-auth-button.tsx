'use client';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useState } from 'react';

/** Google 브랜드 로고 (lucide-react에는 브랜드 아이콘이 없어 인라인 SVG로 둔다) */
function GoogleIcon() {
	return (
		<svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
			<path
				fill="#4285F4"
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
			/>
			<path
				fill="#34A853"
				d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
			/>
			<path
				fill="#FBBC05"
				d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"
			/>
			<path
				fill="#EA4335"
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51z"
			/>
		</svg>
	);
}

interface GoogleAuthButtonProps extends React.ComponentPropsWithoutRef<'div'> {
	/** 로그인 성공 후 이동할 앱 내부 경로 */
	next?: string;
}

export function GoogleAuthButton({
	next = '/dashboard',
	className,
	...props
}: GoogleAuthButtonProps) {
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleGoogleLogin = async () => {
		const supabase = createClient();
		setIsLoading(true);
		setError(null);

		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					// Supabase가 인증 후 이 주소로 code를 붙여 되돌려 보낸다.
					// 대시보드의 Redirect URLs에 등록된 주소여야 한다.
					redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
				},
			});
			if (error) throw error;
			// 정상 흐름이면 이 시점에 Google 페이지로 이동하므로
			// 로딩 상태를 되돌리지 않는다 (버튼 깜빡임 방지).
		} catch (error: unknown) {
			setError(error instanceof Error ? error.message : 'An error occurred');
			setIsLoading(false);
		}
	};

	return (
		<div className={cn('flex flex-col gap-4', className)} {...props}>
			<div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
				<span className="bg-card text-muted-foreground relative z-10 px-2">
					Or continue with
				</span>
			</div>
			{error && <p className="text-sm text-red-500">{error}</p>}
			<Button
				type="button"
				variant="outline"
				className="w-full"
				onClick={handleGoogleLogin}
				disabled={isLoading}
			>
				<GoogleIcon />
				{isLoading ? 'Redirecting...' : 'Continue with Google'}
			</Button>
		</div>
	);
}
