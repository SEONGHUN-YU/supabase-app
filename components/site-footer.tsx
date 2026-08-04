import Link from 'next/link';
import { ThemeSwitcher } from '@/components/theme-switcher';

/**
 * 모든 페이지 공통 하단 영역.
 * 개인정보 처리방침(F015)은 초대 페이지 안내 문구 외에 이 링크로도 닿아야 한다.
 */
export function SiteFooter() {
	return (
		<footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
			<Link href="/privacy" className="hover:underline">
				개인정보 처리방침
			</Link>
			<ThemeSwitcher />
		</footer>
	);
}
