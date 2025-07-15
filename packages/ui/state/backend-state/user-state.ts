import type { IProfile } from "../../lib";
import type { ISettingsProfile } from "../../types";
import type { INotificationsOverview, IUserLookup } from "./types";

export interface IUserState {
	lookupUser(userId: string): Promise<IUserLookup>;
	searchUsers(query: string): Promise<IUserLookup[]>;
	getNotifications(): Promise<INotificationsOverview>;
	getProfile(): Promise<IProfile>;
	getSettingsProfile(): Promise<ISettingsProfile>;
}
