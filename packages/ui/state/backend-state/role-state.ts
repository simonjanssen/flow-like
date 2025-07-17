import type { IBackendRole } from "./types";

export interface IRoleState {
	getRoles(appId: string): Promise<[string | undefined, IBackendRole[]]>;
	deleteRole(appId: string, roleId: string): Promise<void>;
	makeRoleDefault(appId: string, roleId: string): Promise<void>;
	upsertRole(appId: string, role: IBackendRole): Promise<void>;
	assignRole(appId: string, roleId: string, sub: string): Promise<void>;
}
