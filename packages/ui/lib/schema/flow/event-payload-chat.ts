export interface IEventPayloadChat {
	allow_file_upload?: boolean | null;
	allow_voice_input?: boolean | null;
	allow_voice_output?: boolean | null;
	default_tools?: string[] | null;
	example_messages?: string[] | null;
	history_elements?: number | null;
	tools?: string[] | null;
	[property: string]: any;
}
