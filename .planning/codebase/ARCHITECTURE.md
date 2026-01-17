# Architecture

**Analysis Date:** 2026-01-17

## Pattern Overview

**Overall:** Client-Server Monorepo with Embedded Frontend

**Key Characteristics:**
- Rust backend (Axum) serves REST API + WebSocket + embedded SPA frontend
- React/TypeScript frontend with React Query for server state
- SQLite database for persistence (single file, embedded)
- Single binary distribution with frontend assets compiled in
- Process management for spawning external CLI tools (ralph)

## Layers

**Frontend Presentation (React Components):**
- Purpose: Render UI and handle user interactions
- Location: `frontend/src/components/`
- Contains: React components, shadcn/ui primitives, feature components
- Depends on: Hooks, API client, Types
- Used by: Pages

**Frontend Pages:**
- Purpose: Top-level route components that compose features
- Location: `frontend/src/pages/`
- Contains: Route-level components (`Index.tsx`, `NotFound.tsx`)
- Depends on: Components, Hooks, API hooks
- Used by: App router (`frontend/src/App.tsx`)

**Frontend API Layer:**
- Purpose: HTTP/WebSocket communication with backend
- Location: `frontend/src/api/`
- Contains: API client (`client.ts`), React Query hooks (`hooks.ts`), TypeScript types (`types.ts`)
- Depends on: React Query, Fetch API
- Used by: Pages, Components via hooks

**Frontend State/Hooks:**
- Purpose: Shared stateful logic and WebSocket management
- Location: `frontend/src/hooks/`
- Contains: Custom hooks (`useWebSocket.ts`, `use-toast.ts`)
- Depends on: React, API types
- Used by: Pages, Components

**Backend API Layer (Axum Handlers):**
- Purpose: HTTP/WebSocket request handling and routing
- Location: `backend/src/api/`
- Contains: Route handlers (`repos.rs`, `sessions.rs`, `git.rs`, `config.rs`, `service.rs`), shared state (`mod.rs`)
- Depends on: Database, Ralph Manager, WebSocket Manager
- Used by: Main router

**Backend WebSocket Layer:**
- Purpose: Real-time bidirectional communication
- Location: `backend/src/ws/`
- Contains: Connection management (`connections.rs`), message types (`messages.rs`), handler (`mod.rs`)
- Depends on: Tokio channels, AppState
- Used by: API layer, Ralph Manager

**Backend Process Manager (Ralph):**
- Purpose: Spawn and manage external `ralph` CLI processes
- Location: `backend/src/ralph/`
- Contains: Process lifecycle management, stdout/stderr streaming
- Depends on: Database, WebSocket Manager
- Used by: Session API endpoints

**Backend Database Layer:**
- Purpose: SQLite persistence for repos, sessions, messages, config
- Location: `backend/src/db/`
- Contains: Schema definitions (`schema.rs`), models (`models.rs`), CRUD operations (`mod.rs`)
- Depends on: rusqlite
- Used by: All API handlers

**Backend Service Layer:**
- Purpose: System service installation/management (launchd, systemd, Windows Service)
- Location: `backend/src/service/`
- Contains: Cross-platform service management
- Depends on: service-manager crate
- Used by: CLI commands

## Data Flow

**Start Session Flow:**

1. User enters prompt in `PromptInput` component
2. `MainPanel.handleStartSession` calls `createSession.mutateAsync` then `runSession.mutateAsync`
3. Frontend `POST /api/sessions` creates session record
4. Frontend `POST /api/sessions/{id}/run` starts ralph process
5. Backend `RalphManager.run()` spawns `ralph run --autonomous --prompt "<prompt>"`
6. Ralph process stdout/stderr captured via async readers
7. Output broadcast to WebSocket subscribers via `ConnectionManager.broadcast()`
8. Frontend `useWebSocket` receives output, updates `outputLines` state
9. `ConversationView` renders streaming output

**WebSocket Subscription Flow:**

1. Frontend `useWebSocket` hook connects to `ws://localhost:3000/api/ws`
2. On mount, sends `{ type: "subscribe", session_id: "<uuid>" }`
3. Backend `handle_socket` creates subscription via `ConnectionManager.subscribe()`
4. Backend spawns task to forward broadcast messages to this WebSocket
5. `ServerMessage::Output` events streamed as ralph produces output
6. Frontend parses messages, calls `onOutput` callback
7. On unmount, sends `{ type: "unsubscribe", session_id: "<uuid>" }`

**State Management:**
- Server state: React Query caches API responses, auto-invalidates on mutations
- Client state: React `useState` for UI state (selected repo, active session)
- Real-time state: WebSocket output stored in `Map<sessionId, OutputLine[]>`
- Persistence: SQLite database for repos, sessions, messages, config, output logs

## Key Abstractions

**AppState (Backend):**
- Purpose: Shared application state across all handlers
- Examples: `backend/src/api/mod.rs`
- Pattern: Arc-wrapped structs passed via Axum state extraction
- Contains: `Arc<Database>`, `ConnectionManager`, `RalphManager`

**RalphtownInstance (Frontend):**
- Purpose: UI representation of a session with its repo context
- Examples: `frontend/src/types/ralphtown.ts`
- Pattern: Adapter pattern - maps API types to UI types
- Contains: Session data, repo info, messages, status

**React Query Hooks:**
- Purpose: Encapsulate API calls with caching and mutation
- Examples: `frontend/src/api/hooks.ts`
- Pattern: Custom hooks wrapping `useQuery` and `useMutation`
- Contains: `useRepos()`, `useSessions()`, `useRunSession()`, etc.

**Database Models:**
- Purpose: Typed data structures for persistence
- Examples: `backend/src/db/models.rs`
- Pattern: Serde-serializable structs with UUID primary keys
- Contains: `Repo`, `Session`, `Message`, `OutputLog`, `ConfigEntry`

## Entry Points

**Backend Main:**
- Location: `backend/src/main.rs`
- Triggers: Binary execution, CLI commands
- Responsibilities: Parse CLI args, initialize DB, create AppState, start HTTP server or run service command

**Frontend Main:**
- Location: `frontend/src/main.tsx`
- Triggers: Browser loads index.html
- Responsibilities: Mount React root, render App component

**Frontend App:**
- Location: `frontend/src/App.tsx`
- Triggers: React render
- Responsibilities: Configure providers (QueryClient, Tooltip, Toaster), define routes

**API Health Check:**
- Location: `backend/src/main.rs` (`health_check` function)
- Triggers: `GET /api/health`
- Responsibilities: Return server status for monitoring

## Error Handling

**Strategy:** Type-safe error enums with automatic HTTP response conversion

**Patterns:**
- Backend uses `thiserror` for custom error types (`AppError`, `DbError`, `RalphError`, `ServiceError`)
- `AppError` implements `IntoResponse` for automatic HTTP status codes
- Frontend uses `ApiError` class for fetch errors with status code preservation
- React Query handles loading/error states automatically

**Backend Error Example:**
```rust
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),  // -> 404

    #[error("Bad request: {0}")]
    BadRequest(String),  // -> 400

    #[error("Internal error: {0}")]
    Internal(String),  // -> 500
}
```

**Frontend Error Example:**
```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: string
  ) {
    super(`API Error ${status}: ${statusText}`);
  }
}
```

## Cross-Cutting Concerns

**Logging:**
- Backend: `tracing` + `tracing_subscriber` for structured logging
- Frontend: Browser console via `console.error`

**Validation:**
- Backend: Manual validation in handlers (path exists, is git repo, etc.)
- Frontend: Zod schemas available via dependencies, form validation with react-hook-form

**Authentication:**
- Not implemented - local-only application
- CORS wide open for development (`CorsLayer::new().allow_origin(Any)`)

**Asset Serving:**
- Frontend assets embedded in binary via `rust-embed`
- SPA routing: non-asset paths fall back to `index.html`
- Cache headers: `max-age=31536000, immutable` for `/assets/`, `no-cache` for HTML

---

*Architecture analysis: 2026-01-17*
