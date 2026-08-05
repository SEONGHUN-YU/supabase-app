/**
 * 더미 데이터 팩토리.
 *
 * Phase 2에서 DB 없이 화면을 렌더하려고 쓴다. Task 007에서 실제 마이그레이션이
 * 올라가면 호출부를 실제 쿼리로 교체하고 이 파일은 지운다.
 *
 * **모든 값이 결정론적이다.** `Math.random()`이나 `Date.now()`를 쓰면 서버
 * 렌더와 클라이언트 하이드레이션이 다른 값을 만들어 React가 경고를 뱉는다.
 * 고정 기준 시각(`BASE_MS`)에서 상대적으로 계산하는 이유다.
 */

import type {
	Announcement,
	Event,
	EventSummary,
	Participant,
	Settlement,
	SettlementShare,
} from '@/types/database';

/** 기준 시각. KST 2026년 9월 12일 (토) 오후 7:00 */
const BASE_MS = Date.parse('2026-09-12T10:00:00Z');

/**
 * 더미 화면에서 "지금"으로 취급할 시각.
 *
 * `Date.now()`를 쓰지 않는 이유가 두 가지다. (1) `cacheComponents` 환경에서
 * 프리렌더 중 현재 시각을 읽으면 결과가 결정론적이지 않다. (2) 서버와
 * 클라이언트가 다른 값을 보면 하이드레이션이 어긋난다.
 *
 * Task 008에서는 이 상수가 사라진다. 다가오는/지난 구분은 UI가 아니라
 * `where starts_at >= now()` 같은 DB 쿼리가 담당하게 되기 때문이다.
 */
export const FIXTURE_NOW = new Date(BASE_MS).toISOString();

const DAY_MS = 24 * 60 * 60 * 1000;

/** 시드에서 UUID 모양 문자열을 만든다. 디버깅할 때 눈으로 구분하기 쉽다. */
function fakeUuid(seed: number): string {
	return `00000000-0000-4000-8000-${String(seed).padStart(12, '0')}`;
}

function isoFromBase(offsetDays: number): string {
	return new Date(BASE_MS + offsetDays * DAY_MS).toISOString();
}

export function makeEvent(overrides: Partial<Event> = {}): Event {
	return {
		id: fakeUuid(1),
		host_id: fakeUuid(900),
		public_token: 'abc123XYZ789',
		title: '주말 한강 러닝',
		description: '가볍게 5km 뛰고 근처에서 저녁 먹어요.',
		starts_at: isoFromBase(0),
		location: '뚝섬유원지역 2번 출구',
		location_url: 'https://map.naver.com/p/entry/place/11669188',
		capacity: 12,
		rsvp_deadline: isoFromBase(-1),
		status: 'open',
		show_names: true,
		created_at: isoFromBase(-7),
		...overrides,
	};
}

export function makeParticipant(
	overrides: Partial<Participant> = {},
): Participant {
	return {
		id: fakeUuid(11),
		event_id: fakeUuid(1),
		user_id: fakeUuid(901),
		display_name: null,
		status: 'going',
		guest_count: 0,
		note: null,
		created_at: isoFromBase(-5),
		updated_at: isoFromBase(-5),
		...overrides,
	};
}

export function makeAnnouncement(
	overrides: Partial<Announcement> = {},
): Announcement {
	return {
		id: fakeUuid(21),
		event_id: fakeUuid(1),
		body: '비 예보가 있어 우비 챙겨 오세요.',
		created_at: isoFromBase(-2),
		...overrides,
	};
}

export function makeSettlement(
	overrides: Partial<Settlement> = {},
): Settlement {
	return {
		id: fakeUuid(31),
		event_id: fakeUuid(1),
		title: '뒤풀이 식사비',
		total_amount: 84000,
		account_info: '카카오뱅크 3333-01-1234567 홍길동',
		created_at: isoFromBase(1),
		...overrides,
	};
}

export function makeSettlementShare(
	overrides: Partial<SettlementShare> = {},
): SettlementShare {
	return {
		id: fakeUuid(41),
		settlement_id: fakeUuid(31),
		participant_id: fakeUuid(11),
		amount: 12000,
		paid: false,
		paid_at: null,
		...overrides,
	};
}

/**
 * 참여자 목록 표본.
 * 상태 3종과 동반 인원·대리 등록(user_id 없음)·한마디를 모두 섞어 두어
 * 화면이 빈 값과 경계값을 어떻게 다루는지 바로 드러나게 했다.
 */
export function sampleParticipants(): Participant[] {
	return [
		makeParticipant({
			id: fakeUuid(11),
			user_id: fakeUuid(901),
			status: 'going',
			guest_count: 1,
			note: '조금 늦을 수도 있어요',
		}),
		makeParticipant({
			id: fakeUuid(12),
			user_id: fakeUuid(902),
			status: 'going',
			guest_count: 0,
		}),
		makeParticipant({
			id: fakeUuid(13),
			user_id: null,
			display_name: '김대리등록',
			status: 'going',
			guest_count: 2,
		}),
		makeParticipant({
			id: fakeUuid(14),
			user_id: fakeUuid(903),
			status: 'maybe',
			guest_count: 0,
			note: '일정 확인 중입니다',
		}),
		makeParticipant({
			id: fakeUuid(15),
			user_id: fakeUuid(904),
			status: 'not_going',
			guest_count: 0,
		}),
	];
}

/**
 * 픽스처 사용자의 표시 이름.
 * 실제로는 `participants ⨝ profiles`로 얻는 값이라 Task 009에서 사라진다.
 */
const FIXTURE_PROFILE_NAMES: Record<string, string> = {
	[fakeUuid(901)]: '박수영',
	[fakeUuid(902)]: '이한강',
	[fakeUuid(903)]: '최미정',
	[fakeUuid(904)]: '정불참',
};

/**
 * 참여자 표시 이름 해석 순서.
 *
 * 1. `display_name` — 주최자가 계정 없는 사람을 대리 등록한 경우
 * 2. `profiles.full_name` — 소셜 로그인에서 받은 닉네임
 * 3. `'이름 없음'` — 둘 다 없을 때. 카카오 닉네임 동의를 거부한 계정에서
 *    실제로 발생할 수 있으므로 최종 폴백이 필요하다
 */
export function participantDisplayName(participant: Participant): string {
	if (participant.display_name) return participant.display_name;
	if (participant.user_id) {
		return FIXTURE_PROFILE_NAMES[participant.user_id] ?? '이름 없음';
	}
	return '이름 없음';
}

/** 동반 인원을 합산한 참석 총원. `get_event_preview`의 going_count와 같은 계산이다. */
export function countGoing(participants: Participant[]): number {
	return participants
		.filter(participant => participant.status === 'going')
		.reduce((total, participant) => total + 1 + participant.guest_count, 0);
}

/**
 * 대시보드 목록 표본.
 * 다가오는 모임·마감된 모임·취소된 모임·지난 모임을 한 벌씩 담았다.
 */
export function sampleDashboard(): EventSummary[] {
	return [
		{ ...makeEvent(), going_count: countGoing(sampleParticipants()) },
		{
			...makeEvent({
				id: fakeUuid(2),
				public_token: 'def456UVW012',
				title: '금요일 볼링 모임',
				description: null,
				starts_at: isoFromBase(5),
				location: '강남 스트라이크존',
				location_url: null,
				capacity: null,
				rsvp_deadline: null,
				status: 'closed',
			}),
			going_count: 8,
		},
		{
			...makeEvent({
				id: fakeUuid(3),
				public_token: 'ghi789RST345',
				title: '수요일 클라이밍',
				description: null,
				starts_at: isoFromBase(-3),
				location: '더클라임 신촌점',
				location_url: null,
				capacity: 6,
				rsvp_deadline: null,
				status: 'cancelled',
				show_names: false,
			}),
			going_count: 0,
		},
	];
}
