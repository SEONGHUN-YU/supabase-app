import { Suspense } from 'react';
import { EventForm } from '@/components/event-form';

/**
 * 이벤트 생성 페이지 (F001, F002, F006).
 * 폼 자체는 클라이언트 컴포넌트라 별도 파일로 분리했다.
 *
 * `EventForm`이 `?duplicate=` 쿼리를 읽으려고 `useSearchParams()`를 쓰므로
 * `cacheComponents` 환경에서 동적이 된다. `<Suspense>`로 감싸야 빌드가 통과한다.
 */
function FormSkeleton() {
	return (
		<div className="flex flex-col gap-3">
			<div className="bg-muted h-10 animate-pulse rounded-md" />
			<div className="bg-muted h-10 animate-pulse rounded-md" />
			<div className="bg-muted h-24 animate-pulse rounded-md" />
		</div>
	);
}

export default function NewEventPage() {
	return (
		<main className="mx-auto flex w-full max-w-xl flex-col gap-6 py-6">
			<h1 className="text-2xl font-bold">새 이벤트</h1>
			<Suspense fallback={<FormSkeleton />}>
				<EventForm />
			</Suspense>
		</main>
	);
}
