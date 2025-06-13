export interface IEventPayload {
	allow_file_upload?: boolean | null;
	history_elements?: number | null;
	imap_port?: number | null;
	imap_server?: null | string;
	imap_username?: null | string;
	mail?: null | string;
	secret_imap_password?: null | string;
	secret_smtp_password?: null | string;
	sender_name?: null | string;
	smtp_port?: number | null;
	smtp_server?: null | string;
	smtp_username?: null | string;
	method?: null | string;
	path_suffix?: null | string;
	public_endpoint?: boolean | null;
	[property: string]: any;
}
