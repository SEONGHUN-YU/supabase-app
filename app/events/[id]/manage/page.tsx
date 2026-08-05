import Link from 'next/link';
import { AttendanceSummary } from '@/components/attendance-summary';
import { CopyButton } from '@/components/copy-button';
import { EmptyState } from '@/components/empty-state';
import {
	AnnouncementForm,
	PaymentCheck,
	ShowNamesToggle,
	StatusSelect,
} from '@/components/host-controls';
import { RsvpBadge } from '@/components/rsvp-badge';
import { StatusBanner } from '@/components/status-banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatKST } from '@/lib/date';
import {
	countGoing,
	makeAnnouncement,
	makeEvent,
	makeSettlement,
	participantDisplayName,
	sampleParticipants,
} from '@/lib/fixtures';
import { safeHref } from '@/lib/url';
import type { Participant, RsvpStatus } from '@/types/database';

/**
 * 이벤트 관리 페이지 — 주최자의 단일 작업 공간.
 *
 * `params`를 읽지 않는다. `cacheComponents` 환경에서 `params`는 동적 API라
 * 읽는 순간 `<Suspense>` 경계가 필요해진다. 더미 단계에서는 불필요한
 * 복잡도이므로 고정 이벤트를 렌더하고, 실제 연동은 Task 008에서 함께 처리한다.
 */

const STATUS_ORDER: RsvpStatus[] = ['going', 'maybe', 'not_going'];

function ParticipantRow({ participant }: { participant: Participant }) {
	return (
		<li className="flex items-center justify-between gap-3 py-2">
			<div className="flex min-w-0 items-center gap-2">
				<RsvpBadge status={participant.status} />
				<span className="truncate text-sm">
					{participantDisplayName(participant)}
				</span>
				{participant.guest_count > 0 && (
					<span className="text-muted-foreground shrink-0 text-xs">
						+{participant.guest_count}
					</span>
				)}
			</div>
			{participant.user_id === null && (
				<span className="text-muted-foreground shrink-0 text-xs">
					대리 등록
				</span>
			)}
		</li>
	);
}

export default function ManageEventPage() {
	const event = makeEvent();
	const participants = sampleParticipants();
	const announcements = [makeAnnouncement()];
	const settlement = makeSettlement();

	const goingCount = countGoing(participants);
	const mapHref = safeHref(event.location_url);
	const notes = participants.filter(participant => participant.note !== null);

	// 정산 분담금은 참석자 수(동반 포함)로 나눈다. 나머지는 주최자 귀속.
	const shareAmount = Math.floor(settlement.total_amount / goingCount);

	return (
		<main className="flex flex-col gap-6 py-6">
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
					<CardContent className="flex flex-col gap-4">
						{STATUS_ORDER.map(status => {
							const group = participants.filter(
								participant => participant.status === status,
							);
							if (group.length === 0) return null;
							return (
								<ul key={status} className="divide-y">
									{group.map(participant => (
										<ParticipantRow
											key={participant.id}
											participant={participant}
										/>
									))}
								</ul>
							);
						})}
						<Button variant="outline" size="sm" className="self-start">
							참여자 직접 추가
						</Button>
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
											{participantDisplayName(participant)}
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
					<AnnouncementForm />
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
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">공유</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-2">
					<CopyButton
						text={`/e/${event.public_token}`}
						label="초대 링크 복사"
					/>
					<CopyButton
						text={`[${event.title}]\n${formatKST(event.starts_at, 'full')}\n\n참석 여부를 알려주세요`}
						label="공유 문구 복사"
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">설정</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					<ShowNamesToggle defaultValue={event.show_names} />
					<StatusSelect defaultValue={event.status} />
					<Button variant="outline" size="sm" asChild className="self-start">
						<Link href="/events/new">이 모임 복제</Link>
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">정산</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
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
							<CopyButton text={settlement.account_info} label="계좌 복사" />
						</div>
					)}

					<ul className="divide-y border-t pt-2">
						{participants
							.filter(participant => participant.status === 'going')
							.map((participant, index) => (
								<li key={participant.id}>
									<PaymentCheck
										id={`paid-${participant.id}`}
										label={participantDisplayName(participant)}
										amount={shareAmount}
										defaultPaid={index === 0}
									/>
								</li>
							))}
					</ul>
				</CardContent>
			</Card>
		</main>
	);
}
