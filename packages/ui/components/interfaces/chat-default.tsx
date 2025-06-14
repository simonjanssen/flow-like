"use client";

export function ChatInterface({
	appId,
	eventId,
}: Readonly<{ appId: string; eventId: string }>) {
	return (
		<div className="flex flex-col h-full">
			<div className="flex-1 overflow-y-auto p-4">
				<p>
					Chat interface for App ID: {appId}, Event ID: {eventId}
				</p>
			</div>
			<div className="p-4 border-t">
				<input
					type="text"
					placeholder="Type a message..."
					className="w-full p-2 border rounded"
				/>
			</div>
		</div>
	);
}
