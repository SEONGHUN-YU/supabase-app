import { Badge } from '@/components/ui/badge';
import type { RsvpStatus } from '@/types/database';

/** 참석 상태별 표시 문구와 배지 스타일 */
const RSVP_LABEL: Record<RsvpStatus, string> = {
	going: '참석',
	not_going: '불참',
	maybe: '미정',
};

const RSVP_VARIANT: Record<
	RsvpStatus,
	'default' | 'secondary' | 'outline' | 'destructive'
> = {
	going: 'default',
	not_going: 'outline',
	maybe: 'secondary',
};

/**
 * 참석 상태 배지. 이벤트 관리 페이지와 초대 페이지 양쪽에서 쓴다.
 * 문구를 이 파일 한 곳에서만 정의해 두 화면의 표기가 어긋나지 않게 한다.
 */
export function RsvpBadge({ status }: { status: RsvpStatus }) {
	return <Badge variant={RSVP_VARIANT[status]}>{RSVP_LABEL[status]}</Badge>;
}
