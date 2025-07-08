use crate::{
    ensure_permission, entity::invite_link, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

#[tracing::instrument(name = "DELETE /apps/{app_id}/team/link/{link_id}", skip(state, user))]
pub async fn remove_invite_link(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path((app_id, link_id)): Path<(String, String)>,
) -> Result<Json<()>, ApiError> {
    ensure_permission!(user, &app_id, &state, RolePermissions::Admin);

    invite_link::Entity::delete_many()
        .filter(
            invite_link::Column::AppId
                .eq(app_id.clone())
                .and(invite_link::Column::Id.eq(link_id.clone())),
        )
        .exec(&state.db)
        .await?;

    Ok(Json(()))
}
