/**
 * DB 테이블 행 타입.
 *
 * `docs/MVP-PLAN.md`의 DDL을 옮긴 **수기 정의**다. Task 007에서 마이그레이션을
 * 적용한 뒤 Supabase MCP의 `generate_typescript_types`로 생성한 타입과 정합성을
 * 대조한다. 그때까지는 이 파일이 유일한 계약이다.
 *
 * 필드명은 DB 컬럼명(snake_case)을 그대로 쓴다. 중간에 camelCase로 바꾸면
 * 쿼리 결과를 매번 변환해야 하고 오타가 런타임까지 살아남는다.
 */

/** 모임 상태. DDL: `check (status in ('open','closed','cancelled'))` */
export type EventStatus = 'open' | 'closed' | 'cancelled';

/** 참석 응답. DDL: `check (status in ('going','not_going','maybe'))` */
export type RsvpStatus = 'going' | 'not_going' | 'maybe';

/**
 * `timestamptz` 컬럼. Supabase는 ISO 8601 문자열로 돌려준다.
 * `Date`로 쓰지 않는 이유는 JSON 왕복에서 문자열로 되돌아가기 때문이다.
 * 출력할 때는 반드시 `lib/date.ts`의 포맷터를 거친다.
 */
export type Timestamptz = string;

/** 기존 테이블 재사용. 참여자 표시 이름의 기본값을 여기서 가져온다. */
export interface Profile {
	id: string;
	full_name: string | null;
	avatar_url: string | null;
}

export interface Event {
	id: string;
	host_id: string;
	/** base62 12자. 초대 링크 `/e/[token]`의 token */
	public_token: string;
	title: string;
	description: string | null;
	starts_at: Timestamptz;
	location: string | null;
	/** 렌더 전 `http:`/`https:` 스킴 검사 필수 (R18). `isSafeUrl()`을 쓴다 */
	location_url: string | null;
	/** null이면 무제한. 동반 인원을 포함한 총원 기준이다 (R14) */
	capacity: number | null;
	rsvp_deadline: Timestamptz | null;
	status: EventStatus;
	/** 참석자 명단 공개 여부 (R10) */
	show_names: boolean;
	created_at: Timestamptz;
}

export interface Participant {
	id: string;
	event_id: string;
	/** 주최자 대리 등록 시 null */
	user_id: string | null;
	/** null이면 `profiles.full_name`을 사용한다. DDL: 1-20자 */
	display_name: string | null;
	status: RsvpStatus;
	/** DDL: 0-10 */
	guest_count: number;
	/** 주최자에게만 노출 (R10). 아래 `ParticipantPublic` 주석을 볼 것 */
	note: string | null;
	created_at: Timestamptz;
	updated_at: Timestamptz;
}

export interface Announcement {
	id: string;
	event_id: string;
	/** DDL: 1000자 이하 */
	body: string;
	created_at: Timestamptz;
}

/** 지표 측정용 (R3) */
export interface EventView {
	id: string;
	event_id: string;
	/** IP+UA 해시. 원본 IP는 저장하지 않는다 (R9) */
	session_hash: string;
	created_at: Timestamptz;
}

export interface Settlement {
	id: string;
	event_id: string;
	title: string;
	/** DDL: `check (total_amount >= 0)` */
	total_amount: number;
	/** 예: "카카오뱅크 3333-01-1234567 홍길동" */
	account_info: string | null;
	created_at: Timestamptz;
}

export interface SettlementShare {
	id: string;
	settlement_id: string;
	participant_id: string;
	amount: number;
	paid: boolean;
	paid_at: Timestamptz | null;
}

/**
 * 참여자 목록의 공개 뷰 — `note`가 **빠져 있다**.
 *
 * 한마디는 주최자에게만 보인다(R10). `get_event_participants` RPC의 반환 타입을
 * 이 타입으로 고정해 두면, 실수로 note를 실어 보낼 때 컴파일이 깨진다.
 * 주최자 화면에서 note가 필요하면 `Participant`를 그대로 쓴다.
 */
export type ParticipantPublic = Omit<Participant, 'note'>;

/**
 * `get_event_preview(p_token)` RPC의 반환 타입.
 * 비로그인 열람 경로라 필드가 고정이며, 여기에 필드를 늘리면 과다 노출이 된다.
 */
export interface EventPreview {
	title: string;
	starts_at: Timestamptz;
	location: string | null;
	status: EventStatus;
	/** 동반 인원을 합산한 참석 총원 */
	going_count: number;
}

/** 대시보드 목록 한 줄. 이벤트에 집계값을 얹은 화면 전용 타입이다. */
export interface EventSummary extends Event {
	/** 동반 인원을 합산한 참석 총원 */
	going_count: number;
}
