pub mod repos;
pub mod sessions;

use std::sync::Arc;

use crate::db::Database;

/// Application state shared across all handlers
#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Database>,
}

impl AppState {
    pub fn new(db: Database) -> Self {
        Self { db: Arc::new(db) }
    }
}
