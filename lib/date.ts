/**
 * KST(Asia/Seoul) 고정 날짜 유틸.
 *
 * 서버는 UTC로 돌고 사용자는 KST로 읽는다. 각자 포맷하면 9시간 어긋나거나
 * 하이드레이션 불일치가 난다. **모든 날짜 출력은 예외 없이 이 파일을 거친다.**
 *
 * `Intl.DateTimeFormat`을 쓰지 않는 이유:
 * 같은 `'ko-KR'` + `timeZone: 'Asia/Seoul'` + `hour12: true` 조합에서
 * Node 24(ICU 78)는 `"PM 7:30"`, Chrome 150은 `"오후 7:30"`을 낸다.
 * 오전/오후 표기가 런타임의 CLDR 버전을 타기 때문에, 서버 렌더 결과와
 * 클라이언트 하이드레이션 결과가 달라져 React가 경고를 뱉는다.
 * 그래서 로케일 데이터에 의존하지 않고 문자열을 직접 조립한다.
 *
 * KST는 UTC+9 고정이고 서머타임이 없으므로 오프셋 상수로 충분하다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export type DateStyle = 'full' | 'date' | 'time' | 'short';

function toDate(value: Date | string): Date {
	const date = typeof value === 'string' ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) {
		throw new TypeError(`날짜로 해석할 수 없는 값입니다: ${String(value)}`);
	}
	return date;
}

/**
 * KST 벽시계 값을 뽑는다.
 *
 * UTC 시각에 9시간을 더한 뒤 `getUTC*()`로 읽으면, 실행 환경의 로컬 타임존과
 * 무관하게 항상 KST 기준 연·월·일·시가 나온다.
 */
function kstParts(value: Date | string) {
	const shifted = new Date(toDate(value).getTime() + KST_OFFSET_MS);
	return {
		year: shifted.getUTCFullYear(),
		month: shifted.getUTCMonth() + 1,
		day: shifted.getUTCDate(),
		weekday: WEEKDAYS[shifted.getUTCDay()],
		hour24: shifted.getUTCHours(),
		minute: shifted.getUTCMinutes(),
	};
}

/** 24시간 → `오후 7:30` */
function formatTime(hour24: number, minute: number): string {
	const meridiem = hour24 < 12 ? '오전' : '오후';
	const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
	return `${meridiem} ${hour12}:${String(minute).padStart(2, '0')}`;
}

/**
 * KST 기준으로 날짜를 포맷한다.
 *
 * - `full`  → `2026년 8월 4일 (화) 오후 7:30`
 * - `date`  → `2026년 8월 4일 (화)`
 * - `time`  → `오후 7:30`
 * - `short` → `8월 4일 (화) 오후 7:30`
 */
export function formatKST(
	value: Date | string,
	style: DateStyle = 'full',
): string {
	const { year, month, day, weekday, hour24, minute } = kstParts(value);
	const time = formatTime(hour24, minute);

	switch (style) {
		case 'time':
			return time;
		case 'date':
			return `${year}년 ${month}월 ${day}일 (${weekday})`;
		case 'short':
			return `${month}월 ${day}일 (${weekday}) ${time}`;
		case 'full':
		default:
			return `${year}년 ${month}월 ${day}일 (${weekday}) ${time}`;
	}
}

/**
 * `<input type="datetime-local">` 값(KST 벽시계)을 UTC ISO 문자열로 바꾼다.
 *
 * `new Date('2026-08-04T19:30')`은 **실행 환경의 로컬 타임존**으로 해석되므로
 * 서버(UTC)와 브라우저(KST)에서 9시간 어긋난다. 직접 계산해야 하는 이유다.
 */
export function toISOFromKSTInput(input: string): string {
	// datetime-local은 초를 생략할 수 있다 ('YYYY-MM-DDTHH:mm').
	const normalized = input.length === 16 ? `${input}:00` : input;
	const asIfUtc = Date.parse(`${normalized}Z`);
	if (Number.isNaN(asIfUtc)) {
		throw new TypeError(`datetime-local 형식이 아닙니다: ${input}`);
	}
	return new Date(asIfUtc - KST_OFFSET_MS).toISOString();
}

/**
 * `toISOFromKSTInput`의 역방향. 폼 기본값 채우기(이벤트 복제)에 쓴다.
 * 반환 형식은 `YYYY-MM-DDTHH:mm`.
 */
export function toKSTInputValue(value: Date | string): string {
	const shifted = new Date(toDate(value).getTime() + KST_OFFSET_MS);
	return shifted.toISOString().slice(0, 16);
}
