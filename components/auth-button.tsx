import Link from 'next/link';
import { Button } from './ui/button';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from './logout-button';

/**
 * 헤더에 띄울 표시 이름.
 *
 * **이메일을 쓰지 않는다.** 이 헤더는 초대 페이지를 포함한 전 화면에 뜨는데,
 * 초대 링크는 단톡방으로 유통되고 참여자는 그 화면을 그대로 캡처해 공유한다.
 * 이메일을 걸어 두면 그때마다 함께 새어 나간다.
 *
 * 해석 순서는 `auth.users`의 `handle_new_user` 트리거가 `profiles.full_name`을
 * 채울 때 쓰는 순서와 같다 — `full_name` → `name`. 카카오는 닉네임을 `name`으로
 * 넣는다. 닉네임 동의를 거부하면 둘 다 없으므로 최종 폴백이 필요하다.
 */
function displayName(claims: {
	user_metadata?: { full_name?: unknown; name?: unknown };
}): string {
	const metadata = claims.user_metadata;
	const name = metadata?.full_name ?? metadata?.name;
	return typeof name === 'string' && name.length > 0 ? name : '내 계정';
}

export async function AuthButton() {
	const supabase = await createClient();

	// getUser()도 되지만 더 느리다. getClaims()는 JWT를 로컬에서 검증한다.
	const { data } = await supabase.auth.getClaims();

	const user = data?.claims;

	return user ? (
		<div className="flex items-center gap-3">
			<span className="max-w-32 truncate">{displayName(user)}님</span>
			<LogoutButton />
		</div>
	) : (
		<div className="flex gap-2">
			<Button asChild size="sm" variant={'outline'}>
				<Link href="/auth/login">Sign in</Link>
			</Button>
			<Button asChild size="sm" variant={'default'}>
				<Link href="/auth/sign-up">Sign up</Link>
			</Button>
		</div>
	);
}
