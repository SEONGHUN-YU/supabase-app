import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * `public_token` → `event_id` 해석.
 *
 * RLS(`events_select`)는 주최자이거나 이미 참여한 사람만 통과시키므로,
 * 아직 참여하지 않은 로그인 사용자에게는 `null`이 돌아온다(그 사용자는
 * `join_event` RPC로 먼저 참여해야 한다 — 그 경로는 토큰을 직접 받아
 * 이 함수를 거치지 않는다). Task 009·011에서 재사용한다.
 */
export async function resolveEventId(
	supabase: SupabaseClient,
	token: string,
): Promise<{ id: string; show_names: boolean } | null> {
	const { data, error } = await supabase
		.from('events')
		.select('id, show_names')
		.eq('public_token', token)
		.maybeSingle();

	if (error) throw error;
	return data as { id: string; show_names: boolean } | null;
}
