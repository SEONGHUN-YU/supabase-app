import { cn } from '@/lib/utils';

interface AttendanceSummaryProps {
	/** 동반 인원을 합산한 참석 총원. `countGoing()` 결과를 넘긴다 */
	goingCount: number;
	/** null이면 무제한 (R14 — 정원은 동반 인원 포함 기준) */
	capacity: number | null;
	className?: string;
}

/**
 * 참석 인원 요약. 이벤트 관리 페이지와 초대 페이지 양쪽에서 쓴다.
 *
 * 정원은 **표시용**이다. 동시 응답으로 초과될 수 있으며 하드 제한을 걸지 않는다
 * (R13 — 트랜잭션 비용 대비 실익 없음). 초과 시 숫자를 강조해 주최자가 알아채게 한다.
 */
export function AttendanceSummary({
	goingCount,
	capacity,
	className,
}: AttendanceSummaryProps) {
	const isOverCapacity = capacity !== null && goingCount > capacity;

	return (
		<div className={cn('flex items-baseline gap-1.5 text-sm', className)}>
			<span className="text-muted-foreground">참석</span>
			<span
				className={cn(
					'text-base font-semibold',
					isOverCapacity && 'text-destructive',
				)}
			>
				{goingCount}명
			</span>
			<span className="text-muted-foreground">
				{capacity === null ? '(정원 무제한)' : `/ 정원 ${capacity}명`}
			</span>
		</div>
	);
}
