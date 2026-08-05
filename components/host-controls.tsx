'use client';

import { useState } from 'react';
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
import type { EventStatus } from '@/types/database';

/**
 * 주최자 조작 영역 (F005, F013, F014).
 *
 * Phase 2는 저장하지 않는다. 상태를 컴포넌트 안에서만 바꿔 화면 반응을
 * 확인하는 데까지가 이번 범위다 (Task 010에서 연동).
 */

export function AnnouncementForm() {
	const [error, setError] = useState<string | null>(null);
	const [draft, setDraft] = useState('');

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const result = announcementSchema.safeParse({ body: draft });
		if (!result.success) {
			setError(
				result.error.flatten().fieldErrors.body?.[0] ?? '입력을 확인해 주세요',
			);
			return;
		}
		setError(null);
		setDraft('');
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
				<Button type="submit" size="sm">
					공지 등록
				</Button>
			</div>
		</form>
	);
}

export function ShowNamesToggle({ defaultValue }: { defaultValue: boolean }) {
	const [showNames, setShowNames] = useState(defaultValue);

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
				onCheckedChange={setShowNames}
			/>
		</div>
	);
}

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
	{ value: 'open', label: '모집중' },
	{ value: 'closed', label: '마감' },
	{ value: 'cancelled', label: '취소' },
];

export function StatusSelect({ defaultValue }: { defaultValue: EventStatus }) {
	const [status, setStatus] = useState<EventStatus>(defaultValue);

	return (
		<div className="flex items-center justify-between gap-4">
			<Label htmlFor="event-status">모집 상태</Label>
			<Select
				value={status}
				onValueChange={value => setStatus(value as EventStatus)}
			>
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
	label,
	amount,
	defaultPaid,
}: {
	id: string;
	label: string;
	amount: number;
	defaultPaid: boolean;
}) {
	const [paid, setPaid] = useState(defaultPaid);

	return (
		<div className="flex items-center justify-between gap-3 py-1.5">
			<Label htmlFor={id} className="flex cursor-pointer items-center gap-2">
				<Checkbox
					id={id}
					checked={paid}
					onCheckedChange={checked => setPaid(checked === true)}
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
