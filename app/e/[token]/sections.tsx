import { CopyButton } from '@/components/copy-button';
import { EmptyState } from '@/components/empty-state';
import { RsvpBadge } from '@/components/rsvp-badge';
import { RsvpForm, type RsvpAnswer } from '@/components/rsvp-form';
import { SocialAuthButtons } from '@/components/social-auth-buttons';
import { resolveEventId } from '@/lib/event-lookup';
import { createClient } from '@/lib/supabase/server';
import { hasEnvVars } from '@/lib/utils';
import type { RsvpStatus, Settlement } from '@/types/database';

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
 * 로그인한 사용자의 uid. 세 영역이 각자의 경계 안에서 따로 읽는다.
 *
 * `hasEnvVars` 가드는 `components/site-header.tsx`와 같은 이유다. 환경 변수가
 * 없으면 `createClient()`가 던지는데, 그 상태에서도 초대 페이지의 정적 셸은
 * 보여야 한다.
 */
async function getUid(): Promise<string | null> {
	if (!hasEnvVars) return null;

	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();
	return data?.claims?.sub ?? null;
}

/**
 * 응답 영역 (F003).
 *
 * 마감·취소 판정은 세션과 무관하므로 호출부의 정적 셸이 담당한다.
 * 여기 도달했다는 것은 이미 "응답 가능한 모임"이라는 뜻이다.
 */
export async function RsvpSection({
	token,
	invitePath,
}: {
	token: string;
	invitePath: string;
}) {
	const uid = await getUid();

	if (!uid) {
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

	const supabase = await createClient();
	const event = await resolveEventId(supabase, token);

	// event가 null이면 아직 참여하지 않은 사용자다(events_select RLS가 막는다) —
	// 첫 응답 모드로 연다. join_event RPC는 토큰만으로 동작하므로 이 경우에도
	// 문제없이 저장된다.
	let existing: RsvpAnswer | null = null;
	if (event) {
		const { data, error } = await supabase
			.from('participants')
			.select('status, guest_count, note')
			.eq('event_id', event.id)
			.eq('user_id', uid)
			.maybeSingle();
		if (error) throw error;
		existing = data as RsvpAnswer | null;
	}

	return <RsvpForm token={token} existing={existing} />;
}

/**
 * 참석자 명단 (F004).
 * 주최자가 명단을 공개한 경우에만 호출부가 렌더한다 (R10).
 */
export async function AttendeeSection({ token }: { token: string }) {
	const uid = await getUid();

	if (!uid) {
		return (
			<p className="text-muted-foreground text-sm">
				로그인하면 참석자 명단을 볼 수 있어요.
			</p>
		);
	}

	const supabase = await createClient();
	const event = await resolveEventId(supabase, token);

	// 아직 참여하지 않은 사용자는 명단을 볼 참여자/호스트 자격이 없다.
	if (!event) {
		return (
			<p className="text-muted-foreground text-sm">
				참석 응답 후 확인할 수 있어요.
			</p>
		);
	}

	// get_event_participants가 note를 반환하지 않는다(R10). 반환 필드가
	// display_name·status·guest_count로 고정이라 id가 없어 index를 key에 섞는다.
	const { data, error } = await supabase.rpc('get_event_participants', {
		p_event_id: event.id,
	});
	if (error) throw error;

	const attendees = (
		(data ?? []) as {
			display_name: string;
			status: RsvpStatus;
			guest_count: number;
		}[]
	).filter(participant => participant.status !== 'not_going');

	if (attendees.length === 0) {
		return <EmptyState title="아직 응답한 사람이 없어요" />;
	}

	return (
		<ul className="flex flex-wrap gap-2">
			{attendees.map((participant, index) => (
				<li
					key={`${participant.display_name}-${index}`}
					className="bg-muted flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1.5 text-sm"
				>
					<RsvpBadge status={participant.status} />
					<span className="max-w-32 truncate">{participant.display_name}</span>
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
export async function SettlementSection({ token }: { token: string }) {
	const uid = await getUid();

	if (!uid) {
		return (
			<p className="text-muted-foreground text-sm">
				로그인하면 본인 정산 내역을 볼 수 있어요.
			</p>
		);
	}

	const supabase = await createClient();
	const event = await resolveEventId(supabase, token);
	if (!event) {
		return (
			<p className="text-muted-foreground text-sm">
				참석 응답 후 확인할 수 있어요.
			</p>
		);
	}

	const { data: myParticipant } = await supabase
		.from('participants')
		.select('id')
		.eq('event_id', event.id)
		.eq('user_id', uid)
		.maybeSingle();

	if (!myParticipant) {
		return (
			<p className="text-muted-foreground text-sm">
				참석 응답 후 확인할 수 있어요.
			</p>
		);
	}

	// settlement_shares_self RLS(본인 참여자 행)와 settlements_participant_select
	// RLS(본인이 참여 중인 이벤트) 양쪽을 통과해야 임베디드 조회가 성공한다.
	const { data, error } = await supabase
		.from('settlement_shares')
		.select('id, amount, paid, settlements(*)')
		.eq('participant_id', myParticipant.id)
		.maybeSingle();
	if (error) throw error;

	if (!data) {
		return <EmptyState title="아직 정산이 없어요" />;
	}

	const share = data as unknown as {
		id: string;
		amount: number;
		paid: boolean;
		settlements: Settlement;
	};
	const settlement = share.settlements;

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
