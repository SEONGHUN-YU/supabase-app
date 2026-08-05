import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AttendanceSummary } from '@/components/attendance-summary';
import { formatKST } from '@/lib/date';
import type { EventStatus, EventSummary } from '@/types/database';

/** 모집 중이 아닐 때만 배지를 띄운다 */
const STATUS_LABEL: Record<Exclude<EventStatus, 'open'>, string> = {
	closed: '마감',
	cancelled: '취소',
};

interface EventCardProps {
	event: EventSummary;
	/** 클릭 시 이동할 경로. 주최 목록은 관리 페이지, 참여 목록은 초대 페이지 */
	href: string;
}

/**
 * 대시보드 목록의 한 줄. 주최 탭과 참여 탭 양쪽에서 쓴다.
 *
 * 날짜는 반드시 `formatKST`를 거친다. `Intl`을 직접 쓰면 Node와 브라우저의
 * 오전/오후 표기가 달라 하이드레이션 불일치가 난다 (Task 002 실측).
 */
export function EventCard({ event, href }: EventCardProps) {
	return (
		<Card className="transition-colors hover:border-foreground/20">
			<CardContent className="p-4">
				<Link href={href} className="flex flex-col gap-2">
					<div className="flex items-start justify-between gap-2">
						<h3 className="font-semibold leading-snug">{event.title}</h3>
						{event.status !== 'open' && (
							<Badge variant="outline" className="shrink-0">
								{STATUS_LABEL[event.status]}
							</Badge>
						)}
					</div>

					<p className="text-muted-foreground text-sm">
						{formatKST(event.starts_at, 'short')}
					</p>

					{event.location && (
						<p className="text-muted-foreground truncate text-sm">
							{event.location}
						</p>
					)}

					<AttendanceSummary
						goingCount={event.going_count}
						capacity={event.capacity}
					/>
				</Link>
			</CardContent>
		</Card>
	);
}
