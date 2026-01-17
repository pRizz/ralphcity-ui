use axum::{
    body::Body,
    http::{header, Request, Response, StatusCode},
    response::IntoResponse,
};
use rust_embed::Embed;

#[derive(Embed)]
#[folder = "../frontend/dist"]
struct FrontendAssets;

/// Serve embedded frontend assets or fall back to index.html for SPA routing
pub async fn serve_frontend(req: Request<Body>) -> impl IntoResponse {
    let path = req.uri().path();

    // Remove leading slash
    let path = path.trim_start_matches('/');

    // Try to serve the exact file
    if let Some(content) = FrontendAssets::get(path) {
        let mime = mime_guess::from_path(path).first_or_octet_stream();

        // Add cache headers for static assets (CSS, JS, etc.)
        let cache_control = if path.starts_with("assets/") {
            "public, max-age=31536000, immutable"
        } else {
            "no-cache"
        };

        return Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, mime.as_ref())
            .header(header::CACHE_CONTROL, cache_control)
            .body(Body::from(content.data.into_owned()))
            .unwrap();
    }

    // For SPA: fall back to index.html for any non-asset path
    if let Some(content) = FrontendAssets::get("index.html") {
        return Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "text/html")
            .header(header::CACHE_CONTROL, "no-cache")
            .body(Body::from(content.data.into_owned()))
            .unwrap();
    }

    // No frontend assets embedded
    Response::builder()
        .status(StatusCode::NOT_FOUND)
        .body(Body::from("Frontend not found"))
        .unwrap()
}
