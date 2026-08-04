/**
 * 사용자가 입력한 URL의 스킴 검사 (R18).
 *
 * `location_url`은 이벤트에 저장돼 **모든 참여자에게** `<a href>`로 렌더된다.
 * `javascript:alert(1)` 같은 값이 들어가면 초대 링크를 연 사람 전원에게
 * 스크립트가 실행된다. 저장 시점(Zod)과 렌더 시점 양쪽에서 이 함수를 거친다.
 */

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/** `http:`/`https:` 스킴이면 true. 파싱 불가하거나 다른 스킴이면 false. */
export function isSafeUrl(value: string): boolean {
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		// 스킴 없는 상대 경로도 여기로 온다. 외부 지도 링크 용도이므로 거부한다.
		return false;
	}
	return ALLOWED_PROTOCOLS.includes(parsed.protocol);
}

/**
 * 렌더 직전 방어선. 안전하지 않으면 `undefined`를 돌려주므로
 * `<a href={safeHref(url)}>`로 쓰면 href 속성 자체가 사라진다.
 */
export function safeHref(value: string | null | undefined): string | undefined {
	if (!value) return undefined;
	return isSafeUrl(value) ? value : undefined;
}
