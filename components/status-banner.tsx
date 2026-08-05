import type { EventStatus } from '@/types/database';

/** 상태별 배너 문구. `open`은 배너를 띄우지 않는다. */
const STATUS_MESSAGE: Record<Exclude<EventStatus, 'open'>, string> = {
	closed: '응답이 마감된 모임입니다.',
	cancelled: '취소된 모임입니다.',
};

/**
 * 마감·취소 상태 배너. 초대 페이지와 이벤트 관리 페이지 양쪽에서 쓴다.
 * 모집 중(`open`)이면 아무것도 렌더하지 않으므로 호출부에서 분기할 필요가 없다.
 */
export function StatusBanner({ status }: { status: EventStatus }) {
	if (status === 'open') return null;

	return (
		<div
			role="status"
			className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm font-medium"
		>
			{STATUS_MESSAGE[status]}
		</div>
	);
}
