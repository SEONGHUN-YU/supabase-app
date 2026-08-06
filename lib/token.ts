/**
 * 초대 링크 토큰 생성 (`events.public_token`).
 *
 * `Math.random()`을 쓰지 않는 이유는 예측 가능해서다. 이 토큰은 URL에
 * 그대로 노출되고 `get_event_preview`·`join_event` RPC의 유일한 접근
 * 조건이므로 `crypto.getRandomValues`로 뽑는다.
 */

const BASE62_CHARS =
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** base62 12자 토큰. DDL: `public_token text not null unique`. */
export function generatePublicToken(length = 12): string {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return Array.from(
		bytes,
		byte => BASE62_CHARS[byte % BASE62_CHARS.length],
	).join('');
}
