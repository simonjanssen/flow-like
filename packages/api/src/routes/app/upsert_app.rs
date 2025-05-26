use crate::{
    entity::{app, meta, role, sea_orm_active_enums::Status},
    error::ApiError,
    middleware::jwt::AppUser,
    permission::role_permission::RolePermissions,
    state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use flow_like_types::create_id;
use sea_orm::{
    ActiveModelTrait,
    ActiveValue::{NotSet, Set},
    ColumnTrait, DbErr, EntityTrait, IntoActiveModel, QueryFilter, TransactionTrait,
};
use serde::{Deserialize, Serialize};

use super::meta::Meta;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct App {
    pub status: Option<Status>,
    pub changelog: Option<String>,
    pub meta: Option<Meta>,
}

#[tracing::instrument(name = "PUT /app/{app_id}", skip(state, user))]
pub async fn upsert_app(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
    Json(app_body): Json<App>,
) -> Result<Json<app::Model>, ApiError> {
    let app = app::Entity::find()
        .filter(app::Column::Id.eq(&app_id))
        .one(&state.db)
        .await?;

    let now = chrono::Utc::now().naive_utc();

    if let Some(app) = &app {
        let sub = user.app_permission(&app_id, &state).await?;
        if !sub.has_permission(RolePermissions::Owner) {
            return Err(ApiError::Forbidden);
        }
        let mut app: app::ActiveModel = app.clone().into();
        if let Some(status) = app_body.status {
            app.status = sea_orm::ActiveValue::Set(status);
        }
        if let Some(changelog) = app_body.changelog {
            app.changelog = sea_orm::ActiveValue::Set(Some(changelog));
        }
        app.updated_at = sea_orm::ActiveValue::Set(now.clone());
        let app: app::Model = app.save(&state.db).await?.try_into()?;
        return Ok(Json(app));
    }

    let app = state
        .db
        .transaction::<_, app::Model, DbErr>(|txn| {
            Box::pin(async move {
                let app = app::ActiveModel {
                    id: Set(create_id()),
                    changelog: Set(app_body.changelog),
                    status: Set(app_body.status.unwrap_or(Status::Active)),
                    created_at: Set(now.clone()),
                    updated_at: Set(now.clone()),
                    ..Default::default()
                };

                let app = app.insert(txn).await?;
                let app_id = app.id.clone();

                if let Some(meta) = app_body.meta {
                    let meta = meta::ActiveModel {
                        id: Set(create_id()),
                        app_id: Set(Some(app_id.clone())),
                        name: Set(meta.name.unwrap_or("Untitled App".to_string())),
                        description: Set(meta.description),
                        long_description: Set(meta.long_description),
                        tags: Set(meta.tags),
                        lang: Set(meta.lang),
                        created_at: Set(now.clone()),
                        updated_at: Set(now.clone()),
                        ..Default::default()
                    };
                    meta.insert(txn).await?;
                }

                let owner_role = role::ActiveModel {
                    id: Set(create_id()),
                    name: Set("Owner".to_string()),
                    description: Set(Some("Owner role".to_string())),
                    permissions: Set(RolePermissions::Owner.bits()),
                    created_at: Set(now.clone()),
                    updated_at: Set(now.clone()),
                    app_id: Set(Some(app_id.clone())),
                    attributes: NotSet,
                };

                let owner_role = owner_role.insert(txn).await?;

                let admin_role = role::ActiveModel {
                    id: Set(create_id()),
                    name: Set("Admin".to_string()),
                    description: Set(Some("Admin role".to_string())),
                    permissions: Set(RolePermissions::Admin.bits()),
                    created_at: Set(now.clone()),
                    updated_at: Set(now.clone()),
                    app_id: Set(Some(app_id.clone())),
                    attributes: NotSet,
                };

                admin_role.insert(txn).await?;

                let mut user_permission = RolePermissions::ReadTemplates;
                user_permission.insert(RolePermissions::ExecuteReleases);
                user_permission.insert(RolePermissions::ListReleases);

                let user_role = role::ActiveModel {
                    id: Set(create_id()),
                    name: Set("User".to_string()),
                    description: Set(Some("User role".to_string())),
                    permissions: Set(user_permission.bits()),
                    created_at: Set(now.clone()),
                    updated_at: Set(now.clone()),
                    app_id: Set(Some(app_id.clone())),
                    attributes: NotSet,
                };

                let user_role = user_role.insert(txn).await?;

                let mut app = app.into_active_model();
                app.owner_role_id = Set(Some(owner_role.id.clone()));
                app.default_role_id = Set(Some(user_role.id.clone()));

                let app = app.update(txn).await?;

                Ok(app)
            })
        })
        .await?;

    Ok(Json(app))
}
