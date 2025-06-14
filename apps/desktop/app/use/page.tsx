"use client";

import { useSearchParams } from "next/navigation";
import NotFound from "../library/config/not-found";

export default function Page() {
	const searchParams = useSearchParams();
	const appId = searchParams.get("id");
	const eventId = searchParams.get("eventId");

	if (!appId) {
		return <NotFound />;
	}

	return <NotFound />;
}
