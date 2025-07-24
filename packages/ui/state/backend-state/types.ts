export interface IStorageItemActionResult {
	prefix: string;
	url?: string;
	error?: string;
}

export interface IBackendRole {
	id: string;
	app_id: string;
	name: string;
	description: string;
	permissions: bigint;
	attributes?: string[];
	updated_at: string;
	created_at: string;
}

export interface IInviteLink {
	id: string;
	app_id: string;
	token: string;
	count_joined: number;
	name: string;
	max_uses: number;
	created_at: string;
	updated_at: string;
}

export interface IJoinRequest {
	id: string;
	user_id: string;
	app_id: string;
	comment: string;
	created_at: string;
	updated_at: string;
}

export interface IMember {
	id: string;
	user_id: string;
	app_id: string;
	role_id: string;
	joined_via?: string;
	created_at: string;
	updated_at: string;
}

export interface IInvite {
	id: string;
	user_id: string;
	app_id: string;
	name: string;
	description?: string;
	message?: string;
	by_member_id: string;
	created_at: string;
	updated_at: string;
}

export interface IUserLookup {
	id: string;
	email?: string;
	username?: string;
	preferred_username?: string;
	name?: string;
	avatar_url?: string;
	additional_info?: string;
	description?: string;
	created_at: string;
}

export interface INotificationsOverview {
	invites_count: number;
}
