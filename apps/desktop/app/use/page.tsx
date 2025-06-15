"use client";

import {
	LoadingScreen,
	NoDefaultInterface,
	useBackend,
	useInvoke,
} from "@tm9657/flow-like-ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { USABLE_EVENTS } from "../library/config/layout";
import NotFound from "../library/config/not-found";

export default function Page() {
	const backend = useBackend();
	const searchParams = useSearchParams();
	const appId = searchParams.get("id");

	const router = useRouter();

	const eventId = searchParams.get("eventId");
	const events = useInvoke(
		backend.getEvents,
		[appId ?? ""],
		(appId ?? "") !== "",
	);
	const sortedEvents = useMemo(() => {
		if (!events.data) return [];
		return events.data.toSorted((a, b) => a.priority - b.priority);
	}, [events.data]);
	const currentEvent = useMemo(() => {
		if (!eventId) return undefined;
		return sortedEvents.find((e) => e.id === eventId);
	}, [eventId, sortedEvents]);

	const switchEvent = useCallback(
		(newEventId: string) => {
			if (!appId) return;
			if (!newEventId) return;
			if (eventId === newEventId) return;
			if (newEventId === "") return;
			router.push(`/use?id=${appId}&eventId=${newEventId}`);
		},
		[appId, router, eventId],
	);

	useEffect(() => {
		if (sortedEvents.length === 0) return;
		if (!appId) return;

		let rerouteEvent = sortedEvents.find((e) => USABLE_EVENTS.has(e.type));
		const lastEventId = localStorage.getItem(`lastUsedEvent-${appId}`);
		const lastEvent = sortedEvents.find((e) => e.id === lastEventId);

		if (lastEvent && USABLE_EVENTS.has(lastEvent.type)) {
			rerouteEvent = lastEvent;
		}

		if (!currentEvent) {
			if (rerouteEvent) {
				switchEvent(rerouteEvent.id);
				return;
			}
			return;
		}

		if (eventId && !USABLE_EVENTS.has(currentEvent.type)) {
			switchEvent(rerouteEvent?.id ?? "");
			return;
		}

		localStorage.setItem(`lastUsedEvent-${appId}`, eventId ?? "");
	}, [appId, eventId, sortedEvents, currentEvent, switchEvent]);

	if (!appId) {
		return <NotFound />;
	}

	if (!currentEvent) {
		return (
			<main className="flex flex-col h-full min-h-dvh max-h-dvh">
				<NoDefaultInterface appId={appId} eventId={eventId ?? undefined} />
			</main>
		);
	}

	if (!USABLE_EVENTS.has(currentEvent.type)) {
		return (
			<main className="flex flex-col h-full min-h-dvh max-h-dvh">
				<NoDefaultInterface appId={appId} eventId={eventId ?? undefined} />
			</main>
		);
	}

	return (
		<main className="flex flex-col h-full min-h-dvh max-h-dvh">
			<NoDefaultInterface appId={appId} eventId={eventId ?? undefined} />
		</main>
	);
}
