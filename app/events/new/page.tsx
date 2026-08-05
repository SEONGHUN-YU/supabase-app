import { EventForm } from '@/components/event-form';

/**
 * 이벤트 생성 페이지 (F001, F002, F006).
 * 폼 자체는 클라이언트 컴포넌트라 별도 파일로 분리했다.
 */
export default function NewEventPage() {
	return (
		<main className="mx-auto flex w-full max-w-xl flex-col gap-6 py-6">
			<h1 className="text-2xl font-bold">새 이벤트</h1>
			<EventForm />
		</main>
	);
}
