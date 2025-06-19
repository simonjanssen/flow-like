use std::time::SystemTime;

use crate::{entity::app, state::AppState};
use axum::{
    Router,
    routing::{get, put},
};

pub mod board;
pub mod delete_app;
pub mod get_apps;
pub mod get_nodes;
pub mod meta;
pub mod search_apps;
pub mod template;
pub mod upsert_app;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(get_apps::get_apps).post(search_apps::search_apps))
        .route("/nodes", get(get_nodes::get_nodes))
        .route(
            "/{app_id}",
            put(upsert_app::upsert_app).delete(delete_app::delete_app),
        )
        .nest("/{app_id}/template", template::routes())
        .nest("/{app_id}/board", board::routes())
}

#[macro_export]
macro_rules! ensure_permission {
    ($user:expr, $app_id:expr, $state:expr, $perm:expr) => {{
        let sub = $user.app_permission($app_id, $state).await?;
        if !sub.has_permission($perm) {
            return Err(crate::error::ApiError::Forbidden);
        }
        sub
    }};
}

#[macro_export]
macro_rules! ensure_permissions {
    ($user:expr, $app_id:expr, $state:expr, $perms:expr) => {{
        let sub = $user.app_permission($app_id, $state).await?;
        for perm in $perms.iter() {
            if !sub.has_permission(perm) {
                return Err(crate::error::ApiError::Forbidden);
            }
        }
        sub
    }};
}

impl From<crate::entity::sea_orm_active_enums::Category> for flow_like::app::AppCategory {
    fn from(cat: crate::entity::sea_orm_active_enums::Category) -> Self {
        match cat {
            crate::entity::sea_orm_active_enums::Category::Other => {
                flow_like::app::AppCategory::Other
            }
            crate::entity::sea_orm_active_enums::Category::Productivity => {
                flow_like::app::AppCategory::Productivity
            }
            crate::entity::sea_orm_active_enums::Category::Social => {
                flow_like::app::AppCategory::Social
            }
            crate::entity::sea_orm_active_enums::Category::Entertainment => {
                flow_like::app::AppCategory::Entertainment
            }
            crate::entity::sea_orm_active_enums::Category::Education => {
                flow_like::app::AppCategory::Education
            }
            crate::entity::sea_orm_active_enums::Category::Health => {
                flow_like::app::AppCategory::Health
            }
            crate::entity::sea_orm_active_enums::Category::Finance => {
                flow_like::app::AppCategory::Finance
            }
            crate::entity::sea_orm_active_enums::Category::Lifestyle => {
                flow_like::app::AppCategory::Lifestyle
            }
            crate::entity::sea_orm_active_enums::Category::Travel => {
                flow_like::app::AppCategory::Travel
            }
            crate::entity::sea_orm_active_enums::Category::News => {
                flow_like::app::AppCategory::News
            }
            crate::entity::sea_orm_active_enums::Category::Sports => {
                flow_like::app::AppCategory::Sports
            }
            crate::entity::sea_orm_active_enums::Category::Shopping => {
                flow_like::app::AppCategory::Shopping
            }
            crate::entity::sea_orm_active_enums::Category::FoodAndDrink => {
                flow_like::app::AppCategory::FoodAndDrink
            }
            crate::entity::sea_orm_active_enums::Category::Music => {
                flow_like::app::AppCategory::Music
            }
            crate::entity::sea_orm_active_enums::Category::Photography => {
                flow_like::app::AppCategory::Photography
            }
            crate::entity::sea_orm_active_enums::Category::Utilities => {
                flow_like::app::AppCategory::Utilities
            }
            crate::entity::sea_orm_active_enums::Category::Weather => {
                flow_like::app::AppCategory::Weather
            }
            crate::entity::sea_orm_active_enums::Category::Games => {
                flow_like::app::AppCategory::Games
            }
            crate::entity::sea_orm_active_enums::Category::Business => {
                flow_like::app::AppCategory::Business
            }
            crate::entity::sea_orm_active_enums::Category::Communication => {
                flow_like::app::AppCategory::Communication
            }
            crate::entity::sea_orm_active_enums::Category::Anime => {
                flow_like::app::AppCategory::Anime
            }
        }
    }
}

impl From<flow_like::app::AppCategory> for crate::entity::sea_orm_active_enums::Category {
    fn from(cat: flow_like::app::AppCategory) -> Self {
        match cat {
            flow_like::app::AppCategory::Other => {
                crate::entity::sea_orm_active_enums::Category::Other
            }
            flow_like::app::AppCategory::Productivity => {
                crate::entity::sea_orm_active_enums::Category::Productivity
            }
            flow_like::app::AppCategory::Social => {
                crate::entity::sea_orm_active_enums::Category::Social
            }
            flow_like::app::AppCategory::Entertainment => {
                crate::entity::sea_orm_active_enums::Category::Entertainment
            }
            flow_like::app::AppCategory::Education => {
                crate::entity::sea_orm_active_enums::Category::Education
            }
            flow_like::app::AppCategory::Health => {
                crate::entity::sea_orm_active_enums::Category::Health
            }
            flow_like::app::AppCategory::Finance => {
                crate::entity::sea_orm_active_enums::Category::Finance
            }
            flow_like::app::AppCategory::Lifestyle => {
                crate::entity::sea_orm_active_enums::Category::Lifestyle
            }
            flow_like::app::AppCategory::Travel => {
                crate::entity::sea_orm_active_enums::Category::Travel
            }
            flow_like::app::AppCategory::News => {
                crate::entity::sea_orm_active_enums::Category::News
            }
            flow_like::app::AppCategory::Sports => {
                crate::entity::sea_orm_active_enums::Category::Sports
            }
            flow_like::app::AppCategory::Shopping => {
                crate::entity::sea_orm_active_enums::Category::Shopping
            }
            flow_like::app::AppCategory::FoodAndDrink => {
                crate::entity::sea_orm_active_enums::Category::FoodAndDrink
            }
            flow_like::app::AppCategory::Music => {
                crate::entity::sea_orm_active_enums::Category::Music
            }
            flow_like::app::AppCategory::Photography => {
                crate::entity::sea_orm_active_enums::Category::Photography
            }
            flow_like::app::AppCategory::Utilities => {
                crate::entity::sea_orm_active_enums::Category::Utilities
            }
            flow_like::app::AppCategory::Weather => {
                crate::entity::sea_orm_active_enums::Category::Weather
            }
            flow_like::app::AppCategory::Games => {
                crate::entity::sea_orm_active_enums::Category::Games
            }
            flow_like::app::AppCategory::Business => {
                crate::entity::sea_orm_active_enums::Category::Business
            }
            flow_like::app::AppCategory::Communication => {
                crate::entity::sea_orm_active_enums::Category::Communication
            }
            flow_like::app::AppCategory::Anime => {
                crate::entity::sea_orm_active_enums::Category::Anime
            }
        }
    }
}

impl From<app::Model> for flow_like::app::App {
    fn from(model: app::Model) -> Self {
        Self {
            id: model.id,
            price: Some(model.price as u32),
            status: match model.status {
                crate::entity::sea_orm_active_enums::Status::Active => {
                    flow_like::app::AppStatus::Active
                }
                crate::entity::sea_orm_active_enums::Status::Inactive => {
                    flow_like::app::AppStatus::Inactive
                }
                crate::entity::sea_orm_active_enums::Status::Archived => {
                    flow_like::app::AppStatus::Archived
                }
            },
            visibility: match model.visibility {
                crate::entity::sea_orm_active_enums::Visibility::Public => {
                    flow_like::app::AppVisibility::Public
                }
                crate::entity::sea_orm_active_enums::Visibility::PublicRequestAccess => {
                    flow_like::app::AppVisibility::PublicRequestAccess
                }
                crate::entity::sea_orm_active_enums::Visibility::Private => {
                    flow_like::app::AppVisibility::Private
                }
                crate::entity::sea_orm_active_enums::Visibility::Prototype => {
                    flow_like::app::AppVisibility::Prototype
                }
                crate::entity::sea_orm_active_enums::Visibility::Offline => {
                    flow_like::app::AppVisibility::Offline
                }
            },
            authors: vec![],
            bits: vec![],
            boards: vec![],
            events: vec![],
            templates: vec![],
            changelog: model.changelog,
            avg_rating: model.avg_rating,
            download_count: model.download_count as u64,
            interactions_count: model.interactions_count as u64,
            rating_count: model.rating_count as u64,
            rating_sum: model.rating_sum as u64,
            relevance_score: model.relevance_score,
            primary_category: model.primary_category.map(|cat| cat.into()),
            secondary_category: model.secondary_category.map(|cat| cat.into()),
            updated_at: SystemTime::UNIX_EPOCH
                + std::time::Duration::from_secs(model.updated_at.and_utc().timestamp() as u64),
            created_at: SystemTime::UNIX_EPOCH
                + std::time::Duration::from_secs(model.created_at.and_utc().timestamp() as u64),
            version: model.version,
            frontend: None,
            app_state: None,
        }
    }
}

impl From<flow_like::app::App> for app::Model {
    fn from(app: flow_like::app::App) -> Self {
        Self {
            id: app.id,
            status: match app.status {
                flow_like::app::AppStatus::Active => {
                    crate::entity::sea_orm_active_enums::Status::Active
                }
                flow_like::app::AppStatus::Inactive => {
                    crate::entity::sea_orm_active_enums::Status::Inactive
                }
                flow_like::app::AppStatus::Archived => {
                    crate::entity::sea_orm_active_enums::Status::Archived
                }
            },
            visibility: match app.visibility {
                flow_like::app::AppVisibility::Public => {
                    crate::entity::sea_orm_active_enums::Visibility::Public
                }
                flow_like::app::AppVisibility::PublicRequestAccess => {
                    crate::entity::sea_orm_active_enums::Visibility::PublicRequestAccess
                }
                flow_like::app::AppVisibility::Private => {
                    crate::entity::sea_orm_active_enums::Visibility::Private
                }
                flow_like::app::AppVisibility::Prototype => {
                    crate::entity::sea_orm_active_enums::Visibility::Prototype
                }
                flow_like::app::AppVisibility::Offline => {
                    crate::entity::sea_orm_active_enums::Visibility::Offline
                }
            },
            changelog: app.changelog,
            default_role_id: None,
            owner_role_id: None,
            price: 0,
            avg_rating: app.avg_rating,
            download_count: app.download_count as i64,
            interactions_count: app.interactions_count as i64,
            relevance_score: app.relevance_score,
            total_size: 0,
            rating_count: app.rating_count as i64,
            rating_sum: app.rating_sum as i64,
            version: app.version,
            updated_at: chrono::Utc::now().naive_utc(),
            created_at: chrono::Utc::now().naive_utc(),
            primary_category: app.primary_category.map(|cat| cat.into()),
            secondary_category: app.secondary_category.map(|cat| cat.into()),
        }
    }
}
