"use client";

import {
	Button,
	ChatInterface,
	type IToolBarActions,
	LoadingScreen,
	NoDefaultInterface,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	useBackend,
	useInvoke,
} from "@tm9657/flow-like-ui";
import { parseUint8ArrayToJson } from "@tm9657/flow-like-ui/lib/uint8";
import { HistoryIcon, SettingsIcon, SidebarOpenIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
	type ReactNode,
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { USABLE_EVENTS } from "../library/config/layout";
import NotFound from "../library/config/not-found";
interface HeaderProps {
	currentEvent: any;
	sortedEvents: any[];
	metadata: any;
	appId: string;
	switchEvent: (eventId: string) => void;
}

const Header = forwardRef<IToolBarActions, HeaderProps>(
	({ currentEvent, sortedEvents, metadata, appId, switchEvent }, ref) => {
		const [toolbarElements, setToolbarElements] = useState<ReactNode[]>([]);

		useImperativeHandle(ref, () => ({
			pushElements: (elements: ReactNode[]) => {
				setToolbarElements(elements);
			},
		}));

		if (!currentEvent) return null;

		return (
			<div className="flex items-center justify-between p-4 bg-background backdrop-blur-sm">
				<div className="flex items-center gap-1">
					<Select value={currentEvent.id} onValueChange={switchEvent}>
						<SelectTrigger className="max-w-[200px] flex flex-row justify-between h-8 bg-muted/20 border-transparent">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{sortedEvents
								.filter((event) => USABLE_EVENTS.has(event.event_type))
								.map((event) => (
									<SelectItem key={event.id} value={event.id}>
										{event.name || event.event_type}
									</SelectItem>
								))}
						</SelectContent>
					</Select>
					<div className="flex items-center gap-1">
						{toolbarElements.map((element, index) => (
							<div key={index}>{element}</div>
						))}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">{metadata?.name}</h1>
					<Link
						href={`/library/config/events?id=${appId}&eventId=${currentEvent.id}`}
					>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => {
								// Handle chat history toggle
								console.log("Open chat history");
							}}
							className="h-8 w-8 p-0"
						>
							<SettingsIcon className="h-4 w-4" />
						</Button>
					</Link>
				</div>
			</div>
		);
	},
);

Header.displayName = "Header";

export default function Page() {
	const backend = useBackend();
	const searchParams = useSearchParams();
	const appId = searchParams.get("id");
	const headerRef = useRef<IToolBarActions>(null);

	const router = useRouter();

	const metadata = useInvoke(
		backend.getAppMeta,
		[appId ?? ""],
		typeof appId === "string",
	);
	const eventId = searchParams.get("eventId");
	const events = useInvoke(
		backend.getEvents,
		[appId ?? ""],
		(appId ?? "") !== "",
	);
	const sortedEvents = useMemo(() => {
		if (!events.data) return [];
		return events.data
			.filter((a) => a.active)
			.toSorted((a, b) => a.priority - b.priority);
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

			// Clear toolbar elements when switching events
			headerRef.current?.pushElements([]);

			router.push(`/use?id=${appId}&eventId=${newEventId}`);
		},
		[appId, router, eventId],
	);

	const config = useMemo(() => {
		if (!currentEvent) return {};
		try {
			return parseUint8ArrayToJson(currentEvent.config);
		} catch (e) {
			console.error("Error parsing parameters:", e);
			return {};
		}
	}, [currentEvent]);

	useEffect(() => {
		if (sortedEvents.length === 0) return;
		if (!appId) return;

		let rerouteEvent = sortedEvents.find((e) =>
			USABLE_EVENTS.has(e.event_type),
		);
		const lastEventId = localStorage.getItem(`lastUsedEvent-${appId}`);
		const lastEvent = sortedEvents.find((e) => e.id === lastEventId);

		if (lastEvent && USABLE_EVENTS.has(lastEvent.event_type)) {
			rerouteEvent = lastEvent;
		}

		if (!currentEvent) {
			if (rerouteEvent) {
				switchEvent(rerouteEvent.id);
				return;
			}
			return;
		}

		if (eventId && !USABLE_EVENTS.has(currentEvent.event_type)) {
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
				<Header
					ref={headerRef}
					currentEvent={currentEvent}
					sortedEvents={sortedEvents}
					metadata={metadata.data}
					appId={appId}
					switchEvent={switchEvent}
				/>
				<NoDefaultInterface appId={appId} eventId={eventId ?? undefined} />
			</main>
		);
	}

	if (currentEvent.event_type === "simple_chat") {
		return (
			<main className="flex flex-col h-full min-h-dvh max-h-dvh">
				<Header
					ref={headerRef}
					currentEvent={currentEvent}
					sortedEvents={sortedEvents}
					metadata={metadata.data}
					appId={appId}
					switchEvent={switchEvent}
				/>
				<ChatInterface
					appId={appId}
					event={currentEvent}
					config={config}
					toolbarRef={headerRef}
				/>
			</main>
		);
	}

	return (
		<main className="flex flex-col h-full min-h-dvh max-h-dvh">
			<Header
				ref={headerRef}
				currentEvent={currentEvent}
				sortedEvents={sortedEvents}
				metadata={metadata.data}
				appId={appId}
				switchEvent={switchEvent}
			/>
			<NoDefaultInterface appId={appId} eventId={eventId ?? undefined} />
		</main>
	);
}
