import { formatKST } from '@/lib/date';

/**
 * 카톡 공유 문구 생성 (F006).
 *
 * 이벤트 생성 / 공지 추가 / 정산 요청 3종. `components/event-form.tsx`에
 * 있던 `buildShareText`를 여기로 승격하고, 관리 페이지에서 쓸 두 변형을
 * 추가했다. 최신 집계(참석 인원)를 매번 인자로 받아 호출 시점 값을 반영한다.
 */

/** 이벤트 생성 완료 시 공유 문구 */
export function buildEventCreatedShareText(
	title: string,
	startsAtIso: string,
	inviteUrl: string,
): string {
	return [
		`[${title}]`,
		formatKST(startsAtIso, 'full'),
		'',
		'참석 여부를 알려주세요',
		inviteUrl,
	].join('\n');
}

/** 공지 추가 시 공유 문구. 현재 참석 인원·정원을 함께 담는다 */
export function buildAnnouncementShareText(
	title: string,
	announcementBody: string,
	goingCount: number,
	capacity: number | null,
	inviteUrl: string,
): string {
	const capacityText = capacity === null ? '' : ` (정원 ${capacity}명)`;
	return [
		`[공지] ${title}`,
		`⚠️ ${announcementBody}`,
		`현재 ${goingCount}명 참석 예정${capacityText}`,
		`👉 아직 응답 안 하신 분: ${inviteUrl}`,
	].join('\n');
}

/** 정산 요청 시 공유 문구 */
export function buildSettlementShareText(
	title: string,
	settlementTitle: string,
	totalAmount: number,
	inviteUrl: string,
): string {
	return [
		`[정산] ${title}`,
		`${settlementTitle}: 총 ${totalAmount.toLocaleString('ko-KR')}원`,
		'본인 몫과 계좌를 초대 링크에서 확인해 주세요',
		inviteUrl,
	].join('\n');
}
