'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { RsvpBadge } from '@/components/rsvp-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { rsvpSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import type { Participant, RsvpStatus } from '@/types/database';

/**
 * 참여자 수동 추가·수정·삭제 (F013) — 계정 없는 사람 대리 등록.
 *
 * `participants_host` RLS(주최자 for all)에 기대어 `.insert()`/`.update()`/
 * `.delete()`를 직접 호출한다. 대상은 `user_id`가 null인 대리 등록 행뿐이다
 * — 실계정 참여자는 본인 응답(join_event)으로만 바뀐다.
 *
 * `displayName`을 서버 컴포넌트에서 미리 계산해 문자열로 받는다. 함수는
 * 서버→클라이언트 컴포넌트 경계를 못 건너므로 여기서 다시 계산하지 않는다.
 */

const STATUS_ORDER: RsvpStatus[] = ['going', 'maybe', 'not_going'];

const STATUS_OPTIONS: { value: RsvpStatus; label: string }[] = [
	{ value: 'going', label: '참석' },
	{ value: 'maybe', label: '미정' },
	{ value: 'not_going', label: '불참' },
];

interface FormValues {
	display_name: string;
	status: RsvpStatus;
	guest_count: string;
	note: string;
}

const EMPTY_FORM: FormValues = {
	display_name: '',
	status: 'going',
	guest_count: '0',
	note: '',
};

type FieldErrors = Partial<Record<string, string[]>>;

export function ParticipantManager({
	eventId,
	items,
}: {
	eventId: string;
	items: { participant: Participant; displayName: string }[];
}) {
	const router = useRouter();
	const [mode, setMode] = useState<'idle' | 'adding' | 'editing'>('idle');
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<FormValues>(EMPTY_FORM);
	const [errors, setErrors] = useState<FieldErrors>({});
	const [submitting, setSubmitting] = useState(false);

	function startAdd() {
		setForm(EMPTY_FORM);
		setErrors({});
		setEditingId(null);
		setMode('adding');
	}

	function startEdit(participant: Participant) {
		setForm({
			display_name: participant.display_name ?? '',
			status: participant.status,
			guest_count: String(participant.guest_count),
			note: participant.note ?? '',
		});
		setErrors({});
		setEditingId(participant.id);
		setMode('editing');
	}

	function cancel() {
		setMode('idle');
		setEditingId(null);
		setErrors({});
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const result = rsvpSchema.safeParse({
			status: form.status,
			guest_count: form.guest_count,
			note: form.note,
			display_name: form.display_name,
		});
		if (!result.success) {
			setErrors(result.error.flatten().fieldErrors);
			return;
		}
		if (!result.data.display_name) {
			setErrors({ display_name: ['대리 등록에는 이름이 필요합니다'] });
			return;
		}

		setErrors({});
		setSubmitting(true);
		const supabase = createClient();

		const payload = {
			display_name: result.data.display_name,
			status: result.data.status,
			guest_count: result.data.guest_count,
			note: result.data.note ?? null,
		};

		const { error } = editingId
			? await supabase.from('participants').update(payload).eq('id', editingId)
			: await supabase
					.from('participants')
					.insert({ ...payload, event_id: eventId, user_id: null });

		setSubmitting(false);

		if (error) {
			toast.error(error.message);
			return;
		}

		toast.success(
			editingId ? '참여자 정보를 수정했어요' : '참여자를 추가했어요',
		);
		setMode('idle');
		setEditingId(null);
		router.refresh();
	}

	async function handleDelete(participant: Participant) {
		const supabase = createClient();
		const { error } = await supabase
			.from('participants')
			.delete()
			.eq('id', participant.id);

		if (error) {
			toast.error(error.message);
			return;
		}

		toast.success('참여자를 삭제했어요');
		router.refresh();
	}

	return (
		<div className="flex flex-col gap-4">
			{items.length === 0 ? (
				<EmptyState title="아직 응답한 사람이 없어요" />
			) : (
				STATUS_ORDER.map(status => {
					const group = items.filter(
						item => item.participant.status === status,
					);
					if (group.length === 0) return null;
					return (
						<ul key={status} className="divide-y">
							{group.map(({ participant, displayName }) => (
								<li
									key={participant.id}
									className="flex items-center justify-between gap-3 py-2"
								>
									<div className="flex min-w-0 items-center gap-2">
										<RsvpBadge status={participant.status} />
										<span className="truncate text-sm">{displayName}</span>
										{participant.guest_count > 0 && (
											<span className="text-muted-foreground shrink-0 text-xs">
												+{participant.guest_count}
											</span>
										)}
										{participant.user_id === null && (
											<span className="text-muted-foreground shrink-0 text-xs">
												대리 등록
											</span>
										)}
									</div>
									{participant.user_id === null && (
										<div className="flex shrink-0 gap-1">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => startEdit(participant)}
											>
												수정
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => handleDelete(participant)}
											>
												삭제
											</Button>
										</div>
									)}
								</li>
							))}
						</ul>
					);
				})
			)}

			{mode === 'idle' ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="self-start"
					onClick={startAdd}
				>
					참여자 직접 추가
				</Button>
			) : (
				<form
					onSubmit={handleSubmit}
					className="flex flex-col gap-3 rounded-md border p-3"
				>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="pm-display-name">이름</Label>
						<Input
							id="pm-display-name"
							value={form.display_name}
							onChange={event =>
								setForm(current => ({
									...current,
									display_name: event.target.value,
								}))
							}
							placeholder="김대리등록"
						/>
						{errors.display_name?.map(message => (
							<p key={message} className="text-destructive text-xs">
								{message}
							</p>
						))}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="pm-status">참석 여부</Label>
						<Select
							value={form.status}
							onValueChange={value =>
								setForm(current => ({
									...current,
									status: value as RsvpStatus,
								}))
							}
						>
							<SelectTrigger id="pm-status" className="w-32">
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

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="pm-guest-count">동반 인원</Label>
						<Input
							id="pm-guest-count"
							type="number"
							min={0}
							max={10}
							value={form.guest_count}
							onChange={event =>
								setForm(current => ({
									...current,
									guest_count: event.target.value,
								}))
							}
						/>
						{errors.guest_count?.map(message => (
							<p key={message} className="text-destructive text-xs">
								{message}
							</p>
						))}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="pm-note">한마디</Label>
						<Textarea
							id="pm-note"
							rows={2}
							value={form.note}
							onChange={event =>
								setForm(current => ({ ...current, note: event.target.value }))
							}
						/>
						{errors.note?.map(message => (
							<p key={message} className="text-destructive text-xs">
								{message}
							</p>
						))}
					</div>

					<div className="flex gap-2">
						<Button type="submit" size="sm" disabled={submitting}>
							{submitting ? '저장하는 중...' : editingId ? '수정 저장' : '추가'}
						</Button>
						<Button type="button" variant="outline" size="sm" onClick={cancel}>
							취소
						</Button>
					</div>
				</form>
			)}
		</div>
	);
}
