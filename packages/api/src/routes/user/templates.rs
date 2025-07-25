use crate::{
    entity::{membership, meta, role, template},
    error::ApiError,
    middleware::jwt::AppUser,
    permission::role_permission::{has_role_permission, RolePermissions},
    routes::LanguageParams,
    state::AppState,
};
use axum::{
    Extension, Json,
    extract::{Query, State},
};
use bitflags::Flags;
use flow_like::bit::Metadata;
use sea_orm::{
    ColumnTrait, DatabaseTransaction, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect,
    RelationTrait, TransactionTrait,
};

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
    txn.commit().await?;

    Ok(Json(templates))
}
async fn get_user_app_ids_with_template_access(
    txn: &DatabaseTransaction,
    user_id: String,
    query: &LanguageParams,
) -> Result<Vec<String>, ApiError> {
    let limit = query.limit.unwrap_or(100).min(100);

    let app_ids = membership::Entity::find()
        .select_only()
        .columns([role::Column::AppId, role::Column::Permissions])
        .join(JoinType::InnerJoin, membership::Relation::Role.def())
        .filter(membership::Column::UserId.eq(user_id))
        .order_by_desc(membership::Column::UpdatedAt)
        .limit(Some(limit))
        .offset(query.offset)
        .into_tuple::<(String, i64)>()
        .all(txn)
        .await?
        .into_iter()
        .filter_map(|(app_id, permissions)| {
            let permission = RolePermissions::from_bits(permissions)?;
            has_role_permission(&permission, RolePermissions::ReadTemplates).then_some(app_id)
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
            find_best_metadata(&metadata, language).map(|meta| {
                (
                    template.app_id.clone(),
                    template.id.clone(),
                    Metadata::from(meta.clone()),
                )
            })
        })
        .collect();

    Ok(result)
}

fn find_best_metadata<'a>(
    metadata: &'a [meta::Model],
    language: &'a str,
) -> Option<&'a meta::Model> {
    metadata
        .iter()
        .find(|meta| meta.lang == language)
        .or_else(|| metadata.iter().find(|meta| meta.lang == "en"))
        .or_else(|| metadata.first())
}
