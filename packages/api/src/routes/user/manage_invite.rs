use std::collections::HashMap;

use crate::{
    entity::{
        app::{self, Entity},
        invitations, membership, meta,
        sea_orm_active_enums::Visibility,
        user,
    },
    error::ApiError,
    middleware::jwt::AppUser,
    routes::LanguageParams,
    state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
};
use flow_like::{app::App, bit::Metadata};
use flow_like_types::{anyhow, create_id};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, JoinType, PaginatorTrait,
    PrimaryKeyArity, QueryFilter, QueryOrder, QuerySelect, RelationTrait, TransactionTrait,
    sqlx::types::chrono,
};

#[tracing::instrument(name = "DELETE /user/invites/{invite_id}", skip(state, user))]
pub async fn decline_invite(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(invite_id): Path<String>,
) -> Result<Json<()>, ApiError> {
    let sub = user.sub()?;

    invitations::Entity::delete_many()
        .filter(invitations::Column::Id.eq(invite_id.clone()))
        .filter(invitations::Column::UserId.eq(sub))
        .exec(&state.db)
        .await?;

    Ok(Json(()))
}

#[tracing::instrument(name = "POST /user/invites/{invite_id}", skip(state, user))]
pub async fn accept_invite(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(invite_id): Path<String>,
) -> Result<Json<()>, ApiError> {
    let sub = user.sub()?;

    let max_prototype = state.platform_config.max_users_prototype.unwrap_or(-1);

    let txn = state.db.begin().await?;

    let (invite, app) = invitations::Entity::find_by_id(invite_id.clone())
        .filter(invitations::Column::UserId.eq(sub.clone()))
        .find_also_related(app::Entity)
        .one(&txn)
        .await?
        .ok_or_else(|| ApiError::NotFound)?;

    let app = app.ok_or_else(|| ApiError::NotFound)?;
    let default_role = app.default_role_id.ok_or_else(|| ApiError::NotFound)?;

    if matches!(app.visibility, Visibility::Offline | Visibility::Private) {
        tracing::warn!(
            "User {} is trying to accept an invite to app {} but the app is private or offline",
            sub,
            app.id
        );
        return Err(ApiError::Forbidden);
    }

    if max_prototype > 0 && app.visibility == Visibility::Prototype {
        let user_count = membership::Entity::find()
            .filter(membership::Column::AppId.eq(app.id.clone()))
            .count(&txn)
            .await?;

        if user_count >= max_prototype as u64 {
            tracing::warn!(
                "User {} is trying to accept an invite to app {} but the user limit has been reached",
                sub,
                app.id
            );
            return Err(ApiError::Forbidden);
        }
    }

    let membership = membership::ActiveModel {
        id: Set(create_id()),
        user_id: Set(sub),
        app_id: Set(app.id),
        role_id: Set(default_role),
        created_at: Set(chrono::Utc::now().naive_utc()),
        updated_at: Set(chrono::Utc::now().naive_utc()),
        joined_via: Set(Some("invite".to_string())),
    };

    membership.insert(&txn).await?;

    let invite: invitations::ActiveModel = invite.into();
    invite.delete(&txn).await?;

    txn.commit().await?;

    Ok(Json(()))
}
