import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const defaultUrl = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL}`
	: 'http://localhost:3000';

export const metadata: Metadata = {
	metadataBase: new URL(defaultUrl),
	title: '모임 이벤트 관리',
	description: '초대 링크 하나로 모임 참석 집계와 회비 정산을 끝냅니다',
};

const geistSans = Geist({
	variable: '--font-geist-sans',
	display: 'swap',
	subsets: ['latin'],
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ko" suppressHydrationWarning>
			<body className={`${geistSans.className} antialiased`}>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					{/* 헤더·푸터는 여기 한 번만 둔다. 개별 페이지가 다시 그리지 않는다. */}
					<div className="min-h-screen flex flex-col items-center">
						<SiteHeader />
						<div className="flex-1 w-full max-w-5xl p-5">{children}</div>
						<SiteFooter />
					</div>
					{/* 복사 성공·실패 알림. ThemeProvider 안에 둬야 다크 모드를 따라간다. */}
					<Toaster position="top-center" />
				</ThemeProvider>
			</body>
		</html>
	);
}
