import Link from 'next/link';
import { Suspense } from 'react';
import { EmptyState } from '@/components/empty-state';
import { EventCard } from '@/components/event-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/server';
import type { Event, EventSummary } from '@/types/database';

/**
 * 대시보드 (F011).
 *
 * `/dashboard`는 proxy 인증 예외에 없는 로그인 전용 라우트다. `/e/[token]`처럼
 * 정적 셸을 지킬 이점이 없으므로(006의 '좁게' 원칙이 존재하는 이유가 여기엔
 * 해당하지 않음), manage 페이지와 같은 이유로 데이터 조회 영역 전체를 단일
 * `<Suspense>`로 감싼다.
 */

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** 시작 시각 기준으로 다가오는 모임과 지난 모임을 나눈다. */
function splitByTime(events: EventSummary[]) {
	const now = Date.now();
	return {
		upcoming: events.filter(event => Date.parse(event.starts_at) >= now),
		past: events.filter(event => Date.parse(event.starts_at) < now),
	};
}

/** event_id별 참석 총원(동반 인원 포함). `get_event_preview`의 going_count와 같은 계산. */
async function countGoingByEvent(
	supabase: SupabaseServerClient,
	eventIds: string[],
): Promise<Record<string, number>> {
	if (eventIds.length === 0) return {};

	const { data, error } = await supabase
		.from('participants')
		.select('event_id, status, guest_count')
		.in('event_id', eventIds);
	if (error) throw error;

	const totals: Record<string, number> = {};
	for (const row of data ?? []) {
		if (row.status !== 'going') continue;
		totals[row.event_id] = (totals[row.event_id] ?? 0) + 1 + row.guest_count;
	}
	return totals;
}

/** 주최 목록. host는 RLS(`participants_host`)로 참여자 행을 직접 볼 수 있어 집계 쿼리를 쓴다. */
async function fetchHosted(
	supabase: SupabaseServerClient,
	hostId: string,
): Promise<EventSummary[]> {
	const { data, error } = await supabase
		.from('events')
		.select('*')
		.eq('host_id', hostId)
		.order('starts_at', { ascending: false });
	if (error) throw error;

	const events = (data ?? []) as Event[];
	const totals = await countGoingByEvent(
		supabase,
		events.map(event => event.id),
	);
	return events.map(event => ({
		...event,
		going_count: totals[event.id] ?? 0,
	}));
}

/**
 * 참여 목록. 참여자는 다른 참여자 행을 볼 권한이 없으므로(RLS `participants_self`는
 * 본인 행만 허용) going_count는 공개 함수 `get_event_preview`로 채운다.
 */
async function fetchJoined(
	supabase: SupabaseServerClient,
	userId: string,
): Promise<EventSummary[]> {
	const { data, error } = await supabase
		.from('participants')
		.select('events(*)')
		.eq('user_id', userId);
	if (error) throw error;

	const events = (data ?? [])
		.map(row => row.events as unknown as Event | null)
		.filter((event): event is Event => event !== null);

	const previews = await Promise.all(
		events.map(event =>
			supabase
				.rpc('get_event_preview', { p_token: event.public_token })
				.maybeSingle(),
		),
	);

	return events.map((event, index) => {
		const preview = previews[index].data as { going_count: number } | null;
		return { ...event, going_count: preview?.going_count ?? 0 };
	});
}

function EventSection({
	title,
	events,
	hrefFor,
	emptyTitle,
	emptyDescription,
}: {
	title: string;
	events: EventSummary[];
	hrefFor: (event: EventSummary) => string;
	emptyTitle: string;
	emptyDescription?: string;
}) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-muted-foreground text-sm font-medium">
				{title}
				<span className="ml-1.5">{events.length}</span>
			</h2>

			{events.length === 0 ? (
				<EmptyState title={emptyTitle} description={emptyDescription} />
			) : (
				<div className="flex flex-col gap-3">
					{events.map(event => (
						<EventCard key={event.id} event={event} href={hrefFor(event)} />
					))}
				</div>
			)}
		</section>
	);
}

async function DashboardTabs() {
	const supabase = await createClient();
	// proxy가 이미 인증을 강제하므로 uid 부재는 방어적 처리일 뿐이다.
	const { data: session } = await supabase.auth.getClaims();
	const uid = session?.claims?.sub;

	const [hostedEvents, joinedEvents] = uid
		? await Promise.all([
				fetchHosted(supabase, uid),
				fetchJoined(supabase, uid),
			])
		: [[], []];

	const hosted = splitByTime(hostedEvents);
	const joined = splitByTime(joinedEvents);

	return (
		<Tabs defaultValue="hosted" className="flex flex-col gap-6">
			<TabsList className="w-full sm:w-auto">
				<TabsTrigger value="hosted" className="flex-1 sm:flex-none">
					주최
				</TabsTrigger>
				<TabsTrigger value="joined" className="flex-1 sm:flex-none">
					참여
				</TabsTrigger>
			</TabsList>

			<TabsContent value="hosted" className="flex flex-col gap-6">
				<EventSection
					title="다가오는 모임"
					events={hosted.upcoming}
					hrefFor={event => `/events/${event.id}/manage`}
					emptyTitle="아직 만든 모임이 없어요"
					emptyDescription="첫 모임을 만들고 초대 링크를 공유해 보세요."
				/>
				<EventSection
					title="지난 모임"
					events={hosted.past}
					hrefFor={event => `/events/${event.id}/manage`}
					emptyTitle="지난 모임이 없어요"
				/>
			</TabsContent>

			<TabsContent value="joined" className="flex flex-col gap-6">
				<EventSection
					title="다가오는 모임"
					events={joined.upcoming}
					hrefFor={event => `/e/${event.public_token}`}
					emptyTitle="참여 중인 모임이 없어요"
					emptyDescription="받은 초대 링크를 열면 여기에 표시됩니다."
				/>
				<EventSection
					title="지난 모임"
					events={joined.past}
					hrefFor={event => `/e/${event.public_token}`}
					emptyTitle="지난 모임이 없어요"
				/>
			</TabsContent>
		</Tabs>
	);
}

function DashboardSkeleton() {
	return (
		<div className="flex flex-col gap-3">
			<div className="bg-muted h-9 w-48 animate-pulse rounded-md" />
			<div className="bg-muted h-24 animate-pulse rounded-md" />
			<div className="bg-muted h-24 animate-pulse rounded-md" />
		</div>
	);
}

export default function DashboardPage() {
	return (
		<main className="flex flex-col gap-6 py-6">
			<div className="flex items-center justify-between gap-3">
				<h1 className="text-2xl font-bold">대시보드</h1>
				<Button asChild size="sm">
					<Link href="/events/new">새 이벤트</Link>
				</Button>
			</div>

			<Suspense fallback={<DashboardSkeleton />}>
				<DashboardTabs />
			</Suspense>
		</main>
	);
}
