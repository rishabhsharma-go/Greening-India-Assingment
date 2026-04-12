use crate::{
    domain::{AuthResponse, Claims, LoginInput, RegisterInput, User, UserPublic},
    errors::AppError,
};
use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use sqlx::PgPool;
use uuid::Uuid;

const TOKEN_EXPIRY_SECS: i64 = 60 * 60 * 24; // 24 hours

/// Hash a plaintext password with bcrypt cost 12.
fn hash_password(password: &str) -> Result<String, AppError> {
    let hash = bcrypt::hash(password, 12)?;
    Ok(hash)
}

/// Verify a plaintext password against a stored bcrypt hash.
fn verify_password(password: &str, hash: &str) -> Result<bool, AppError> {
    let ok = bcrypt::verify(password, hash)?;
    Ok(ok)
}

/// Create a signed JWT for the given user.
pub fn generate_token(user: &User, jwt_secret: &str) -> Result<String, AppError> {
    let expiry = (Utc::now().timestamp() + TOKEN_EXPIRY_SECS) as usize;
    let claims = Claims {
        sub: user.id.to_string(),
        email: user.email.clone(),
        role: user.role.to_string(),
        exp: expiry,
    };
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )?;
    Ok(token)
}

/// Decode and validate a JWT, returning the embedded Claims.
pub fn validate_token(token: &str, jwt_secret: &str) -> Result<Claims, AppError> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    )?;
    Ok(token_data.claims)
}

/// Register a new user and return an AuthResponse (token + public user).
pub async fn register(pool: &PgPool, jwt_secret: &str, input: RegisterInput) -> Result<AuthResponse, AppError> {
    let password_hash = hash_password(&input.password)?;
    let id = Uuid::new_v4();

    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES ($1, $2, $3, $4, 'field_worker')
        RETURNING id, name, email, password_hash, role, created_at
        "#,
    )
    .bind(id)
    .bind(&input.name)
    .bind(&input.email)
    .bind(&password_hash)
    .fetch_one(pool)
    .await?;

    seed_user_project(pool, &user).await;

    let token = generate_token(&user, jwt_secret)?;
    Ok(AuthResponse {
        token,
        user: UserPublic::from(user),
    })
}

/// Create a starter project + 3 tasks for a newly registered user.
/// Failures are logged but do not block registration.
async fn seed_user_project(pool: &PgPool, user: &User) {
    let project_id = Uuid::new_v4();
    let insert_project = sqlx::query(
        "INSERT INTO projects (id, name, description, owner_id) \
         VALUES ($1, $2, $3, $4)",
    )
    .bind(project_id)
    .bind("My First Project")
    .bind("A starter project — edit or delete it any time")
    .bind(user.id)
    .execute(pool)
    .await;

    if let Err(e) = insert_project {
        tracing::warn!(user_id = %user.id, error = %e, "failed to seed starter project");
        return;
    }

    let tasks = [
        (Uuid::new_v4(), "Plan the project scope", "todo",        "high"),
        (Uuid::new_v4(), "Set up the workspace",   "in_progress", "medium"),
        (Uuid::new_v4(), "Review onboarding docs", "done",        "low"),
    ];

    for (task_id, title, status, priority) in tasks {
        let res = sqlx::query(
            "INSERT INTO tasks (id, title, status, priority, project_id, assignee_id, creator_id) \
             VALUES ($1, $2, $3::task_status, $4::task_priority, $5, $6, $7)",
        )
        .bind(task_id)
        .bind(title)
        .bind(status)
        .bind(priority)
        .bind(project_id)
        .bind(user.id)
        .bind(user.id)
        .execute(pool)
        .await;

        if let Err(e) = res {
            tracing::warn!(user_id = %user.id, task = title, error = %e, "failed to seed starter task");
        }
    }

    tracing::info!(user_id = %user.id, "seeded starter project for new user");
}

/// Authenticate a user by email/password and return an AuthResponse.
pub async fn login(pool: &PgPool, jwt_secret: &str, input: LoginInput) -> Result<AuthResponse, AppError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = $1",
    )
    .bind(&input.email)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::Unauthorized("invalid email or password".to_string()))?;

    let valid = verify_password(&input.password, &user.password_hash)?;
    if !valid {
        return Err(AppError::Unauthorized("invalid email or password".to_string()));
    }

    let token = generate_token(&user, jwt_secret)?;
    Ok(AuthResponse {
        token,
        user: UserPublic::from(user),
    })
}

/// Fetch a user by their UUID.
pub async fn get_user(pool: &PgPool, user_id: Uuid) -> Result<User, AppError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, name, email, password_hash, role, created_at FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("user {} not found", user_id)))?;
    Ok(user)
}

/// Insert test@example.com / password123 if it does not already exist.
pub async fn seed_test_user(pool: &PgPool, _jwt_secret: &str) -> Result<(), AppError> {
    let existing: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM users WHERE email = $1")
        .bind("test@example.com")
        .fetch_optional(pool)
        .await?;

    if existing.is_some() {
        tracing::info!("test user already exists, skipping seed");
        return Ok(());
    }

    let password_hash = hash_password("password123")?;
    let id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES ($1, $2, $3, $4, 'admin')
        "#,
    )
    .bind(id)
    .bind("Test User")
    .bind("test@example.com")
    .bind(&password_hash)
    .execute(pool)
    .await?;

    tracing::info!("seeded test user: test@example.com / password123");
    Ok(())
}
