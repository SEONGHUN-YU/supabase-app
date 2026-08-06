import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { AttendanceSummary } from '@/components/attendance-summary';
import { CopyButton } from '@/components/copy-button';
import { EmptyState } from '@/components/empty-state';
import {
	AnnouncementForm,
	PaymentCheck,
	ShowNamesToggle,
	StatusSelect,
} from '@/components/host-controls';
import { ParticipantManager } from '@/components/participant-manager';
import { StatusBanner } from '@/components/status-banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatKST } from '@/lib/date';
import { countGoing } from '@/lib/fixtures';
import {
	buildAnnouncementShareText,
	buildSettlementShareText,
} from '@/lib/share-text';
import { createClient } from '@/lib/supabase/server';
import { safeHref } from '@/lib/url';
import type {
	Announcement,
	Event,
	Participant,
	Settlement,
} from '@/types/database';

/**
 * 이벤트 관리 페이지 — 주최자의 단일 작업 공간.
 *
 * `/events/[id]/manage`는 proxy 인증 예외에 없는 로그인 전용 라우트고,
 * 페이지 전체가 host 인증 여부에 의존한다. `/e/[token]`의 '좁게' 원칙이
 * 존재하는 이유(정적 셸 캐시 이점)가 여기엔 해당하지 않으므로, 데이터
 * 조회 전체를 단일 `<Suspense>`로 감싼다.
 */

async function ManageEventContent({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const supabase = await createClient();

	const { data: session } = await supabase.auth.getClaims();
	const uid = session?.claims?.sub;

	const { data: eventData } = await supabase
		.from('events')
		.select('*')
		.eq('id', id)
		.maybeSingle();
	const event = eventData as Event | null;

	// events_select RLS는 호스트뿐 아니라 참여자에게도 읽기를 허용하므로,
	// 참여자가 남의 관리 페이지에 들어오는 경우를 여기서 따로 막는다.
	if (!event || event.host_id !== uid) notFound();

	const [
		{ data: participantsData },
		{ data: nameRows },
		{ data: announcementsData },
		{ data: settlementData },
	] = await Promise.all([
		supabase
			.from('participants')
			.select('*')
			.eq('event_id', id)
			.order('created_at', { ascending: true }),
		supabase.rpc('get_host_participant_names', { p_event_id: id }),
		supabase
			.from('announcements')
			.select('*')
			.eq('event_id', id)
			.order('created_at', { ascending: false }),
		supabase
			.from('settlements')
			.select('*')
			.eq('event_id', id)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle(),
	]);

	const participants = (participantsData ?? []) as Participant[];
	const announcements = (announcementsData ?? []) as Announcement[];
	const settlement = settlementData as Settlement | null;

	// profiles RLS가 본인 행만 허용해 participants ⨝ profiles를 직접 못 하므로
	// get_host_participant_names(호스트 전용 SECURITY DEFINER)로 이름만 따로 받는다.
	const hostParticipantNames = (nameRows ?? []) as {
		user_id: string;
		full_name: string | null;
	}[];
	const profileNames = Object.fromEntries(
		hostParticipantNames.map(row => [row.user_id, row.full_name ?? '']),
	) as Record<string, string>;

	function displayName(participant: Participant): string {
		if (participant.display_name) return participant.display_name;
		if (participant.user_id)
			return profileNames[participant.user_id] || '이름 없음';
		return '이름 없음';
	}

	const goingCount = countGoing(participants);
	const mapHref = safeHref(event.location_url);
	const notes = participants.filter(participant => participant.note !== null);
	const participantItems = participants.map(participant => ({
		participant,
		displayName: displayName(participant),
	}));

	// 정산 분담금은 참석자 수(동반 포함)로 나눈다. 나머지는 주최자 귀속.
	const shareAmount =
		settlement && goingCount > 0
			? Math.floor(settlement.total_amount / goingCount)
			: 0;

	const invitePath = `/e/${event.public_token}`;
	const latestAnnouncement = announcements[0] ?? null;

	return (
		<>
			<div className="flex flex-col gap-2">
				<Link
					href="/dashboard"
					className="text-muted-foreground text-sm hover:underline"
				>
					← 대시보드
				</Link>
				<h1 className="text-2xl font-bold">{event.title}</h1>
				<p className="text-muted-foreground text-sm">
					{formatKST(event.starts_at, 'full')}
				</p>
				{event.location && (
					<p className="text-sm">
						{mapHref ? (
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
					className="mt-1"
				/>
			</div>

			<StatusBanner status={event.status} />

			<div className="grid gap-6 sm:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">참여자</CardTitle>
					</CardHeader>
					<CardContent>
						<ParticipantManager eventId={id} items={participantItems} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							한마디
							<span className="text-muted-foreground ml-2 text-xs font-normal">
								주최자에게만 보입니다
							</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{notes.length === 0 ? (
							<EmptyState title="아직 남긴 한마디가 없어요" />
						) : (
							<ul className="flex flex-col gap-3">
								{notes.map(participant => (
									<li key={participant.id} className="flex flex-col gap-0.5">
										<span className="text-muted-foreground text-xs">
											{displayName(participant)}
										</span>
										<p className="text-sm">{participant.note}</p>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">공지</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<AnnouncementForm eventId={id} />
					{announcements.length === 0 ? (
						<EmptyState title="아직 공지가 없어요" />
					) : (
						<ul className="flex flex-col gap-3 border-t pt-4">
							{announcements.map(announcement => (
								<li key={announcement.id} className="flex flex-col gap-0.5">
									<span className="text-muted-foreground text-xs">
										{formatKST(announcement.created_at, 'short')}
									</span>
									<p className="text-sm">{announcement.body}</p>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">공유</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-2">
					<CopyButton text={invitePath} label="초대 링크 복사" />
					<CopyButton
						text={`[${event.title}]\n${formatKST(event.starts_at, 'full')}\n\n참석 여부를 알려주세요`}
						label="공유 문구 복사"
					/>
					{latestAnnouncement && (
						<CopyButton
							text={buildAnnouncementShareText(
								event.title,
								latestAnnouncement.body,
								goingCount,
								event.capacity,
								invitePath,
							)}
							label="공지 공유 문구 복사"
						/>
					)}
					{settlement && (
						<CopyButton
							text={buildSettlementShareText(
								event.title,
								settlement.title,
								settlement.total_amount,
								invitePath,
							)}
							label="정산 요청 문구 복사"
						/>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">설정</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					<ShowNamesToggle eventId={id} defaultValue={event.show_names} />
					<StatusSelect eventId={id} defaultValue={event.status} />
					<Button variant="outline" size="sm" asChild className="self-start">
						<Link href={`/events/new?duplicate=${id}`}>이 모임 복제</Link>
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">정산</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{settlement ? (
						<>
							<div className="flex flex-col gap-1">
								<p className="font-medium">{settlement.title}</p>
								<p className="text-muted-foreground text-sm">
									총 {settlement.total_amount.toLocaleString('ko-KR')}원 · 참석{' '}
									{goingCount}명 · 1인 {shareAmount.toLocaleString('ko-KR')}원
								</p>
							</div>

							{settlement.account_info && (
								<div className="flex items-center gap-2">
									<span className="text-sm">{settlement.account_info}</span>
									<CopyButton
										text={settlement.account_info}
										label="계좌 복사"
									/>
								</div>
							)}

							<ul className="divide-y border-t pt-2">
								{participants
									.filter(participant => participant.status === 'going')
									.map(participant => (
										<li key={participant.id}>
											<PaymentCheck
												id={`paid-${participant.id}`}
												label={displayName(participant)}
												amount={shareAmount}
												defaultPaid={false}
											/>
										</li>
									))}
							</ul>
						</>
					) : (
						<EmptyState title="아직 정산이 없어요" />
					)}
				</CardContent>
			</Card>
		</>
	);
}

function ManageSkeleton() {
	return (
		<div className="flex flex-col gap-3">
			<div className="bg-muted h-8 w-64 animate-pulse rounded-md" />
			<div className="bg-muted h-40 animate-pulse rounded-md" />
			<div className="bg-muted h-40 animate-pulse rounded-md" />
		</div>
	);
}

export default function ManageEventPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	return (
		<main className="flex flex-col gap-6 py-6">
			<Suspense fallback={<ManageSkeleton />}>
				<ManageEventContent params={params} />
			</Suspense>
		</main>
	);
}
