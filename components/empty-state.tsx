interface EmptyStateProps {
	title: string;
	description?: string;
	/** [새 이벤트] 같은 다음 행동 버튼 */
	action?: React.ReactNode;
}

/** 목록이 비었을 때. 대시보드 두 탭과 공지·참여자 목록에서 쓴다. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center">
			<p className="font-medium">{title}</p>
			{description && (
				<p className="text-muted-foreground text-sm">{description}</p>
			)}
			{action && <div className="mt-2">{action}</div>}
		</div>
	);
}
