import Dexie, { type EntityTable } from "dexie";
import type { IHistoryMessage } from "../../../lib";

export type IAttachment =
	| string // Simple URL variant
	| {
			// Complex variant
			url: string;
			preview_text?: string;
			thumbnail_url?: string;
			name?: string;
			size?: number;
			type?: string;
			anchor?: string;
			page?: number;
	  };

export interface IMessage {
	id: string;
	appId: string;
	sessionId: string;
	inner: IHistoryMessage;
	files: IAttachment[];
	actions?: string[];
	tools?: string[];
	explicit_name?: string;
	timestamp: number;
}

export interface ILocalChatState {
	id: string;
	appId: string;
	eventId: string;
	sessionId: string;
	localState: Record<string, any>;
}

export interface IGlobalState {
	id: string;
	appId: string;
	eventId: string;
	globalState: Record<string, any>;
}

const chatDb = new Dexie("ChatHistoryDatabase") as Dexie & {
	messages: EntityTable<IMessage, "id">;
	localStage: EntityTable<ILocalChatState, "id">;
	globalState: EntityTable<IGlobalState, "id">;
};

// Schema declaration:
chatDb.version(1).stores({
	messages: "id, sessionId",
	localStage: "sessionId, appId, eventId, [sessionId+eventId], timestamp",
	globalState: "appId, eventId, [appId+eventId]",
});

export { chatDb };
