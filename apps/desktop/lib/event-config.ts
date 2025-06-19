import {
	ApiConfig,
	ChatInterface,
	type IEventMapping,
	SimpleChatConfig,
	UserMailConfig,
	WebhookConfig,
} from "@tm9657/flow-like-ui";

export const EVENT_CONFIG: IEventMapping = {
	events_chat: {
		configInterfaces: {
			simple_chat: SimpleChatConfig,
		},
		useInterfaces: {
			simple_chat: ChatInterface,
		},
		configs: {
			simple_chat: {
				allow_file_upload: true,
				allow_voice_input: false,
				history_elements: 5,
				tools: [],
				default_tools: [],
				example_messages: [],
			},
		},
		defaultEventType: "simple_chat",
		eventTypes: ["simple_chat", "advanced_chat"],
	},
	events_mail: {
		configInterfaces: {
			user_mail: UserMailConfig,
		},
		defaultEventType: "user_mail",
		eventTypes: ["user_mail"],
		configs: {
			user_mail: {
				mail: "",
				sender_name: "",
				secret_imap_password: "",
			},
		},
		useInterfaces: {},
	},
	events_api: {
		configInterfaces: {
			api: ApiConfig,
		},
		defaultEventType: "api",
		eventTypes: ["api"],
		configs: {
			api: {
				method: "GET",
				public_endpoint: false,
			},
		},
		useInterfaces: {},
	},
	events_simple: {
		configInterfaces: {
			webhook: WebhookConfig,
		},
		defaultEventType: "quick_action",
		eventTypes: ["quick_action", "webhook"],
		configs: {},
		useInterfaces: {},
	},
};
