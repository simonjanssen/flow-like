//! `SeaORM` Entity, @generated by sea-orm-codegen 1.1.11

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "Template")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
    pub id: String,
    #[sea_orm(column_name = "createdAt")]
    pub created_at: DateTime,
    #[sea_orm(column_name = "updatedAt")]
    pub updated_at: DateTime,
    #[sea_orm(column_name = "appId", column_type = "Text")]
    pub app_id: String,
    #[sea_orm(column_type = "Text", nullable)]
    pub changelog: Option<String>,
    #[sea_orm(column_name = "ratingCount")]
    pub rating_count: i32,
    #[sea_orm(column_name = "ratingSum")]
    pub rating_sum: i32,
    #[sea_orm(column_type = "Text", nullable)]
    pub version: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::app::Entity",
        from = "Column::AppId",
        to = "super::app::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    App,
    #[sea_orm(has_many = "super::comment::Entity")]
    Comment,
    #[sea_orm(has_many = "super::feedback::Entity")]
    Feedback,
    #[sea_orm(has_many = "super::meta::Entity")]
    Meta,
}

impl Related<super::app::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::App.def()
    }
}

impl Related<super::comment::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Comment.def()
    }
}

impl Related<super::feedback::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Feedback.def()
    }
}

impl Related<super::meta::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Meta.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
