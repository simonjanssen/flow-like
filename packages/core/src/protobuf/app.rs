use crate::app::App;
use flow_like_types::{FromProto, Timestamp, ToProto};
use std::time::SystemTime;

impl ToProto<flow_like_types::proto::App> for App {
    fn to_proto(&self) -> flow_like_types::proto::App {
        flow_like_types::proto::App {
            id: self.id.clone(),
            authors: self.authors.clone(),
            bits: self.bits.clone(),
            boards: self.boards.clone(),
            releases: self.releases.clone(),
            templates: self.templates.clone(),
            created_at: Some(Timestamp::from(self.created_at)),
            updated_at: Some(Timestamp::from(self.updated_at)),
            ..Default::default()
        }
    }
}

impl FromProto<flow_like_types::proto::App> for App {
    fn from_proto(proto: flow_like_types::proto::App) -> Self {
        App {
            id: proto.id,
            authors: proto.authors,
            bits: proto.bits,
            boards: proto.boards,
            releases: proto.releases,
            templates: proto.templates,
            created_at: proto
                .created_at
                .map(|t| SystemTime::try_from(t).unwrap_or(SystemTime::UNIX_EPOCH))
                .unwrap_or(SystemTime::UNIX_EPOCH),
            updated_at: proto
                .updated_at
                .map(|t| SystemTime::try_from(t).unwrap_or(SystemTime::UNIX_EPOCH))
                .unwrap_or(SystemTime::UNIX_EPOCH),
            app_state: None,
            frontend: None,
        }
    }
}
