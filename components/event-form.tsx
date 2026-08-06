'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CopyButton } from '@/components/copy-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { eventCreateSchema } from '@/lib/schemas';
import { formatKST, toISOFromKSTInput } from '@/lib/date';
import { createClient } from '@/lib/supabase/client';
import { generatePublicToken } from '@/lib/token';

/**
 * 이벤트 생성 폼 (F001, F002, F006).
 *
 * Server Action을 쓰지 않는다. 이 저장소는 클라이언트 컴포넌트에서 직접
 * 처리하는 방식이고 `components/login-form.tsx`가 그 선례다.
 */

/** 필드별 에러 메시지. Zod의 flatten 결과를 담는다. */
type FieldErrors = Partial<Record<string, string[]>>;

/** `public_token` unique 충돌 시 재시도 횟수 상한. */
const MAX_TOKEN_ATTEMPTS = 5;

/** Postgres unique_violation. https://www.postgresql.org/docs/current/errcodes-appendix.html */
const UNIQUE_VIOLATION = '23505';

/** 단톡방에 붙여넣을 공유 문구 (F006) */
function buildShareText(title: string, startsAtIso: string, url: string) {
	return [
		`[${title}]`,
		formatKST(startsAtIso, 'full'),
		'',
		'참석 여부를 알려주세요',
		url,
	].join('\n');
}

export function EventForm() {
	const [errors, setErrors] = useState<FieldErrors>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [created, setCreated] = useState<{
		id: string;
		title: string;
		startsAtIso: string;
		publicToken: string;
	} | null>(null);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const values = Object.fromEntries(formData) as Record<string, string>;

		const result = eventCreateSchema.safeParse(values);
		if (!result.success) {
			setErrors(result.error.flatten().fieldErrors);
			return;
		}

		setErrors({});
		setSubmitError(null);
		setSubmitting(true);

		const supabase = createClient();
		// getUser()도 되지만 더 느리다. getClaims()는 JWT를 로컬에서 검증한다.
		const { data: session } = await supabase.auth.getClaims();
		const hostId = session?.claims?.sub;
		if (!hostId) {
			setSubmitError('로그인이 필요합니다.');
			setSubmitting(false);
			return;
		}

		// 사용자가 KST 벽시계로 입력한 값을 UTC로 옮긴다.
		const startsAtIso = toISOFromKSTInput(result.data.starts_at);
		const rsvpDeadlineIso = result.data.rsvp_deadline
			? toISOFromKSTInput(result.data.rsvp_deadline)
			: null;

		let inserted: { id: string; public_token: string } | null = null;
		let lastError: { message: string; code?: string } | null = null;

		// public_token unique 충돌은 확률이 낮지만 재현 가능하므로 새 토큰으로 재시도한다.
		for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt++) {
			const publicToken = generatePublicToken();
			const { data, error } = await supabase
				.from('events')
				.insert({
					host_id: hostId,
					public_token: publicToken,
					title: result.data.title,
					description: result.data.description ?? null,
					starts_at: startsAtIso,
					location: result.data.location ?? null,
					location_url: result.data.location_url ?? null,
					capacity: result.data.capacity ?? null,
					rsvp_deadline: rsvpDeadlineIso,
				})
				.select('id, public_token')
				.single();

			if (!error) {
				inserted = data;
				break;
			}
			lastError = error;
			if (error.code !== UNIQUE_VIOLATION) break;
		}

		setSubmitting(false);

		if (!inserted) {
			setSubmitError(
				lastError?.message ?? '모임을 만들지 못했어요. 다시 시도해 주세요.',
			);
			return;
		}

		setCreated({
			id: inserted.id,
			title: result.data.title,
			startsAtIso,
			publicToken: inserted.public_token,
		});
	};

	if (created) {
		const inviteUrl = `${typeof window === 'undefined' ? '' : window.location.origin}/e/${created.publicToken}`;
		const shareText = buildShareText(
			created.title,
			created.startsAtIso,
			inviteUrl,
		);

		return (
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-1">
					<h2 className="text-lg font-semibold">모임을 만들었어요</h2>
					<p className="text-muted-foreground text-sm">
						아래 문구를 복사해 단톡방에 붙여넣으세요.
					</p>
				</div>

				<div className="flex flex-col gap-2">
					<Label>초대 링크</Label>
					<div className="flex gap-2">
						<Input readOnly value={inviteUrl} className="font-mono text-xs" />
						<CopyButton text={inviteUrl} label="복사" />
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<Label>카톡 공유 문구</Label>
					<Textarea readOnly value={shareText} rows={6} className="text-sm" />
					<CopyButton
						text={shareText}
						label="문구 복사"
						className="self-start"
					/>
				</div>

				<div className="flex gap-2">
					<Button asChild>
						<Link href={`/events/${created.id}/manage`}>이벤트 관리로</Link>
					</Button>
					<Button variant="outline" onClick={() => setCreated(null)}>
						다시 만들기
					</Button>
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5">
			{submitError && <p className="text-destructive text-sm">{submitError}</p>}

			<Field label="제목" htmlFor="title" errors={errors.title} required>
				<Input id="title" name="title" placeholder="주말 한강 러닝" />
			</Field>

			<Field
				label="일시"
				htmlFor="starts_at"
				errors={errors.starts_at}
				hint="한국 시간(KST) 기준입니다"
				required
			>
				<Input id="starts_at" name="starts_at" type="datetime-local" />
			</Field>

			<Field label="장소" htmlFor="location" errors={errors.location}>
				<Input
					id="location"
					name="location"
					placeholder="뚝섬유원지역 2번 출구"
				/>
			</Field>

			<Field
				label="지도 링크"
				htmlFor="location_url"
				errors={errors.location_url}
				hint="http:// 또는 https:// 로 시작하는 주소만 됩니다"
			>
				<Input
					id="location_url"
					name="location_url"
					placeholder="https://map.naver.com/..."
				/>
			</Field>

			<Field
				label="안내 문구"
				htmlFor="description"
				errors={errors.description}
			>
				<Textarea
					id="description"
					name="description"
					rows={3}
					placeholder="가볍게 5km 뛰고 근처에서 저녁 먹어요."
				/>
			</Field>

			<Field
				label="정원"
				htmlFor="capacity"
				errors={errors.capacity}
				hint="비워두면 무제한. 동반 인원을 포함한 총원 기준입니다"
			>
				<Input id="capacity" name="capacity" type="number" min={1} max={500} />
			</Field>

			<Field
				label="응답 마감"
				htmlFor="rsvp_deadline"
				errors={errors.rsvp_deadline}
				hint="모임 일시보다 앞서야 합니다"
			>
				<Input id="rsvp_deadline" name="rsvp_deadline" type="datetime-local" />
			</Field>

			<Button
				type="submit"
				disabled={submitting}
				className="w-full sm:w-auto sm:self-start"
			>
				{submitting ? '만드는 중...' : '만들기'}
			</Button>
		</form>
	);
}

function Field({
	label,
	htmlFor,
	errors,
	hint,
	required,
	children,
}: {
	label: string;
	htmlFor: string;
	errors?: string[];
	hint?: string;
	required?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={htmlFor}>
				{label}
				{required && <span className="text-destructive ml-0.5">*</span>}
			</Label>
			{children}
			{hint && !errors && (
				<p className="text-muted-foreground text-xs">{hint}</p>
			)}
			{errors?.map(message => (
				<p key={message} className="text-destructive text-xs">
					{message}
				</p>
			))}
		</div>
	);
}
