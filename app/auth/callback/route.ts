import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * OAuth(PKCE) 콜백 라우트.
 *
 * Google 로그인 성공 후 Supabase가 이 경로로 `code`를 붙여 돌려보내면,
 * 해당 코드를 세션으로 교환하고 쿠키에 저장한다.
 * 이메일 링크용인 `/auth/confirm`(verifyOtp)과는 흐름이 다르므로 별도 라우트로 둔다.
 */
export async function GET(request: NextRequest) {
	const { searchParams, origin } = new URL(request.url);

	/** 에러 메시지를 안전하게 실어 에러 페이지로 보낸다. */
	const redirectToError = (message: string) =>
		NextResponse.redirect(
			`${origin}/auth/error?error=${encodeURIComponent(message)}`,
		);

	// 사용자가 Google 동의 화면에서 취소한 경우 code 대신 error가 온다.
	const oauthError = searchParams.get('error');
	if (oauthError) {
		return redirectToError(searchParams.get('error_description') ?? oauthError);
	}

	const code = searchParams.get('code');
	if (!code) {
		return redirectToError('인증 코드가 없습니다');
	}

	// 오픈 리다이렉트 방지: 앱 내부의 상대 경로만 허용한다.
	// (`//evil.com`은 브라우저가 외부 절대 URL로 해석하므로 함께 막는다)
	const requestedNext = searchParams.get('next') ?? '/protected';
	const next =
		requestedNext.startsWith('/') && !requestedNext.startsWith('//')
			? requestedNext
			: '/protected';

	const supabase = await createClient();
	const { error } = await supabase.auth.exchangeCodeForSession(code);

	if (error) {
		return redirectToError(error.message);
	}

	// 로드밸런서 뒤(예: Vercel)에서는 origin이 내부 주소일 수 있으므로
	// 원래 요청 도메인을 담고 있는 x-forwarded-host를 우선 사용한다.
	const forwardedHost = request.headers.get('x-forwarded-host');
	const isLocalEnv = process.env.NODE_ENV === 'development';

	if (!isLocalEnv && forwardedHost) {
		return NextResponse.redirect(`https://${forwardedHost}${next}`);
	}

	return NextResponse.redirect(`${origin}${next}`);
}
