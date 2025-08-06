"use client";
import EventsPage from "@tm9657/flow-like-ui/components/settings/events/events-page";
import { EVENT_CONFIG } from "../../../../lib/event-config";

export default function Page() {
	return <EventsPage eventMapping={EVENT_CONFIG} />;
}
