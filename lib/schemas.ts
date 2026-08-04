/**
 * 폼 입력 검증 스키마.
 *
 * 수치 제약은 `docs/MVP-PLAN.md`의 DDL `check`와 **정확히 일치해야 한다.**
 * Zod가 DB보다 느슨하면 클라이언트는 통과시키고 DB가 거부해, 사용자에게는
 * 원인을 알 수 없는 저장 실패로 보인다. 각 제약에 근거 DDL을 주석으로 달아 둔다.
 *
 * DDL에 check가 없는 필드(title, location, account_info 등)에는 UI 편의 상한만
 * 둔다. DB보다 **엄격한** 방향이라 위 문제가 생기지 않는다.
 */

import { z } from 'zod';
import { isSafeUrl } from '@/lib/url';

/** 빈 문자열을 undefined로 바꾼다. 선택 입력란이 비었을 때 검증을 건너뛰게 한다. */
const blankToUndefined = (value: unknown) =>
	value === '' || value === null ? undefined : value;

/** `<input type="datetime-local">` 값. KST 벽시계 문자열이다. */
const kstDateTimeInput = z.string().refine(value => {
	const normalized = value.length === 16 ? `${value}:00` : value;
	return !Number.isNaN(Date.parse(`${normalized}Z`));
}, '올바른 일시 형식이 아닙니다');

// ---------------------------------------------------------------------------
// 이벤트 생성
// ---------------------------------------------------------------------------

export const eventCreateSchema = z
	.object({
		// DDL: title text not null (길이 check 없음) — 아래는 UI 상한
		title: z
			.string()
			.min(1, '제목을 입력해 주세요')
			.max(100, '제목은 100자 이내로 입력해 주세요'),

		starts_at: kstDateTimeInput,

		// DDL: description text (check 없음) — UI 상한
		description: z.preprocess(
			blankToUndefined,
			z
				.string()
				.max(1000, '안내 문구는 1000자 이내로 입력해 주세요')
				.optional(),
		),

		// DDL: location text (check 없음) — UI 상한
		location: z.preprocess(
			blankToUndefined,
			z.string().max(100, '장소는 100자 이내로 입력해 주세요').optional(),
		),

		// R18: http/https 스킴만 허용. javascript: 스킴 차단
		location_url: z.preprocess(
			blankToUndefined,
			z
				.string()
				.refine(isSafeUrl, 'http:// 또는 https:// 로 시작하는 주소만 됩니다')
				.optional(),
		),

		// DDL: capacity int (check 없음). null이면 무제한 (R14)
		capacity: z.preprocess(
			blankToUndefined,
			z.coerce
				.number()
				.int('정원은 정수로 입력해 주세요')
				.min(1, '정원은 1명 이상이어야 합니다')
				.max(500, '정원은 500명을 넘을 수 없습니다')
				.optional(),
		),

		rsvp_deadline: z.preprocess(blankToUndefined, kstDateTimeInput.optional()),
	})
	// 마감이 모임 시작보다 늦으면 응답할 수 없는 이벤트가 된다.
	.refine(
		data =>
			!data.rsvp_deadline ||
			Date.parse(data.rsvp_deadline) <= Date.parse(data.starts_at),
		{
			message: '응답 마감은 모임 일시보다 앞서야 합니다',
			path: ['rsvp_deadline'],
		},
	);

export type EventCreateInput = z.infer<typeof eventCreateSchema>;

// ---------------------------------------------------------------------------
// 참석 응답
// ---------------------------------------------------------------------------

export const rsvpSchema = z.object({
	// DDL: check (status in ('going','not_going','maybe'))
	status: z.enum(['going', 'not_going', 'maybe'], {
		message: '참석 여부를 선택해 주세요',
	}),

	// DDL: check (guest_count between 0 and 10)
	guest_count: z.coerce
		.number()
		.int('동반 인원은 정수로 입력해 주세요')
		.min(0, '동반 인원은 0명 이상이어야 합니다')
		.max(10, '동반 인원은 10명까지 입력할 수 있습니다'),

	// DDL: check (char_length(note) <= 200). 주최자에게만 노출 (R10)
	note: z.preprocess(
		blankToUndefined,
		z.string().max(200, '한마디는 200자 이내로 입력해 주세요').optional(),
	),

	// DDL: check (char_length(display_name) between 1 and 20)
	// 주최자가 계정 없는 사람을 대리 등록할 때만 쓴다. 비우면 profiles.full_name
	display_name: z.preprocess(
		blankToUndefined,
		z
			.string()
			.min(1, '이름을 입력해 주세요')
			.max(20, '이름은 20자 이내로 입력해 주세요')
			.optional(),
	),
});

export type RsvpInput = z.infer<typeof rsvpSchema>;

// ---------------------------------------------------------------------------
// 정산
// ---------------------------------------------------------------------------

export const settlementSchema = z.object({
	// DDL: title text not null (길이 check 없음) — UI 상한
	title: z
		.string()
		.min(1, '정산 항목명을 입력해 주세요')
		.max(50, '정산 항목명은 50자 이내로 입력해 주세요'),

	// DDL: check (total_amount >= 0)
	total_amount: z.coerce
		.number()
		.int('금액은 정수로 입력해 주세요')
		.min(0, '금액은 0원 이상이어야 합니다'),

	// DDL: account_info text (check 없음) — UI 상한
	account_info: z.preprocess(
		blankToUndefined,
		z.string().max(100, '계좌 정보는 100자 이내로 입력해 주세요').optional(),
	),
});

export type SettlementInput = z.infer<typeof settlementSchema>;

// ---------------------------------------------------------------------------
// 공지
// ---------------------------------------------------------------------------

/** 요청받은 3종 외 추가분. DDL에 길이 check가 있어 지금 맞춰 둔다. */
export const announcementSchema = z.object({
	// DDL: check (char_length(body) <= 1000)
	body: z
		.string()
		.min(1, '공지 내용을 입력해 주세요')
		.max(1000, '공지는 1000자 이내로 입력해 주세요'),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;
