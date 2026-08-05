import { CopyButton } from '@/components/copy-button';
import { EmptyState } from '@/components/empty-state';
import { RsvpBadge } from '@/components/rsvp-badge';
import { RsvpForm, type RsvpAnswer } from '@/components/rsvp-form';
import { SocialAuthButtons } from '@/components/social-auth-buttons';
import {
	makeParticipant,
	makeSettlement,
	makeSettlementShare,
	participantDisplayName,
	samplePublicParticipants,
} from '@/lib/fixtures';
import { createClient } from '@/lib/supabase/server';
import { hasEnvVars } from '@/lib/utils';

/**
 * 초대 페이지의 **세션 의존 영역**.
 *
 * 여기 있는 컴포넌트는 전부 `getClaims()`를 호출하므로 `cacheComponents: true`
 * 환경에서 동적이다. 호출부(`page.tsx`)가 각각을 개별 `<Suspense>`로 감싸며,
 * 페이지의 나머지(이벤트 정보·공지·안내)는 정적 셸로 남는다. 한 덩어리로
 * 묶어 하나의 경계에 넣으면 그 사이의 정적 내용까지 캐시에서 빠진다.
 *
 * 파일을 `page.tsx`와 분리한 이유는 정적/동적 경계를 파일 단위로 눈에
 * 보이게 하기 위해서다. `app/` 안의 비특수 파일이라 라우팅되지 않는다.
 */

/**
 * 로그인 여부. 세 영역이 각자의 경계 안에서 따로 읽는다.
 *
 * `hasEnvVars` 가드는 `components/site-header.tsx`와 같은 이유다. 환경 변수가
 * 없으면 `createClient()`가 던지는데, 그 상태에서도 초대 페이지의 정적 셸은
 * 보여야 한다.
 */
async function isSignedIn(): Promise<boolean> {
	if (!hasEnvVars) return false;

	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();
	return Boolean(data?.claims);
}

/**
 * 응답 영역 (F003).
 *
 * 마감·취소 판정은 세션과 무관하므로 호출부의 정적 셸이 담당한다.
 * 여기 도달했다는 것은 이미 "응답 가능한 모임"이라는 뜻이다.
 */
export async function RsvpSection({ invitePath }: { invitePath: string }) {
	const signedIn = await isSignedIn();

	if (!signedIn) {
		return (
			<div className="flex flex-col gap-3">
				<p className="text-sm">
					참석 여부를 남기려면 로그인이 필요해요. 이름과 응답만 주최자에게
					전달됩니다.
				</p>
				{/* 카카오 우선 배치는 이 컴포넌트가 이미 보장한다. next로 이 페이지에 복귀 */}
				<SocialAuthButtons next={invitePath} />
			</div>
		);
	}

	// Phase 2에서는 기존 응답이 있는 상태를 렌더한다. `existing`이 null이면
	// 첫 응답 모드로 열리며, 실제 조회는 Task 009에서 붙인다.
	const mine = makeParticipant({
		status: 'going',
		guest_count: 1,
		note: '조금 늦을 수도 있어요',
	});
	const existing: RsvpAnswer = {
		status: mine.status,
		guest_count: mine.guest_count,
		note: mine.note,
	};

	return <RsvpForm existing={existing} />;
}

/**
 * 참석자 명단 (F004).
 * 주최자가 명단을 공개한 경우에만 호출부가 렌더한다 (R10).
 */
export async function AttendeeSection() {
	const signedIn = await isSignedIn();

	if (!signedIn) {
		return (
			<p className="text-muted-foreground text-sm">
				로그인하면 참석자 명단을 볼 수 있어요.
			</p>
		);
	}

	// ParticipantPublic — note가 타입에 없다. 실수로 렌더하면 컴파일이 깨진다.
	const attendees = samplePublicParticipants().filter(
		participant => participant.status !== 'not_going',
	);

	if (attendees.length === 0) {
		return <EmptyState title="아직 응답한 사람이 없어요" />;
	}

	return (
		<ul className="flex flex-wrap gap-2">
			{attendees.map(participant => (
				<li
					key={participant.id}
					className="bg-muted flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1.5 text-sm"
				>
					<RsvpBadge status={participant.status} />
					<span className="max-w-32 truncate">
						{participantDisplayName(participant)}
					</span>
					{participant.guest_count > 0 && (
						<span className="text-muted-foreground text-xs">
							+{participant.guest_count}
						</span>
					)}
				</li>
			))}
		</ul>
	);
}

/**
 * 본인 정산 몫과 입금 여부 (F009).
 *
 * 참여자는 **읽기만** 한다. 입금 확인 체크는 주최자 권한이며
 * `components/host-controls.tsx`의 `PaymentCheck`가 담당한다.
 */
export async function SettlementSection() {
	const signedIn = await isSignedIn();

	if (!signedIn) {
		return (
			<p className="text-muted-foreground text-sm">
				로그인하면 본인 정산 내역을 볼 수 있어요.
			</p>
		);
	}

	const settlement = makeSettlement();
	const share = makeSettlementShare();

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-baseline justify-between gap-3">
				<span className="text-sm">{settlement.title}</span>
				<span className="text-base font-semibold">
					{share.amount.toLocaleString('ko-KR')}원
				</span>
			</div>
			<div className="flex items-center justify-between gap-3">
				<span className="text-muted-foreground text-sm">입금 여부</span>
				<span className="text-sm font-medium">
					{share.paid ? '입금 확인됨' : '미입금'}
				</span>
			</div>
			{settlement.account_info && (
				<div className="flex flex-wrap items-center gap-2 pt-1">
					<span className="text-muted-foreground text-sm">
						{settlement.account_info}
					</span>
					<CopyButton text={settlement.account_info} label="계좌 복사" />
				</div>
			)}
		</div>
	);
}
