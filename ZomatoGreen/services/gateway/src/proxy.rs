use std::sync::Arc;

use axum::{
    body::Body,
    extract::{Request, State},
    http::{HeaderName, HeaderValue, Response, StatusCode},
    response::IntoResponse,
    Extension,
};

use crate::{domain::Claims, errors::AppError, state::AppState};

/// Forward an incoming axum Request to `upstream_base`, prepending any path
/// prefix already consumed by the router's wildcard segment.
///
/// Adds `X-User-ID` and `X-User-Role` headers from the JWT Claims inserted by
/// the auth middleware.
pub async fn proxy_to(
    state: Arc<AppState>,
    claims: Option<Claims>,
    req: Request,
    upstream_base: &str,
) -> Result<Response<Body>, AppError> {
    // --- Build upstream URL ---------------------------------------------------
    let path_and_query = req
        .uri()
        .path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or("/");

    let upstream_url = format!("{}{}", upstream_base.trim_end_matches('/'), path_and_query);

    // --- Extract incoming parts -----------------------------------------------
    let method = req.method().clone();
    let incoming_headers = req.headers().clone();

    let body_bytes = axum::body::to_bytes(req.into_body(), 10 * 1024 * 1024)
        .await
        .map_err(|e| AppError::Proxy(format!("failed to read request body: {e}")))?;

    // --- Build reqwest request ------------------------------------------------
    let mut rb = state.client.request(
        reqwest::Method::from_bytes(method.as_str().as_bytes())
            .unwrap_or(reqwest::Method::GET),
        &upstream_url,
    );

    // Forward most headers from the original request.
    for (key, value) in incoming_headers.iter() {
        let name = key.as_str();
        // Skip hop-by-hop headers.
        if matches!(
            name,
            "connection" | "keep-alive" | "proxy-authenticate"
                | "proxy-authorization" | "te" | "trailers"
                | "transfer-encoding" | "upgrade" | "host"
        ) {
            continue;
        }
        rb = rb.header(key.as_str(), value.as_bytes());
    }

    // Inject identity headers from JWT claims.
    if let Some(c) = &claims {
        rb = rb
            .header("X-User-ID", &c.sub)
            .header("X-User-Role", &c.role);
    }

    rb = rb.body(body_bytes);

    // --- Send to upstream -----------------------------------------------------
    let upstream_resp = rb.send().await?;

    // --- Convert to axum Response --------------------------------------------
    let status = StatusCode::from_u16(upstream_resp.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);

    let resp_headers = upstream_resp.headers().clone();
    let resp_body = upstream_resp.bytes().await?;

    let mut response = Response::builder().status(status);

    for (key, value) in resp_headers.iter() {
        let name = key.as_str();
        if matches!(name, "transfer-encoding" | "connection") {
            continue;
        }
        if let (Ok(hname), Ok(hvalue)) = (
            HeaderName::from_bytes(key.as_str().as_bytes()),
            HeaderValue::from_bytes(value.as_bytes()),
        ) {
            response = response.header(hname, hvalue);
        }
    }

    let response = response
        .body(Body::from(resp_body))
        .map_err(|e| AppError::Proxy(format!("failed to build proxy response: {e}")))?;

    Ok(response)
}

// ---------------------------------------------------------------------------
// Per-upstream handler factories
// ---------------------------------------------------------------------------
//
// Each function returns an axum handler closure that captures the target
// upstream base URL string.  The handlers are wired into the router in
// main.rs.
// ---------------------------------------------------------------------------

/// Handler for the Management service.
pub async fn management_handler(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    req: Request,
) -> impl IntoResponse {
    let upstream = state.management_url.clone();
    match proxy_to(state, Some(claims), req, &upstream).await {
        Ok(r) => r.into_response(),
        Err(e) => e.into_response(),
    }
}

