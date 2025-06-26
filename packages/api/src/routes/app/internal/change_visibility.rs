use crate::{
    ensure_permission,
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
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
};
use flow_like::{
    app::{App, AppVisibility},
    bit::Metadata,
};
use flow_like_types::create_id;
use sea_orm::{
    ActiveModelTrait,
    ActiveValue::{NotSet, Set},
    ColumnTrait, DbErr, EntityTrait, IntoActiveModel, QueryFilter, TransactionTrait,
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct UpdateVisibilityBody {
    pub visibility: Visibility,
}

/// The following visibility changes are allowed:
/// - From Private to Prototype (no restrictions)
/// - From Public to Public Request Join (no restrictions)
/// - From Public Request Join to Public (no restrictions)
/// - From Prototype to Private (all users except the owner are removed)
/// - From Prototype to Public (goes to review)
/// - From Prototype to Public Request Join (goes to review)
/// - From Public to Private or Prototype (requires review -> might be a paid app for example)
/// - From Public Request Join to Private or Prototype (requires review -> might be a paid app for example)
#[tracing::instrument(name = "PATCH /apps/{app_id}/visibility", skip(state, user, body))]
pub async fn change_visibility(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
    Json(body): Json<UpdateVisibilityBody>,
) -> Result<Json<()>, ApiError> {
    let app_permission = ensure_permission!(user, &app_id, &state, RolePermissions::Owner);
    let sub = user.sub()?;

    let txn = state.db.begin().await?;

    let app = app::Entity::find()
        .filter(app::Column::Id.eq(&app_id))
        .one(&txn)
        .await?
        .ok_or_else(|| ApiError::NotFound)?;

    if app.visibility == body.visibility {
        tracing::warn!(
            "App {} already has visibility set to {:?}",
            app_id,
            body.visibility
        );
        return Ok(Json(()));
    }

    // The user should be able to switch between Prototype and Private visibility without restrictions
    if matches!(app.visibility, Visibility::Private | Visibility::Prototype) && matches!(body.visibility, Visibility::Private | Visibility::Prototype) {
        let mut app = app.into_active_model();
        app.visibility = Set(Visibility::Prototype);
        app.updated_at = Set(chrono::Utc::now().naive_utc());
        app.update(&txn).await?;

        // If the visibility is changed to Private, remove all other users
        if body.visibility == Visibility::Private {
            membership::Entity::delete_many()
                .filter(membership::Column::AppId.eq(&app_id))
                .filter(membership::Column::UserId.ne(sub.clone()))
                .exec(&txn)
                .await?;
        }

        txn.commit().await?;
        return Ok(Json(()));
    }



    if

    let tier = user.tier(&state).await?;

    if app.visibility == body.visibility {
        tracing::warn!(
            "App {} already has visibility set to {:?}",
            app_id,
            body.visibility
        );
        return Ok(Json(()));
    }

    Ok(Json(()))
}
