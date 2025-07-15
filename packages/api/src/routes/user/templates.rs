use crate::{
    ensure_permission,
    entity::{self, app, membership, meta, role, template},
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
use flow_like::bit::Metadata;
use sea_orm::{ColumnTrait, DatabaseTransaction, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect, RelationTrait, TransactionTrait};

#[tracing::instrument(name = "GET /user/templates", skip(state, user))]
pub async fn get_templates(
    State(state): State<AppState>,
    Extension(user): Extension<AppUser>,
    Query(query): Query<LanguageParams>,
) -> Result<Json<Vec<(String, String, Metadata)>>, ApiError> {
    let language = query.language.as_deref().unwrap_or("en");
    let user_id = user.sub()?;

    let txn = state.db.begin().await?;
    let app_ids = get_user_app_ids_with_template_access(&txn, user_id, &query).await?;
    let templates = get_templates_with_metadata(&txn, &app_ids, language).await?;

    Ok(Json(templates))
}

async fn get_user_app_ids_with_template_access(
    txn: &DatabaseTransaction,
    user_id: String,
    query: &LanguageParams,
) -> Result<Vec<String>, ApiError> {
    let limit = query.limit.unwrap_or(100).max(100);

    let roles = role::Entity::find()
        .order_by_desc(membership::Column::UpdatedAt)
        .join(JoinType::InnerJoin, role::Relation::Membership.def())
        .filter(membership::Column::UserId.eq(user_id))
        .filter(role::Column::AppId.is_not_null())
        .limit(Some(limit))
        .offset(query.offset)
        .all(txn)
        .await?;

    let app_ids = roles
        .into_iter()
        .filter_map(|role| {
            let permission = RolePermissions::from_bits(role.permissions)?;
            if permission.contains(RolePermissions::ReadTemplates) {
                role.app_id
            } else {
                None
            }
        })
        .collect();

    Ok(app_ids)
}

async fn get_templates_with_metadata(
    txn: &DatabaseTransaction,
    app_ids: &[String],
    language: &str,
) -> Result<Vec<(String, String, Metadata)>, ApiError> {
    let templates = template::Entity::find()
        .find_with_related(meta::Entity)
        .filter(template::Column::AppId.is_in(app_ids))
        .filter(
            meta::Column::Lang
                .eq(language)
                .or(meta::Column::Lang.eq("en")),
        )
        .all(txn)
        .await?;

    let result = templates
        .into_iter()
        .filter_map(|(template, metadata)| {
            find_best_metadata(&metadata, language)
                .map(|meta| (template.app_id.clone(), template.id.clone(), Metadata::from(meta.clone())))
        })
        .collect();

    Ok(result)
}

fn find_best_metadata<'a>(metadata: &'a [meta::Model], language: &'a str) -> Option<&'a meta::Model> {
    metadata
        .iter()
        .find(|meta| meta.lang == language)
        .or_else(|| metadata.iter().find(|meta| meta.lang == "en"))
}