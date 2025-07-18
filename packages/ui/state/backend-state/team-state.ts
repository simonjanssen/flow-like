import type { IInvite, IInviteLink, IJoinRequest, IMember } from "./types";

export interface ITeamState {
	createInviteLink(appId: string, name: string, maxUses: number): Promise<void>;
	getInviteLinks(appId: string): Promise<IInviteLink[]>;
	removeInviteLink(appId: string, linkId: string): Promise<void>;
	joinInviteLink(appId: string, token: string): Promise<void>;
	requestJoin(appId: string, comment: string): Promise<void>;
	getJoinRequests(
		appId: string,
		offset?: number,
		limit?: number,
	): Promise<IJoinRequest[]>;
	acceptJoinRequest(appId: string, requestId: string): Promise<void>;
	rejectJoinRequest(appId: string, requestId: string): Promise<void>;
	getTeam(appId: string, offset?: number, limit?: number): Promise<IMember[]>;
	getInvites(offset?: number, limit?: number): Promise<IInvite[]>;
	acceptInvite(inviteId: string): Promise<void>;
	rejectInvite(inviteId: string): Promise<void>;
	inviteUser(appId: string, user_id: string, message: string): Promise<void>;
	removeUser(appId: string, user_id: string): Promise<void>;
}
