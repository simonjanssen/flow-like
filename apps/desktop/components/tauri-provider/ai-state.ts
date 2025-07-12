import { IAIState } from "@tm9657/flow-like-ui/state/backend-state/ai-state";
import { TauriBackend } from "../tauri-provider";
import { IHistoryMessage, IIntercomEvent, IResponse, IResponseChunk } from "@tm9657/flow-like-ui";
import { Channel, invoke } from "@tauri-apps/api/core";

export class AiState implements IAIState {
	constructor(private readonly backend: TauriBackend) { }

	async streamChatComplete(messages: IHistoryMessage[]): Promise<ReadableStream<IResponseChunk[]>> {
		const channel = new Channel<IIntercomEvent[]>();

		// Create a ReadableStream that will be used to stream the response
		const stream = new ReadableStream<IResponseChunk[]>({
			start(controller) {
				channel.onmessage = (chunks: IIntercomEvent[]) => {
					const responseChunks = chunks.filter(chunk => chunk.event_type === "chunk").map(chunk => chunk.payload as IResponseChunk);
					controller.enqueue(responseChunks);
					for (const chunk of chunks) {
						if (chunk.event_type === "chunk") {
							const responseChunk = chunk.payload as IResponseChunk;
							if (responseChunk?.choices?.[0]?.finish_reason === "stop") {
								controller.close();
							}
						}
					}
				};
			},

			cancel() {
				// Background task will finish naturally
			}
		});

		const request = invoke<IResponse>("stream_chat_completion", {
			messages: messages,
			onChunk: channel,
		})

		this.backend.backgroundTaskHandler(request);

		return stream
	}

	async chatComplete(messages: IHistoryMessage[]): Promise<IResponse> {
		const response = await invoke<IResponse>("chat_completion", {
			messages: messages,
		})

		return response
	}
}
