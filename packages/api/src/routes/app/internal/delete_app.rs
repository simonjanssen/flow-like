use crate::{
    ensure_permission, entity::app, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use sea_orm::ModelTrait;

#[tracing::instrument(name = "DELETE /apps/{app_id}", skip(state, user))]
pub async fn delete_app(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
) -> Result<Json<()>, ApiError> {
    let sub = ensure_permission!(user, &app_id, &state, RolePermissions::Owner);

    let app = sub
        .role
        .find_related(app::Entity)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;

    app.delete(&state.db).await?;

    Ok(Json(()))
}
