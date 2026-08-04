import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * 랜딩 페이지 (F010 진입점).
 *
 * 세션을 읽지 않는다. [시작하기]는 `/dashboard`로 보내고, 비로그인이면
 * proxy가 로그인 페이지로 돌려보낸다. 덕분에 이 페이지는 완전히 정적이다.
 */
export default function Home() {
	return (
		<main className="flex flex-col items-center gap-6 py-24 text-center">
			<h1 className="text-3xl font-bold sm:text-4xl">
				단톡방 참석 집계, 링크 하나로
			</h1>
			<p className="text-muted-foreground max-w-prose">
				모임을 만들고 초대 링크를 공유하면 참석 인원과 회비 정산이 자동으로
				정리됩니다.
			</p>
			<Button asChild size="lg">
				<Link href="/dashboard">시작하기</Link>
			</Button>
		</main>
	);
}
