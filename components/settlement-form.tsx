'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { settlementSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';

/**
 * 정산 생성 폼 (F007) — 총액 입력 → 참석자(`going`) N빵.
 *
 * 1원 단위 나머지는 주최자 귀속(`Math.floor`), `manage/page.tsx`의 기존
 * 공식과 동일하다. `settlements` insert 후 `settlement_shares`를 참석자
 * 수만큼 배치 insert하는 두 단계라, 두 번째가 실패하면 정산만 생성되고
 * 분담 행이 없는 상태가 될 수 있다 — 그 경우 정산 id를 들고 있다가
 * 재시도 버튼으로 분담 insert만 다시 시도한다(서비스 롤·RPC 트랜잭션 없이
 * MVP 범위에서 감수하기로 한 리스크).
 */

type FieldErrors = Partial<Record<string, string[]>>;

export function SettlementForm({
	eventId,
	goingParticipantIds,
}: {
	eventId: string;
	goingParticipantIds: string[];
}) {
	const router = useRouter();
	const [errors, setErrors] = useState<FieldErrors>({});
	const [submitting, setSubmitting] = useState(false);
	const [pending, setPending] = useState<{
		settlementId: string;
		shareAmount: number;
	} | null>(null);

	async function insertShares(settlementId: string, shareAmount: number) {
		const supabase = createClient();
		const { error } = await supabase.from('settlement_shares').insert(
			goingParticipantIds.map(participantId => ({
				settlement_id: settlementId,
				participant_id: participantId,
				amount: shareAmount,
				paid: false,
			})),
		);
		return error;
	}

	async function handleRetry() {
		if (!pending) return;
		setSubmitting(true);
		const error = await insertShares(pending.settlementId, pending.shareAmount);
		setSubmitting(false);

		if (error) {
			toast.error(error.message);
			return;
		}

		setPending(null);
		toast.success('정산을 만들었어요');
		router.refresh();
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const values = Object.fromEntries(formData) as Record<string, string>;

		const result = settlementSchema.safeParse(values);
		if (!result.success) {
			setErrors(result.error.flatten().fieldErrors);
			return;
		}
		setErrors({});

		if (goingParticipantIds.length === 0) {
			toast.error('참석자가 있어야 정산을 만들 수 있어요');
			return;
		}

		setSubmitting(true);
		const supabase = createClient();
		const { data, error } = await supabase
			.from('settlements')
			.insert({
				event_id: eventId,
				title: result.data.title,
				total_amount: result.data.total_amount,
				account_info: result.data.account_info ?? null,
			})
			.select('id')
			.single();

		if (error || !data) {
			setSubmitting(false);
			toast.error(error?.message ?? '정산을 만들지 못했어요');
			return;
		}

		const shareAmount = Math.floor(
			result.data.total_amount / goingParticipantIds.length,
		);
		const sharesError = await insertShares(data.id, shareAmount);
		setSubmitting(false);

		if (sharesError) {
			setPending({ settlementId: data.id, shareAmount });
			toast.error(
				'정산은 만들었지만 분담 내역 저장에 실패했어요. 다시 시도해 주세요.',
			);
			return;
		}

		toast.success('정산을 만들었어요');
		router.refresh();
	}

	if (pending) {
		return (
			<div className="border-destructive/50 flex flex-col gap-2 rounded-md border p-3">
				<p className="text-destructive text-sm">
					분담 내역 저장에 실패했어요. 정산 자체는 만들어졌으니 다시 시도해
					주세요.
				</p>
				<Button
					type="button"
					size="sm"
					onClick={handleRetry}
					disabled={submitting}
					className="self-start"
				>
					{submitting ? '재시도하는 중...' : '다시 시도'}
				</Button>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-3">
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="settlement-title">정산 항목</Label>
				<Input id="settlement-title" name="title" placeholder="뒤풀이 식사비" />
				{errors.title?.map(message => (
					<p key={message} className="text-destructive text-xs">
						{message}
					</p>
				))}
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="settlement-amount">총액</Label>
				<Input
					id="settlement-amount"
					name="total_amount"
					type="number"
					min={0}
					placeholder="84000"
				/>
				{errors.total_amount?.map(message => (
					<p key={message} className="text-destructive text-xs">
						{message}
					</p>
				))}
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="settlement-account">계좌 정보</Label>
				<Input
					id="settlement-account"
					name="account_info"
					placeholder="카카오뱅크 3333-01-1234567 홍길동"
				/>
				{errors.account_info?.map(message => (
					<p key={message} className="text-destructive text-xs">
						{message}
					</p>
				))}
			</div>

			<Button
				type="submit"
				size="sm"
				disabled={submitting || goingParticipantIds.length === 0}
				className="self-start"
			>
				{submitting ? '만드는 중...' : '정산 만들기'}
			</Button>
			{goingParticipantIds.length === 0 && (
				<p className="text-muted-foreground text-xs">
					참석자가 있어야 정산을 만들 수 있어요
				</p>
			)}
		</form>
	);
}
