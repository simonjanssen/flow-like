use flow_like::{
    flow::{
        execution::{LogLevel, context::ExecutionContext},
        node::{Node, NodeLogic},
        pin::PinOptions,
        variable::VariableType,
    },
    state::FlowLikeState,
};
use flow_like_types::{async_trait, json::json};
use futures::TryStreamExt;

use crate::mail::imap::{ImapConnection, inbox::list::EmailRef};

// ============================
// Create Draft Node
// ============================
#[derive(Default)]
pub struct ImapCreateDraftNode;

impl ImapCreateDraftNode {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl NodeLogic for ImapCreateDraftNode {
    async fn get_node(&self, _app_state: &FlowLikeState) -> Node {
        let mut node = Node::new(
            "email_imap_create_draft",
            "Create Draft",
            "Appends a new draft message to a mailbox (defaults to 'Drafts')",
            "Email/IMAP",
        );
        node.add_icon("/flow/icons/draft.svg");

        node.add_input_pin("exec_in", "In", "Trigger", VariableType::Execution);

        // Reuse EmailRef solely for account/connection; inbox/uid are ignored here.
        node.add_input_pin(
            "connection",
            "Connection",
            "IMAP connection details",
            VariableType::Struct,
        )
        .set_schema::<ImapConnection>()
        .set_options(PinOptions::new().set_enforce_schema(true).build());

        node.add_input_pin(
            "mailbox",
            "Drafts Mailbox",
            "Where to store the draft",
            VariableType::String,
        )
        .set_default_value(Some(json!("Drafts")));

        node.add_input_pin(
            "create_if_missing",
            "Create If Missing",
            "Create the destination mailbox if it doesn't exist",
            VariableType::Boolean,
        )
        .set_default_value(Some(json!(true)));

        // Headers / content
        node.add_input_pin("from", "From", "From header", VariableType::String);
        node.add_input_pin("to", "To", "Comma-separated list", VariableType::String);
        node.add_input_pin("cc", "Cc", "Comma-separated list", VariableType::String)
            .set_default_value(Some(json!("")));
        node.add_input_pin("bcc", "Bcc", "Comma-separated list", VariableType::String)
            .set_default_value(Some(json!("")));
        node.add_input_pin("subject", "Subject", "Subject line", VariableType::String)
            .set_default_value(Some(json!("(no subject)")));
        node.add_input_pin(
            "body_text",
            "Body (text)",
            "Plaintext body",
            VariableType::String,
        )
        .set_default_value(Some(json!("")));
        node.add_input_pin(
            "body_html",
            "Body (HTML)",
            "Optional HTML body",
            VariableType::String,
        )
        .set_default_value(Some(json!("")));
        node.add_input_pin(
            "mark_seen",
            "Mark as Seen",
            "Save draft with \\Seen flag in addition to \\Draft",
            VariableType::Boolean,
        )
        .set_default_value(Some(json!(false)));

        node.add_output_pin("exec_out", "", "", VariableType::Execution);
        node
    }

    async fn run(&self, context: &mut ExecutionContext) -> flow_like_types::Result<()> {
        context.deactivate_exec_pin("exec_out").await?;

        let connection: ImapConnection = context.evaluate_pin("connection").await?;
        let mailbox: String = context.evaluate_pin("mailbox").await?;
        let create_if_missing: bool = context.evaluate_pin("create_if_missing").await?;

        let from: String = context.evaluate_pin("from").await?;
        let to: String = context.evaluate_pin("to").await?;
        let cc: String = context.evaluate_pin("cc").await?;
        let bcc: String = context.evaluate_pin("bcc").await?;
        let subject: String = context.evaluate_pin("subject").await?;
        let body_text: String = context.evaluate_pin("body_text").await?;
        let body_html: String = context.evaluate_pin("body_html").await?;
        let mark_seen: bool = context.evaluate_pin("mark_seen").await?;

        let mut cached_session = connection.to_session_cache(context).await?;

        if create_if_missing {
            if !cached_session.mailbox_exists(&mailbox).await? {
                context.log_message(
                    &format!("Drafts mailbox '{}' missing → creating", mailbox),
                    LogLevel::Debug,
                );
                cached_session.create_mailbox(&mailbox).await.map_err(|e| {
                    flow_like_types::anyhow!("Failed to create mailbox '{}': {}", mailbox, e)
                })?;
            }
        }

        // Build RFC 5322 message (simple plain or multipart/alternative)
        let message =
            build_rfc5322_message(&from, &to, &cc, &bcc, &subject, &body_text, &body_html);

        // Append with \Draft (+ optionally \Seen); if that fails, retry without flags
        let flags_str = if mark_seen {
            "\\Draft \\Seen"
        } else {
            "\\Draft"
        };

        let mut session = cached_session.session.lock().await;
        if let Err(e) = session
            .append(&mailbox, Some(flags_str), None, message.as_bytes())
            .await
        {
            context.log_message(
                &format!(
                    "APPEND with flags failed on '{}' ({}). Retrying without flags…",
                    mailbox, e
                ),
                LogLevel::Warn,
            );
            session
                .append(&mailbox, None, None, message.as_bytes())
                .await
                .map_err(|e2| {
                    flow_like_types::anyhow!("APPEND to '{}' failed (no flags): {}", mailbox, e2)
                })?;
        }

        context.log_message(
            &format!("Draft created in '{}' (subject: '{}')", mailbox, subject),
            LogLevel::Debug,
        );

        context.activate_exec_pin("exec_out").await?;
        Ok(())
    }
}

// ============================
// Helpers
// ============================
fn build_rfc5322_message(
    from: &str,
    to: &str,
    cc: &str,
    bcc: &str,
    subject: &str,
    body_text: &str,
    body_html: &str,
) -> String {
    let crlf = "\r\n";
    let mut headers = Vec::new();

    if !from.is_empty() {
        headers.push(format!("From: {}", from));
    }
    if !to.is_empty() {
        headers.push(format!("To: {}", to));
    }
    if !cc.is_empty() {
        headers.push(format!("Cc: {}", cc));
    }
    if !bcc.is_empty() {
        headers.push(format!("Bcc: {}", bcc));
    }
    headers.push(format!("Subject: {}", subject));
    // Message-ID helps servers accept APPENDed messages
    headers.push(format!("Message-ID: {}", generate_message_id(from)));
    headers.push("MIME-Version: 1.0".to_string());

    let mut message = String::new();

    if body_html.trim().is_empty() {
        // Plain text only
        headers.push("Content-Type: text/plain; charset=utf-8".to_string());
        headers.push("Content-Transfer-Encoding: 8bit".to_string());
        message.push_str(&headers.join(crlf));
        message.push_str(crlf);
        message.push_str(crlf);
        message.push_str(body_text);
        // Footer signature
        message.push_str(crlf);
        message.push_str(crlf);
        message.push_str("--");
        message.push_str(crlf);
        message.push_str("sent from flow-like.com, your efficient automation suite");
    } else {
        // multipart/alternative
        let boundary = "----=_FlowLikeBoundary_mpart_alternative_001";
        headers.push(format!(
            "Content-Type: multipart/alternative; boundary=\"{}\"",
            boundary
        ));
        message.push_str(&headers.join(crlf));
        message.push_str(crlf);
        message.push_str(crlf);

        // text part
        message.push_str(&format!("--{}{}", boundary, crlf));
        message.push_str("Content-Type: text/plain; charset=utf-8");
        message.push_str(crlf);
        message.push_str("Content-Transfer-Encoding: 8bit");
        message.push_str(crlf);
        message.push_str(crlf);
        message.push_str(body_text);
        message.push_str(crlf);

        // html part
        message.push_str(&format!("--{}{}", boundary, crlf));
        message.push_str("Content-Type: text/html; charset=utf-8");
        message.push_str(crlf);
        message.push_str("Content-Transfer-Encoding: 8bit");
        message.push_str(crlf);
        message.push_str(crlf);
        message.push_str(body_html);
        // Footer signature (HTML)
        message.push_str("<br><br>&mdash;<br><small>sent via <a href=\"https://flow-like.com\">flow-like.com</a>, your efficient automation suite</small>");
        message.push_str(crlf);

        // closing boundary
        message.push_str(&format!("--{}--{}", boundary, crlf));
    }

    message
}

fn generate_message_id(from: &str) -> String {
    use std::time::SystemTime;
    let domain = from.split('@').nth(1).unwrap_or("flow-like.local");
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    format!(
        "<flowlike-{}-{}@{}>",
        now.as_secs(),
        now.subsec_nanos(),
        domain
    )
}
