/**
 * 초대 페이지 (F003, F004, F005, F009) — 자리표시자.
 *
 * 이 경로는 proxy 인증 예외라 비로그인으로도 열린다.
 * `params`는 아직 읽지 않는다 (동적 API — Suspense 경계가 필요해진다).
 */
export default function InvitePage() {
	return (
		<main className="flex flex-col gap-4 py-8">
			<h1 className="text-2xl font-bold">모임 초대</h1>
			<p className="text-muted-foreground text-sm">
				모임 정보와 응답 폼이 이 자리에 표시됩니다.
			</p>
		</main>
	);
}
