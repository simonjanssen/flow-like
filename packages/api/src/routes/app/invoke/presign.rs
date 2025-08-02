use crate::{
    credentials::CredentialsAccess, ensure_permission, error::ApiError, middleware::jwt::AppUser,
    permission::role_permission::RolePermissions, state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
};
use flow_like::credentials::SharedCredentials;

#[tracing::instrument(name = "GET /apps/{app_id}/invoke/presign", skip(state, user))]
pub async fn presign(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
) -> Result<Json<SharedCredentials>, ApiError> {
    let permission = ensure_permission!(user, &app_id, &state, RolePermissions::ExecuteEvents);

    let sub = user.sub()?;

    let mut access = CredentialsAccess::InvokeNone;

    if permission.has_permission(RolePermissions::ReadFiles) {
        access = CredentialsAccess::InvokeRead;
    } else if permission.has_permission(RolePermissions::WriteFiles) {
        access = CredentialsAccess::InvokeWrite;
    }

    let credentials = state.scoped_credentials(&sub, &app_id, access).await?;
    let credentials = credentials.into_shared_credentials();
    Ok(Json(credentials))
}
