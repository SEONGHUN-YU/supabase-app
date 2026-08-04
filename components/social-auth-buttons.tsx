import { GoogleAuthButton } from '@/components/google-auth-button';
import { KakaoAuthButton } from '@/components/kakao-auth-button';
import { cn } from '@/lib/utils';

interface SocialAuthButtonsProps extends React.ComponentPropsWithoutRef<'div'> {
	/** 로그인 성공 후 이동할 앱 내부 경로. 생략하면 각 버튼의 기본값(`/dashboard`) */
	next?: string;
}

/**
 * 소셜 로그인 버튼 묶음.
 *
 * 구분선과 안내 문구를 **그룹이 소유한다.** 개별 버튼이 품고 있으면 버튼을
 * 늘릴 때마다 중복 렌더된다 (카카오 추가 전 구글 버튼이 그랬다).
 */
export function SocialAuthButtons({
	next,
	className,
	...props
}: SocialAuthButtonsProps) {
	return (
		<div className={cn('flex flex-col gap-4', className)} {...props}>
			<div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
				<span className="bg-card text-muted-foreground relative z-10 px-2">
					또는
				</span>
			</div>

			{/* 카카오가 위다. 초대 링크가 카톡으로 유통되므로 모바일 주 경로다 (PRD F010) */}
			<div className="flex flex-col gap-2">
				<KakaoAuthButton next={next} />
				<GoogleAuthButton next={next} />
			</div>

			{/* N4: Supabase의 자동 계정 연결은 두 provider의 이메일이 **같을 때만**
			    동작한다. 한국에서는 카카오=네이버·한메일, 구글=gmail로 다른 경우가
			    일반적이라 대개 별개 계정이 된다. 그래서 미리 알린다. */}
			<p className="text-muted-foreground text-center text-xs">
				가입할 때 쓴 수단으로 로그인해 주세요
			</p>
		</div>
	);
}
