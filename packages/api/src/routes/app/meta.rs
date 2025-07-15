use axum::{Router, routing::get};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use serde::Deserialize;

use crate::{
    auth::AppUser, ensure_in_project, ensure_permission, entity::meta, error::ApiError, middleware::jwt::AppPermissionResponse, permission::role_permission::RolePermissions, state::AppState
};

pub mod get_media;
pub mod get_meta;
pub mod remove_media;
pub mod upload_media;
pub mod upsert_meta;

pub fn routes() -> Router<AppState> {
    Router::new().route("/", get(get_meta::get_meta).put(upsert_meta::upsert_meta))
}

#[derive(Deserialize, Debug)]
pub struct MetaQuery {
    pub language: Option<String>,
    pub template_id: Option<String>,
    pub course_id: Option<String>,
}

pub enum MetaMode {
    Template(String),
    App(String),
    Course(String),
}

impl MetaMode {
    pub fn new(query: &MetaQuery, app_id: &str) -> Self {
        if let Some(template_id) = &query.template_id {
            MetaMode::Template(template_id.clone())
        } else if let Some(course_id) = &query.course_id {
            MetaMode::Course(course_id.clone())
        } else {
            MetaMode::App(app_id.to_string())
        }
    }

    pub async fn ensure_write_permission(
        &self,
        user: &AppUser,
        app_id: &str,
        state: &AppState,
    ) -> Result<AppPermissionResponse, ApiError> {
        match self {
            MetaMode::Template(_) => {
                Ok(ensure_permission!(user, app_id, state, RolePermissions::WriteTemplates))
            }
            MetaMode::Course(_) => {
                Ok(ensure_permission!(user, app_id, state, RolePermissions::WriteCourses))
            }
            MetaMode::App(_) => Ok(ensure_permission!(user, app_id, state, RolePermissions::WriteMeta)),
        }
    }

    pub async fn ensure_read_permission(
        &self,
        user: &AppUser,
        app_id: &str,
        state: &AppState,
    ) -> Result<AppPermissionResponse, ApiError> {
        match self {
            MetaMode::Template(_) => {
                Ok(ensure_permission!(user, app_id, state, RolePermissions::ReadTemplates))
            }
            MetaMode::Course(_) => {
                Ok(ensure_permission!(user, app_id, state, RolePermissions::ReadCourses))
            }
            MetaMode::App(_) => Ok(ensure_in_project!(user, &app_id, &state)),
        }
    }

    pub async fn find_existing_meta(
        &self,
        language: &str,
        txn: &sea_orm::DatabaseTransaction,
    ) -> Result<Option<meta::Model>, sea_orm::DbErr> {
        match self {
            MetaMode::Template(id) => {
                meta::Entity::find()
                    .filter(meta::Column::TemplateId.eq(id))
                    .filter(meta::Column::Lang.eq(language))
                    .one(txn)
                    .await
            }
            MetaMode::App(id) => {
                meta::Entity::find()
                    .filter(meta::Column::AppId.eq(id))
                    .filter(meta::Column::Lang.eq(language))
                    .one(txn)
                    .await
            }
            MetaMode::Course(id) => {
                meta::Entity::find()
                    .filter(meta::Column::CourseId.eq(id))
                    .filter(meta::Column::Lang.eq(language))
                    .one(txn)
                    .await
            }
        }
    }
}
