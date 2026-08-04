/**
 * 대시보드 (F011) — 자리표시자.
 * 주최/참여 탭과 모임 목록은 Phase 3에서 채운다.
 */
export default function DashboardPage() {
	return (
		<main className="flex flex-col gap-4 py-8">
			<h1 className="text-2xl font-bold">대시보드</h1>
			<p className="text-muted-foreground text-sm">
				주최한 모임과 참여한 모임 목록이 이 자리에 표시됩니다.
			</p>
		</main>
	);
}
