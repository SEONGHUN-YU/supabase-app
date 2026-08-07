'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { announcementSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import type { EventStatus } from '@/types/database';

/**
 * 주최자 조작 영역 (F005, F013, F014).
 *
 * Server Action을 쓰지 않는다. 저장 후에는 `router.refresh()`로 서버
 * 컴포넌트(manage 페이지)를 다시 조회해 화면을 최신 상태로 맞춘다.
 */

export function AnnouncementForm({ eventId }: { eventId: string }) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [draft, setDraft] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const result = announcementSchema.safeParse({ body: draft });
		if (!result.success) {
			setError(
				result.error.flatten().fieldErrors.body?.[0] ?? '입력을 확인해 주세요',
			);
			return;
		}
		setError(null);
		setSubmitting(true);

		const supabase = createClient();
		const { error: dbError } = await supabase
			.from('announcements')
			.insert({ event_id: eventId, body: result.data.body });

		setSubmitting(false);

		if (dbError) {
			toast.error(dbError.message);
			return;
		}

		setDraft('');
		toast.success('공지를 등록했어요');
		router.refresh();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2">
			<Textarea
				value={draft}
				onChange={event => setDraft(event.target.value)}
				rows={3}
				placeholder="장소가 변경됐어요. 2번 출구에서 만나요."
			/>
			{error && <p className="text-destructive text-xs">{error}</p>}
			<div className="flex items-center justify-between gap-2">
				<span className="text-muted-foreground text-xs">
					{draft.length} / 1000자
				</span>
				<Button type="submit" size="sm" disabled={submitting}>
					{submitting ? '등록하는 중...' : '공지 등록'}
				</Button>
			</div>
		</form>
	);
}

export function ShowNamesToggle({
	eventId,
	defaultValue,
}: {
	eventId: string;
	defaultValue: boolean;
}) {
	const router = useRouter();
	const [showNames, setShowNames] = useState(defaultValue);

	const handleChange = async (next: boolean) => {
		setShowNames(next);

		const supabase = createClient();
		const { error } = await supabase
			.from('events')
			.update({ show_names: next })
			.eq('id', eventId);

		if (error) {
			setShowNames(!next);
			toast.error(error.message);
			return;
		}

		router.refresh();
	};

	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex flex-col gap-0.5">
				<Label htmlFor="show-names">참석자 명단 공개</Label>
				<p className="text-muted-foreground text-xs">
					끄면 참여자에게 다른 참석자 이름이 보이지 않습니다
				</p>
			</div>
			<Switch
				id="show-names"
				checked={showNames}
				onCheckedChange={handleChange}
			/>
		</div>
	);
}

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
	{ value: 'open', label: '모집중' },
	{ value: 'closed', label: '마감' },
	{ value: 'cancelled', label: '취소' },
];

export function StatusSelect({
	eventId,
	defaultValue,
}: {
	eventId: string;
	defaultValue: EventStatus;
}) {
	const router = useRouter();
	const [status, setStatus] = useState<EventStatus>(defaultValue);

	const handleChange = async (value: string) => {
		const next = value as EventStatus;
		const previous = status;
		setStatus(next);

		const supabase = createClient();
		const { error } = await supabase
			.from('events')
			.update({ status: next })
			.eq('id', eventId);

		if (error) {
			setStatus(previous);
			toast.error(error.message);
			return;
		}

		router.refresh();
	};

	return (
		<div className="flex items-center justify-between gap-4">
			<Label htmlFor="event-status">모집 상태</Label>
			<Select value={status} onValueChange={handleChange}>
				<SelectTrigger id="event-status" className="w-32">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{STATUS_OPTIONS.map(option => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

export function PaymentCheck({
	id,
	shareId,
	label,
	amount,
	defaultPaid,
}: {
	id: string;
	/** `settlement_shares.id`. 이 행 하나만 갱신한다. */
	shareId: string;
	label: string;
	amount: number;
	defaultPaid: boolean;
}) {
	const router = useRouter();
	const [paid, setPaid] = useState(defaultPaid);

	const handleChange = async (checked: boolean) => {
		setPaid(checked);

		const supabase = createClient();
		const { error } = await supabase
			.from('settlement_shares')
			.update({
				paid: checked,
				paid_at: checked ? new Date().toISOString() : null,
			})
			.eq('id', shareId);

		if (error) {
			setPaid(!checked);
			toast.error(error.message);
			return;
		}

		router.refresh();
	};

	return (
		<div className="flex items-center justify-between gap-3 py-1.5">
			<Label htmlFor={id} className="flex cursor-pointer items-center gap-2">
				<Checkbox
					id={id}
					checked={paid}
					onCheckedChange={checked => handleChange(checked === true)}
				/>
				<span className="text-sm font-normal">{label}</span>
			</Label>
			<span
				className={
					paid ? 'text-muted-foreground text-sm line-through' : 'text-sm'
				}
			>
				{amount.toLocaleString('ko-KR')}원
			</span>
		</div>
	);
}
