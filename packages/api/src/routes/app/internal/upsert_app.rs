use std::{collections::HashSet, sync::Arc, time::SystemTime};

use crate::{
    entity::{
        app, membership, meta, role,
        sea_orm_active_enums::{Status, Visibility},
    },
    error::ApiError,
    middleware::jwt::AppUser,
    permission::role_permission::RolePermissions,
    routes::LanguageParams,
    state::AppState,
};
use aws_config::default_provider::app_name;
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
};
use flow_like::{app::App, bit::Metadata, flow::variable::Variable, protobuf::metadata};
use flow_like_types::{anyhow, create_id, sync::Mutex};
use sea_orm::{
    ActiveModelTrait,
    ActiveValue::{NotSet, Set},
    ColumnTrait, DbErr, EntityTrait, IntoActiveModel, JoinType, PaginatorTrait, QueryFilter,
    QuerySelect, RelationTrait, TransactionTrait,
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct AppUpsertBody {
    pub app: Option<App>,
    pub meta: Option<Metadata>,
    pub bits: Option<Vec<String>>,
}

#[tracing::instrument(name = "PUT /apps/{app_id}", skip(state, user, app_body, query))]
pub async fn upsert_app(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
    Query(query): Query<LanguageParams>,
    Json(app_body): Json<AppUpsertBody>,
) -> Result<Json<App>, ApiError> {
    let sub = user.sub()?;
    let tier = user.tier(&state).await?;

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

        {
            let mut bucket_app = state.scoped_app(&sub.sub()?, &app_id, &state).await?;

            bucket_app.changelog = app_updates.changelog.clone();
            bucket_app.primary_category = app_updates.primary_category.clone();
            bucket_app.secondary_category = app_updates.secondary_category.clone();
            bucket_app.price = app_updates.price.clone();
            bucket_app.updated_at = SystemTime::now();
            bucket_app.bits = app_updates.bits.clone();
            bucket_app.status = app_updates.status.clone();
            bucket_app.version = app_updates.version.clone();
            bucket_app.save().await?;
        }

        let app_updates = app::Model::from(app_updates.clone());
        let mut app: app::ActiveModel = app.clone().into();
        app.status = sea_orm::ActiveValue::Set(app_updates.status);
        app.changelog = sea_orm::ActiveValue::Set(app_updates.changelog);

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

    let Some(metadata) = app_body.meta else {
        return Err(ApiError::Internal(
            anyhow!("Meta is required for new apps").into(),
        ));
    };

    if tier.max_non_visible_projects == 0 {
        return Err(ApiError::Forbidden);
    }

    if tier.max_non_visible_projects > 0 {
        let count = membership::Entity::find()
            .join(JoinType::InnerJoin, membership::Relation::App.def())
            .join(JoinType::InnerJoin, membership::Relation::Role.def())
            .filter(
                app::Column::Visibility
                    .eq(Visibility::Prototype)
                    .or(app::Column::Visibility.eq(Visibility::Private)),
            )
            // Owner Permission is 1, so we filter out roles that have Owner permission
            .filter(role::Column::Permissions.eq(1))
            .count(&state.db)
            .await?;

        if count >= tier.max_non_visible_projects as u64 {
            return Err(ApiError::Forbidden);
        }
    }

    let new_id = create_id();
    let board_id = {
        let credentials = state.scoped_credentials(&sub, &new_id).await?;
        let flow_like_state = Arc::new(Mutex::new(credentials.to_state(state.clone()).await?));
        let mut new_app = App::new(
            Some(new_id.clone()),
            metadata.clone(),
            app_body.bits.clone().unwrap_or_default(),
            flow_like_state,
        )
        .await?;
        let board = new_app.create_board(None).await?;

        if let Some(bits) = app_body.bits {
            let bits_map = bits.iter().map(|b| b.clone()).collect::<HashSet<String>>();
            let board = new_app.open_board(board.clone(), Some(false), None).await?;
            let mut variable = Variable::new(
                "Embedding Models",
                flow_like::flow::variable::VariableType::String,
                flow_like::flow::pin::ValueType::HashSet,
            );
            variable
                .set_exposed(false)
                .set_editable(false)
                .set_default_value(serde_json::json!(bits_map));
            let mut board = board.lock().await;
            board.variables.insert(variable.id.clone(), variable);
            board.save(None).await?;
        }

        new_app.save().await?;
        board.clone()
    };

    let app = state
        .db
        .transaction::<_, app::Model, DbErr>(|txn| {
            Box::pin(async move {
                let app = app::ActiveModel {
                    id: Set(new_id),
                    status: Set(Status::Active),
                    created_at: Set(now.clone()),
                    updated_at: Set(now.clone()),
                    visibility: Set(Visibility::Private),
                    ..Default::default()
                };

                let app = app.insert(txn).await?;
                let app_id = app.id.clone();

                let meta = meta::ActiveModel {
                    id: Set(create_id()),
                    app_id: Set(Some(app_id.clone())),
                    name: Set(metadata.name),
                    description: Set(Some(metadata.description)),
                    long_description: Set(metadata.long_description),
                    tags: Set(Some(metadata.tags)),
                    lang: Set(language),
                    created_at: Set(now.clone()),
                    updated_at: Set(now.clone()),
                    ..Default::default()
                };
                meta.insert(txn).await?;

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

    let mut app = App::from(app);
    app.boards = vec![board_id];

    Ok(Json(app))
}
