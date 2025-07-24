use flow_like_types::anyhow;

use crate::state::AppState;

pub struct CognitoUserManagement {
    client: aws_sdk_cognitoidentityprovider::Client,
    pool_id: String,
}

impl CognitoUserManagement {
    pub async fn new(state: &AppState) -> flow_like_types::Result<Self> {
        let config = state.aws_client.clone();
        let client = aws_sdk_cognitoidentityprovider::Client::new(&config);
        let pool_id = state
            .platform_config
            .authentication
            .as_ref()
            .ok_or(anyhow!("Missing authentication config"))?
            .openid
            .as_ref()
            .ok_or(anyhow!("Missing OpenID config"))?
            .cognito
            .as_ref()
            .ok_or(anyhow!("Missing Cognito config"))?
            .user_pool_id
            .clone();
        Ok(CognitoUserManagement { client, pool_id })
    }

    pub async fn get_attribute(
        &self,
        _sub: &str,
        username: &Option<String>,
        attribute: &str,
    ) -> flow_like_types::Result<Option<String>> {
        let username = match username {
            Some(name) => name.clone(),
            None => return Ok(None),
        };

        let user = self
            .client
            .admin_get_user()
            .user_pool_id(self.pool_id.clone())
            .username(username)
            .send()
            .await?;

        if let Some(attributes) = user.user_attributes {
            for attr in attributes {
                if attr.name == attribute {
                    return Ok(attr.value);
                }
            }
        }

        Ok(None)
    }
}
