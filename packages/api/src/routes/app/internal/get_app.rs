use crate::{
    ensure_in_project, ensure_permission,
    entity::{app, membership, meta},
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
use sea_orm::{
    ColumnTrait, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect, RelationTrait,
};
#[tracing::instrument(name = "GET /apps/{app_id}", skip(state, user))]
pub async fn get_app(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Path(app_id): Path<String>,
) -> Result<Json<App>, ApiError> {
    ensure_in_project!(user, &app_id, &state);

    let scoped_app = state.scoped_app(&user.sub()?, &app_id, &state).await?;

    let app = app::Entity::find_by_id(&app_id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;

    let mut app: App = app.into();
    app.bits = scoped_app.bits.clone();
    app.boards = scoped_app.boards.clone();
    app.templates = scoped_app.templates.clone();
    app.events = scoped_app.events.clone();

    Ok(Json(app))
}
