"use client";

import { useBackend, useInvoke } from "@tm9657/flow-like-ui";

export function ThemeLoader() {
	const backend = useBackend();

	const profile = useInvoke(
		backend.userState.getProfile,
		backend.userState,
		[],
	);

	// useEffect(() => {
	// 	if (!profile.data?.theme) {
	// 		loadTheme({
	// 			light: {},
	// 			dark: {},
	// 		});
	// 		return;
	// 	}

	// 	loadTheme(profile.data.theme);
	// }, [profile.data]);

	return null;
}
