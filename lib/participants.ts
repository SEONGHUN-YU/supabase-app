import type { Participant } from '@/types/database';

/**
 * 동반 인원을 합산한 참석 총원. `get_event_preview`의 going_count와 같은 계산이다.
 *
 * `lib/fixtures.ts`(Task 011에서 삭제)에 있던 순수 로직만 옮겨 왔다.
 */
export function countGoing(participants: Participant[]): number {
	return participants
		.filter(participant => participant.status === 'going')
		.reduce((total, participant) => total + 1 + participant.guest_count, 0);
}
