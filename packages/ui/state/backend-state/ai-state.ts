import type { IHistoryMessage, IResponse, IResponseChunk } from "../../lib";

export interface IAIState {
	streamChatComplete(
		messages: IHistoryMessage[],
	): Promise<ReadableStream<IResponseChunk[]>>;
	chatComplete(messages: IHistoryMessage[]): Promise<IResponse>;
}
