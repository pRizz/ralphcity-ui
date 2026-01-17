pub mod api;
pub mod db;
mod error;
pub mod git;
pub mod ralph;
pub mod service;
pub mod ws;

use axum::{routing::get, Json, Router};
use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use api::AppState;
use db::Database;
use service::ServiceController;

pub use error::{AppError, AppResult};
pub use ralph::RalphManager;
pub use service::{ServiceError, ServiceStatus};
pub use ws::ConnectionManager;

/// Ralphtown - A Ralph session manager
#[derive(Parser)]
#[command(name = "ralphtown")]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Start the Ralphtown server (default if no command given)
    Serve,

    /// Install Ralphtown as a system service
    Install,

    /// Uninstall the Ralphtown system service
    Uninstall,

    /// Start the Ralphtown service
    Start,

    /// Stop the Ralphtown service
    Stop,

    /// Show the current service status
    Status,
}

#[derive(Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
}

async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
    })
}

pub fn create_app(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/api/health", get(health_check))
        .nest("/api", api::repos::router())
        .nest("/api", api::sessions::router())
        .nest("/api", api::git::router())
        .nest("/api", api::config::router())
        .nest("/api", api::service::router())
        .nest("/api", ws::router())
        .with_state(state)
        .layer(cors)
}

/// Create app with in-memory database (for testing)
pub fn create_test_app() -> Router {
    let db = Database::in_memory().expect("Failed to create test database");
    let state = AppState::new(db);
    create_app(state)
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cli = Cli::parse();

    match cli.command.unwrap_or(Commands::Serve) {
        Commands::Serve => run_server().await,
        Commands::Install => handle_install(),
        Commands::Uninstall => handle_uninstall(),
        Commands::Start => handle_start(),
        Commands::Stop => handle_stop(),
        Commands::Status => handle_status(),
    }
}

async fn run_server() {
    // Initialize database
    let db_path = Database::default_path().expect("Failed to determine database path");
    tracing::info!("Using database at: {:?}", db_path);

    let db = Database::new(db_path).expect("Failed to initialize database");
    let state = AppState::new(db);

    let app = create_app(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();

    tracing::info!("Ralphtown server listening on http://127.0.0.1:3000");

    axum::serve(listener, app).await.unwrap();
}

fn handle_install() {
    let controller = ServiceController::new();
    match controller.install() {
        Ok(()) => {
            println!("✓ Ralphtown service installed successfully");
            println!("  Service will start automatically on login");
            println!("  Run 'ralphtown start' to start now");
        }
        Err(e) => {
            eprintln!("✗ Failed to install service: {}", e);
            std::process::exit(1);
        }
    }
}

fn handle_uninstall() {
    let controller = ServiceController::new();
    match controller.uninstall() {
        Ok(()) => {
            println!("✓ Ralphtown service uninstalled successfully");
        }
        Err(e) => {
            eprintln!("✗ Failed to uninstall service: {}", e);
            std::process::exit(1);
        }
    }
}

fn handle_start() {
    let controller = ServiceController::new();
    match controller.start() {
        Ok(()) => {
            println!("✓ Ralphtown service started");
            println!("  Server available at http://127.0.0.1:3000");
        }
        Err(e) => {
            eprintln!("✗ Failed to start service: {}", e);
            std::process::exit(1);
        }
    }
}

fn handle_stop() {
    let controller = ServiceController::new();
    match controller.stop() {
        Ok(()) => {
            println!("✓ Ralphtown service stopped");
        }
        Err(e) => {
            eprintln!("✗ Failed to stop service: {}", e);
            std::process::exit(1);
        }
    }
}

fn handle_status() {
    let controller = ServiceController::new();
    let status = controller.status();

    match status {
        ServiceStatus::Running => {
            println!("● Ralphtown service is running");
            println!("  Server available at http://127.0.0.1:3000");
        }
        ServiceStatus::Stopped => {
            println!("○ Ralphtown service is stopped");
            println!("  Run 'ralphtown start' to start the service");
        }
        ServiceStatus::NotInstalled => {
            println!("○ Ralphtown service is not installed");
            println!("  Run 'ralphtown install' to install as a service");
        }
        ServiceStatus::Unknown => {
            println!("? Ralphtown service status is unknown");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum_test::TestServer;

    #[tokio::test]
    async fn test_health_check_returns_200() {
        let app = create_test_app();
        let server = TestServer::new(app).unwrap();

        let response = server.get("/api/health").await;

        response.assert_status_ok();
        let body: HealthResponse = response.json();
        assert_eq!(body.status, "ok");
    }
}
