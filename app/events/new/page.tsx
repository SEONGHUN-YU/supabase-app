/**
 * 이벤트 생성 페이지 (F001, F002, F006) — 자리표시자.
 * 입력 폼과 카톡 공유 문구 생성은 Phase 2 이후에 채운다.
 */
export default function NewEventPage() {
	return (
		<main className="flex flex-col gap-4 py-8">
			<h1 className="text-2xl font-bold">새 이벤트</h1>
			<p className="text-muted-foreground text-sm">
				제목·일시·장소·정원 입력 폼이 이 자리에 표시됩니다.
			</p>
		</main>
	);
}
