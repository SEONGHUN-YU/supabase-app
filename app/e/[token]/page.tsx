import Link from 'next/link';
import { Suspense } from 'react';
import { AttendanceSummary } from '@/components/attendance-summary';
import { StatusBanner } from '@/components/status-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatKST } from '@/lib/date';
import {
	FIXTURE_NOW,
	countGoing,
	makeAnnouncement,
	makeEvent,
	sampleParticipants,
} from '@/lib/fixtures';
import { safeHref } from '@/lib/url';
import { cn } from '@/lib/utils';
import { AttendeeSection, RsvpSection, SettlementSection } from './sections';

/**
 * 초대 페이지 (F003, F004, F005, F009) — 이 제품에서 트래픽이 가장 몰리는 화면.
 *
 * **정적 셸과 동적 영역을 분리한다.** 이벤트 정보·공지·안내 문구는 세션과
 * 무관하므로 프리렌더된 셸에 남고, 세션을 읽는 세 영역만 각각 `<Suspense>`로
 * 감싼다. 경계를 크게 잡아 한 덩어리로 묶으면 그 사이의 정적 내용까지 캐시에서
 * 빠진다. `components/site-header.tsx`가 `AuthButton` 하나만 감싸는 것과 같은
 * 이유다. 세션 의존 컴포넌트는 `./sections.tsx`에 모여 있다.
 *
 * `params`(token)를 읽지 않는다. `cacheComponents` 환경에서 `params`는 동적
 * API라, 읽는 순간 셸 전체가 캐시 대상에서 빠져 이 페이지의 이점이 사라진다.
 * 실제 토큰 조회는 Task 009에서 함께 처리한다.
 *
 * 이 경로는 proxy 인증 예외라 비로그인으로 열린다. 비로그인 상태에서 이벤트
 * 정보는 보이고 응답 영역만 로그인을 유도한다.
 */

/** 동적 영역이 도착하기 전 자리. 높이를 잡아 두어 레이아웃이 튀지 않게 한다. */
function SectionSkeleton({ className }: { className?: string }) {
	return <div className={cn('bg-muted animate-pulse rounded-md', className)} />;
}

export default function InvitePage() {
	const event = makeEvent();
	const announcements = [makeAnnouncement()];

	const goingCount = countGoing(sampleParticipants());
	const mapHref = safeHref(event.location_url);
	const invitePath = `/e/${event.public_token}`;

	// 마감 판정은 세션과 무관하다. 정적 셸에서 끝내야 응답 차단 화면도 캐시된다.
	// Task 009에서는 이 비교의 기준이 FIXTURE_NOW가 아니라 DB의 now()가 된다.
	const deadlinePassed =
		event.rsvp_deadline !== null &&
		Date.parse(event.rsvp_deadline) <= Date.parse(FIXTURE_NOW);
	const canRespond = event.status === 'open' && !deadlinePassed;

	return (
		<main className="flex flex-col gap-5 py-4">
			<StatusBanner status={event.status} />

			<header className="flex flex-col gap-2">
				<h1 className="text-xl font-bold sm:text-2xl">{event.title}</h1>
				<p className="text-sm font-medium">
					{formatKST(event.starts_at, 'full')}
				</p>
				{event.location && (
					<p className="text-muted-foreground text-sm">
						{mapHref ? (
							// safeHref를 거치지 않으면 javascript: 스킴이 그대로 실행된다 (R18)
							<a
								href={mapHref}
								target="_blank"
								rel="noreferrer"
								className="underline underline-offset-4"
							>
								{event.location}
							</a>
						) : (
							event.location
						)}
					</p>
				)}
				<AttendanceSummary
					goingCount={goingCount}
					capacity={event.capacity}
					className="mt-0.5"
				/>
				{event.rsvp_deadline && (
					<p className="text-muted-foreground text-xs">
						응답 마감 {formatKST(event.rsvp_deadline, 'short')}
					</p>
				)}
				{event.description && (
					<p className="mt-1 text-sm whitespace-pre-line">
						{event.description}
					</p>
				)}
			</header>

			{/* PRD: 누적 공지는 상단에 노출한다. 장소·시간 변경 전달이 실사용에서 필수 */}
			{announcements.length > 0 && (
				<section className="border-border bg-muted/40 flex flex-col gap-2 rounded-md border px-3 py-2.5">
					<h2 className="text-xs font-semibold">공지</h2>
					<ul className="flex flex-col gap-2">
						{announcements.map(announcement => (
							<li key={announcement.id} className="flex flex-col gap-0.5">
								<p className="text-sm">{announcement.body}</p>
								<span className="text-muted-foreground text-xs">
									{formatKST(announcement.created_at, 'short')}
								</span>
							</li>
						))}
					</ul>
				</section>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">내 응답</CardTitle>
				</CardHeader>
				<CardContent>
					{canRespond ? (
						<Suspense fallback={<SectionSkeleton className="h-56" />}>
							<RsvpSection invitePath={invitePath} />
						</Suspense>
					) : (
						<p className="text-muted-foreground text-sm">
							{event.status === 'open'
								? '응답 마감이 지나 더 이상 응답을 받지 않습니다.'
								: '더 이상 응답을 받지 않습니다.'}
						</p>
					)}
				</CardContent>
			</Card>

			{/* 명단 공개는 주최자가 정한다 (R10). 비공개면 영역 자체를 렌더하지 않는다 */}
			{event.show_names && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">참석자</CardTitle>
					</CardHeader>
					<CardContent>
						<Suspense fallback={<SectionSkeleton className="h-16" />}>
							<AttendeeSection />
						</Suspense>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">내 정산</CardTitle>
				</CardHeader>
				<CardContent>
					<Suspense fallback={<SectionSkeleton className="h-24" />}>
						<SettlementSection />
					</Suspense>
				</CardContent>
			</Card>

			<p className="text-muted-foreground text-xs">
				응답하면 이름과 참석 이력이 주최자에게 전달됩니다.{' '}
				<Link href="/privacy" className="underline underline-offset-4">
					개인정보 처리방침
				</Link>
			</p>
		</main>
	);
}
