use crate::{
    entity::{
        app, membership, meta, role, sea_orm_active_enums::{Status, Visibility}
    },
    error::ApiError,
    middleware::jwt::AppUser,
    permission::role_permission::RolePermissions,
    routes::LanguageParams,
    state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
};
use flow_like::{app::App, bit::Metadata};
use flow_like_types::create_id;
use sea_orm::{
    ActiveModelTrait,
    ActiveValue::{NotSet, Set},
    ColumnTrait, DbErr, EntityTrait, IntoActiveModel, QueryFilter, TransactionTrait,
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct AppUpsertBody {
    pub app: Option<App>,
    pub meta: Option<Metadata>,
}

#[tracing::instrument(name = "PUT /app/{app_id}", skip(state, user, app_body, query))]
pub async fn upsert_app(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
    Query(query): Query<LanguageParams>,
    Json(app_body): Json<AppUpsertBody>,
) -> Result<Json<App>, ApiError> {
    let sub = user.sub()?;

    let app = app::Entity::find()
        .filter(app::Column::Id.eq(&app_id))
        .one(&state.db)
        .await?;

    let language = query.language.clone().unwrap_or_else(|| "en".to_string());

    let now = chrono::Utc::now().naive_utc();

    if let (Some(app), Some(app_updates)) = (&app, &app_body.app) {
        let sub = user.app_permission(&app_id, &state).await?;
        if !sub.has_permission(RolePermissions::Owner) {
            return Err(ApiError::Forbidden);
        }
        let app_updates = app::Model::from(app_updates.clone());
        let mut app: app::ActiveModel = app.clone().into();
        app.status = sea_orm::ActiveValue::Set(app_updates.status);
        app.changelog = sea_orm::ActiveValue::Set(app_updates.changelog);

        if matches!(
            app_updates.visibility,
            Visibility::Offline | Visibility::Private | Visibility::Prototype
        ) {
            app.visibility = sea_orm::ActiveValue::Set(app_updates.visibility);
        }

        app.primary_category = sea_orm::ActiveValue::Set(app_updates.primary_category);
        app.secondary_category = sea_orm::ActiveValue::Set(app_updates.secondary_category);
        app.price = sea_orm::ActiveValue::Set(app_updates.price);
        app.version = sea_orm::ActiveValue::Set(app_updates.version);
        app.updated_at = sea_orm::ActiveValue::Set(now.clone());
        let app: app::Model = app.save(&state.db).await?.try_into()?;
        return Ok(Json(App::from(app)));
    }

    // Somehow the user sent an app body without an app, which is not allowed for existing apps.
    if app.is_some() {
        return Err(ApiError::Forbidden);
    }


    let app = state
        .db
        .transaction::<_, app::Model, DbErr>(|txn| {
            Box::pin(async move {
                let app = app::ActiveModel {
                    id: Set(create_id()),
                    status: Set(Status::Active),
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
                        name: Set(meta.name),
                        description: Set(Some(meta.description)),
                        long_description: Set(meta.long_description),
                        tags: Set(Some(meta.tags)),
                        lang: Set(language),
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

                let membership = membership::ActiveModel {
                    id: Set(create_id()),
                    user_id: Set(sub),
                    app_id: Set(app.id.clone()),
                    role_id: Set(owner_role.id.clone()),
                    joined_via: NotSet,
                    created_at: Set(now.clone()),
                    updated_at: Set(now.clone()),
                };
                membership.insert(txn).await?;

                Ok(app)
            })
        })
        .await?;

    Ok(Json(App::from(app)))
}
