use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};

pub struct InternalError(flow_like_types::Error);
pub struct AuthorizationError(flow_like_types::Error);
pub struct NotFoundError(flow_like_types::Error);

pub enum ApiError {
    InternalError(InternalError),
    Auth(AuthorizationError),
    NotFound,
    Forbidden,
    BadRequest(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        match self {
            ApiError::InternalError(err) => err.into_response(),
            ApiError::Auth(err) => err.into_response(),
            ApiError::NotFound => (StatusCode::NOT_FOUND, "Not Found").into_response(),
            ApiError::Forbidden => (StatusCode::FORBIDDEN, "Forbidden").into_response(),
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg).into_response(),
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
        ApiError::InternalError(InternalError(err))
    }
}

impl From<InternalError> for ApiError {
    fn from(err: InternalError) -> Self {
        ApiError::InternalError(err)
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

impl IntoResponse for InternalError {
    fn into_response(self) -> Response {
        (StatusCode::INTERNAL_SERVER_ERROR,).into_response()
    }
}

impl<E> From<E> for InternalError
where
    E: Into<flow_like_types::Error>,
{
    fn from(err: E) -> Self {
        let err = err.into();
        tracing::error!("Internal error: {:?}", err);
        InternalError(err)
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
