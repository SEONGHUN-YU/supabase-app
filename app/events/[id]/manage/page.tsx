/**
 * 이벤트 관리 페이지 (주최자 전용) — 자리표시자.
 *
 * `params`를 아직 읽지 않는다. params는 동적 API라 읽는 순간
 * cacheComponents 규칙에 따라 `<Suspense>` 경계가 필요해진다.
 */
export default function ManageEventPage() {
	return (
		<main className="flex flex-col gap-4 py-8">
			<h1 className="text-2xl font-bold">이벤트 관리</h1>
			<p className="text-muted-foreground text-sm">
				참석 현황·공지·정산이 이 자리에 표시됩니다.
			</p>
		</main>
	);
}
