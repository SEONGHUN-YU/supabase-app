'use client';

import { useState } from 'react';
import { RsvpBadge } from '@/components/rsvp-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { rsvpSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import type { RsvpStatus } from '@/types/database';

/**
 * 참석 응답 폼 (F003).
 *
 * Server Action을 쓰지 않는다. 이 저장소는 클라이언트 컴포넌트에서 직접
 * 처리하는 방식이고 `components/login-form.tsx`가 그 선례다.
 *
 * 저장은 `join_event` RPC 한 번으로 끝난다. 최초 응답과 수정이 같은 경로를
 * 타는 것(`on conflict do update`)은 RPC 안에 있으므로 여기서 분기하지 않는다.
 * 마감·정원 초과 등의 검증도 RPC 안에서 처리되어 예외 메시지로 돌아온다.
 *
 * 본인의 한마디를 폼에 되돌려 보여주는 것은 R10 위반이 아니다. R10이 막는 것은
 * **다른 참여자의** 한마디 노출이고, 그쪽은 명단이 `ParticipantPublic`을 쓰는
 * 것으로 타입 수준에서 차단된다.
 */

/** 저장된 응답. Task 009에서 `participants` 조회 결과로 채운다. */
export interface RsvpAnswer {
	status: RsvpStatus;
	guest_count: number;
	note: string | null;
}

/** 표시 순서는 참석 → 미정 → 불참. 기대 응답을 왼쪽에 둔다. */
const STATUS_OPTIONS: { value: RsvpStatus; label: string }[] = [
	{ value: 'going', label: '참석' },
	{ value: 'maybe', label: '미정' },
	{ value: 'not_going', label: '불참' },
];

/** 필드별 에러 메시지. Zod의 flatten 결과를 담는다. */
type FieldErrors = Partial<Record<string, string[]>>;

export function RsvpForm({
	token,
	existing,
}: {
	token: string;
	existing: RsvpAnswer | null;
}) {
	const [saved, setSaved] = useState<RsvpAnswer | null>(existing);
	// 기존 응답이 있으면 완료 카드부터 보여준다 (PRD: 재방문 시 수정 모드).
	const [editing, setEditing] = useState(existing === null);

	const [status, setStatus] = useState<RsvpStatus | null>(
		existing?.status ?? null,
	);
	const [guestCount, setGuestCount] = useState(
		String(existing?.guest_count ?? 0),
	);
	const [note, setNote] = useState(existing?.note ?? '');
	const [errors, setErrors] = useState<FieldErrors>({});
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const result = rsvpSchema.safeParse({
			status,
			guest_count: guestCount,
			note,
		});
		if (!result.success) {
			setErrors(result.error.flatten().fieldErrors);
			return;
		}

		setErrors({});
		setSubmitError(null);
		setSubmitting(true);

		const supabase = createClient();
		const { error } = await supabase.rpc('join_event', {
			p_token: token,
			p_status: result.data.status,
			p_guest_count: result.data.guest_count,
			p_note: result.data.note ?? null,
		});

		setSubmitting(false);

		if (error) {
			setSubmitError(error.message);
			return;
		}

		setSaved({
			status: result.data.status,
			guest_count: result.data.guest_count,
			note: result.data.note ?? null,
		});
		setEditing(false);
	};

	const handleCancel = () => {
		if (!saved) return;
		setStatus(saved.status);
		setGuestCount(String(saved.guest_count));
		setNote(saved.note ?? '');
		setErrors({});
		setEditing(false);
	};

	if (!editing && saved) {
		return (
			<div className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-sm font-medium">응답 완료</span>
					<RsvpBadge status={saved.status} />
					{saved.guest_count > 0 && (
						<span className="text-muted-foreground text-sm">
							동반 {saved.guest_count}명
						</span>
					)}
				</div>
				{saved.note && <p className="text-sm">{saved.note}</p>}
				<Button
					type="button"
					variant="outline"
					onClick={() => setEditing(true)}
					className="h-11 self-start"
				>
					응답 수정
				</Button>
			</div>
		);
	}

	return (
		// noValidate — 검증을 Zod가 전부 소유한다. `min`/`max`를 남겨 두면
		// 브라우저 기본 검증이 submit을 먼저 가로채 우리 한국어 메시지 대신
		// 브라우저·인앱 웹뷰마다 다른 기본 툴팁이 뜨고, 그 뒤 필드(한마디)의
		// 에러는 아예 표시되지 않는다. 속성은 모바일 숫자 키패드와 범위 안내
		// 용도로 그대로 둔다.
		<form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
			{submitError && <p className="text-destructive text-sm">{submitError}</p>}

			<div className="flex flex-col gap-1.5">
				<span className="text-sm font-medium">참석 여부</span>
				{/* 터치 타겟 44px(h-11). 라디오 대신 버튼을 쓴 이유는 모바일에서
				    한 손으로 누를 면적을 확보하기 위해서다. */}
				<div className="grid grid-cols-3 gap-2">
					{STATUS_OPTIONS.map(option => (
						<Button
							key={option.value}
							type="button"
							variant={status === option.value ? 'default' : 'outline'}
							aria-pressed={status === option.value}
							onClick={() => setStatus(option.value)}
							className="h-11"
						>
							{option.label}
						</Button>
					))}
				</div>
				{errors.status?.map(message => (
					<p key={message} className="text-destructive text-xs">
						{message}
					</p>
				))}
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="guest_count">동반 인원</Label>
				<Input
					id="guest_count"
					name="guest_count"
					type="number"
					inputMode="numeric"
					min={0}
					max={10}
					value={guestCount}
					onChange={event => setGuestCount(event.target.value)}
					className="h-11"
				/>
				{errors.guest_count?.length ? (
					errors.guest_count.map(message => (
						<p key={message} className="text-destructive text-xs">
							{message}
						</p>
					))
				) : (
					<p className="text-muted-foreground text-xs">
						본인 외에 함께 오는 인원 수입니다
					</p>
				)}
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="note">한마디</Label>
				<Textarea
					id="note"
					name="note"
					rows={2}
					value={note}
					onChange={event => setNote(event.target.value)}
					placeholder="조금 늦을 수도 있어요"
				/>
				{errors.note?.length ? (
					errors.note.map(message => (
						<p key={message} className="text-destructive text-xs">
							{message}
						</p>
					))
				) : (
					<p className="text-muted-foreground text-xs">
						주최자에게만 보입니다 · {note.length} / 200자
					</p>
				)}
			</div>

			<div className="flex gap-2">
				<Button
					type="submit"
					disabled={submitting}
					className="h-11 flex-1 sm:flex-none"
				>
					{submitting ? '저장하는 중...' : '응답 저장'}
				</Button>
				{saved && (
					<Button
						type="button"
						variant="outline"
						onClick={handleCancel}
						className="h-11"
					>
						취소
					</Button>
				)}
			</div>
		</form>
	);
}
