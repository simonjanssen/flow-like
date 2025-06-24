import type { IAppVisibility } from "@tm9657/flow-like-ui";
import Dexie, { type EntityTable } from "dexie";

export interface IVisibilityStatus {
	appId: string;
	visibility: IAppVisibility;
}

const appsDB = new Dexie("Apps") as Dexie & {
	visibility: EntityTable<IVisibilityStatus, "appId">;
};

appsDB.version(1).stores({
	visibility: "appId",
});

export { appsDB };
