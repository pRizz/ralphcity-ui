//! Service management REST API endpoints
//!
//! Provides HTTP endpoints for managing the Ralphtown system service:
//! - GET /api/service/status - Get current service status
//! - POST /api/service/install - Install as system service
//! - POST /api/service/uninstall - Uninstall system service
//! - POST /api/service/start - Start the service
//! - POST /api/service/stop - Stop the service

use axum::{
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::service::{ServiceController, ServiceStatus};
use crate::{AppError, AppResult};

/// Response for service status
#[derive(Serialize, Deserialize)]
pub struct ServiceStatusResponse {
    pub status: String,
    pub installed: bool,
    pub running: bool,
    pub label: String,
}

/// Response for service operations
#[derive(Serialize, Deserialize)]
pub struct ServiceOperationResponse {
    pub success: bool,
    pub message: String,
}

/// Get the current service status
async fn get_status() -> AppResult<Json<ServiceStatusResponse>> {
    let controller = ServiceController::new();
    let status = controller.status();

    let (installed, running) = match status {
        ServiceStatus::Running => (true, true),
        ServiceStatus::Stopped => (true, false),
        ServiceStatus::NotInstalled => (false, false),
        ServiceStatus::Unknown => (false, false),
    };

    Ok(Json(ServiceStatusResponse {
        status: status.to_string(),
        installed,
        running,
        label: controller.label().to_string(),
    }))
}

/// Install Ralphtown as a system service
async fn install_service() -> AppResult<Json<ServiceOperationResponse>> {
    let controller = ServiceController::new();

    match controller.install() {
        Ok(()) => Ok(Json(ServiceOperationResponse {
            success: true,
            message: "Service installed successfully. It will start automatically on login."
                .to_string(),
        })),
        Err(e) => Err(AppError::Internal(format!("Failed to install service: {}", e))),
    }
}

/// Uninstall the Ralphtown system service
async fn uninstall_service() -> AppResult<Json<ServiceOperationResponse>> {
    let controller = ServiceController::new();

    match controller.uninstall() {
        Ok(()) => Ok(Json(ServiceOperationResponse {
            success: true,
            message: "Service uninstalled successfully.".to_string(),
        })),
        Err(e) => Err(AppError::Internal(format!(
            "Failed to uninstall service: {}",
            e
        ))),
    }
}

/// Start the Ralphtown service
async fn start_service() -> AppResult<Json<ServiceOperationResponse>> {
    let controller = ServiceController::new();

    match controller.start() {
        Ok(()) => Ok(Json(ServiceOperationResponse {
            success: true,
            message: "Service started successfully.".to_string(),
        })),
        Err(e) => Err(AppError::Internal(format!("Failed to start service: {}", e))),
    }
}

/// Stop the Ralphtown service
async fn stop_service() -> AppResult<Json<ServiceOperationResponse>> {
    let controller = ServiceController::new();

    match controller.stop() {
        Ok(()) => Ok(Json(ServiceOperationResponse {
            success: true,
            message: "Service stopped successfully.".to_string(),
        })),
        Err(e) => Err(AppError::Internal(format!("Failed to stop service: {}", e))),
    }
}

/// Create the service router
pub fn router() -> Router<super::AppState> {
    Router::new()
        .route("/service/status", get(get_status))
        .route("/service/install", post(install_service))
        .route("/service/uninstall", post(uninstall_service))
        .route("/service/start", post(start_service))
        .route("/service/stop", post(stop_service))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::create_test_app;
    use axum_test::TestServer;

    #[tokio::test]
    async fn test_get_service_status() {
        let app = create_test_app();
        let server = TestServer::new(app).unwrap();

        let response = server.get("/api/service/status").await;

        response.assert_status_ok();
        let body: ServiceStatusResponse = response.json();
        // Status should be one of the valid values
        assert!(["running", "stopped", "not_installed", "unknown"].contains(&body.status.as_str()));
        assert!(!body.label.is_empty());
    }
}
