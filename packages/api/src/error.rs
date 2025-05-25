use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};

pub struct AppError(flow_like_types::Error);
pub struct AuthorizationError(flow_like_types::Error);
pub struct NotFoundError(flow_like_types::Error);

pub enum ApiError {
    App(AppError),
    Auth(AuthorizationError),
    NotFound(NotFoundError),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        match self {
            ApiError::App(err) => err.into_response(),
            ApiError::Auth(err) => err.into_response(),
            ApiError::NotFound(err) => err.into_response(),
        }
    }
}

impl<E> From<E> for ApiError
where
    E: Into<flow_like_types::Error>,
{
    fn from(err: E) -> Self {
        let err = err.into();
        tracing::error!("Internal error: {:?}", err);
        ApiError::App(AppError(err))
    }
}

impl From<AppError> for ApiError {
    fn from(err: AppError) -> Self {
        ApiError::App(err)
    }
}

impl From<NotFoundError> for ApiError {
    fn from(err: NotFoundError) -> Self {
        ApiError::NotFound(err)
    }
}

impl From<AuthorizationError> for ApiError {
    fn from(err: AuthorizationError) -> Self {
        ApiError::Auth(err)
    }
}

impl IntoResponse for AuthorizationError {
    fn into_response(self) -> Response {
        (StatusCode::UNAUTHORIZED,).into_response()
    }
}

impl IntoResponse for NotFoundError {
    fn into_response(self) -> Response {
        (StatusCode::NOT_FOUND,).into_response()
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (StatusCode::INTERNAL_SERVER_ERROR,).into_response()
    }
}

impl<E> From<E> for AppError
where
    E: Into<flow_like_types::Error>,
{
    fn from(err: E) -> Self {
        let err = err.into();
        tracing::error!("Internal error: {:?}", err);
        AppError(err)
    }
}

impl<E> From<E> for AuthorizationError
where
    E: Into<flow_like_types::Error>,
{
    fn from(err: E) -> Self {
        let err = err.into();
        tracing::error!("Authorization error: {:?}", err);
        AuthorizationError(err)
    }
}
