/**
 * 개인정보 처리방침 (F015) — 자리표시자.
 * 수집 항목·보유 기간·공개 범위 문구는 Phase 4에서 채운다.
 */
export default function PrivacyPage() {
	return (
		<main className="flex flex-col gap-4 py-8">
			<h1 className="text-2xl font-bold">개인정보 처리방침</h1>
			<p className="text-muted-foreground text-sm">
				수집 항목과 이용 목적, 보유 기간, 공개 범위를 이 자리에 고지합니다.
			</p>
		</main>
	);
}
