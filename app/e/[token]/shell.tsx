import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { AttendanceSummary } from '@/components/attendance-summary';
import { StatusBanner } from '@/components/status-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatKST } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import { safeHref } from '@/lib/url';
import { cn } from '@/lib/utils';
import type { EventPreview } from '@/types/database';
import { AttendeeSection, RsvpSection, SettlementSection } from './sections';

/**
 * 초대 페이지의 **토큰 의존 영역** — 이벤트 정보·공지.
 *
 * `params`(token)를 읽으면 `cacheComponents` 환경에서 이 하위 트리 전체가
 * 동적이 된다(정적 프리렌더 대상에서 빠짐). `page.tsx`가 이 컴포넌트 하나만
 * `<Suspense>`로 감싸는 이유다. 그 안에서 세션 의존 3영역(`RsvpSection` 등)은
 * 각자 독립된 `<Suspense>`를 또 갖는다 — 셋 중 하나가 늦어도 나머지는 먼저 뜬다.
 */

interface AnnouncementPreview {
	id: string;
	body: string;
	created_at: string;
}

/** 동적 영역이 도착하기 전 자리. 높이를 잡아 두어 레이아웃이 튀지 않게 한다. */
function SectionSkeleton({ className }: { className?: string }) {
	return <div className={cn('bg-muted animate-pulse rounded-md', className)} />;
}

/**
 * `Date.now()` 직접 호출은 컴포넌트 함수 안에서 impure 호출로 lint에 걸린다
 * (react-hooks/purity). 일반 헬퍼로 빼면 검사 대상에서 빠진다.
 */
function isDeadlinePassed(rsvpDeadline: string | null): boolean {
	return rsvpDeadline !== null && Date.parse(rsvpDeadline) <= Date.now();
}

export async function InviteShell({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;
	const supabase = await createClient();

	const [{ data: eventData }, { data: announcementsData }] = await Promise.all([
		supabase.rpc('get_event_preview', { p_token: token }).maybeSingle(),
		supabase.rpc('get_event_announcements', { p_token: token }),
	]);

	const event = eventData as EventPreview | null;
	if (!event) notFound();

	const announcements = (announcementsData ?? []) as AnnouncementPreview[];
	const invitePath = `/e/${token}`;

	const canRespond =
		event.status === 'open' && !isDeadlinePassed(event.rsvp_deadline);
	const mapHref = safeHref(event.location_url);

	return (
		<>
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
					goingCount={event.going_count}
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
		</>
	);
}
