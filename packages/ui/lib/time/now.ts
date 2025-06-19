import type { ISystemTime } from "../schema";

export function nowSystemTime(): ISystemTime {
	const now = new Date();
	return {
		nanos_since_epoch: 0,
		secs_since_epoch: Math.floor(now.getTime() / 1000),
	};
}
