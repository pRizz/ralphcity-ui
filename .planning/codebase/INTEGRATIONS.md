# External Integrations

**Analysis Date:** 2026-01-17

## APIs & External Services

**Ralph CLI (Critical External Dependency):**
- What: External CLI tool for AI-assisted coding sessions
- Used for: Spawning autonomous coding agent processes
- Invocation: `ralph run --autonomous --prompt <prompt>`
- Location: Must be in system PATH
- Process management: Spawned with Tokio, tracked in `RalphManager`
- Implementation: `backend/src/ralph/mod.rs`

**No Third-Party APIs:**
- Application is fully self-contained
- No external API calls to cloud services
- All AI functionality delegated to local `ralph` CLI

## Data Storage

**SQLite Database:**
- Engine: rusqlite 0.33 (bundled SQLite)
- Connection: Single file database with mutex-protected connection
- Location: Platform data directory (`dirs::data_dir()/ralphtown/ralphtown.db`)
  - macOS: `~/Library/Application Support/ralphtown/ralphtown.db`
  - Linux: `~/.local/share/ralphtown/ralphtown.db`
  - Windows: `C:\Users\<User>\AppData\Roaming\ralphtown\ralphtown.db`
- Implementation: `backend/src/db/mod.rs`
- Schema: `backend/src/db/schema.rs`

**Database Schema:**
```sql
-- Tables (from backend/src/db/schema.rs)
repos          -- Git repositories being managed
sessions       -- Ralph sessions tied to repos
messages       -- Chat messages within sessions
output_logs    -- Raw stdout/stderr from Ralph processes
config         -- Key-value configuration storage
schema_version -- Migration tracking
```

**File Storage:**
- Local filesystem only
- Git repository paths stored as references (not copied)
- No blob storage or file uploads

**Caching:**
- None (no Redis, no in-memory cache layer)
- React Query handles client-side cache with automatic invalidation

## Git Integration

**libgit2 (via git2 crate):**
- Read operations: status, log, branches, diff stats
- Implementation: `backend/src/git/mod.rs`

**Git CLI (subprocess):**
- Write operations: pull, push, commit, reset, checkout, add
- Reason: Avoids credential/SSH complexity in libgit2
- Implementation: `backend/src/git/mod.rs` (`run_git_command`)

## Real-time Communication

**WebSocket:**
- Endpoint: `/api/ws`
- Purpose: Real-time session output streaming, status updates
- Protocol: JSON messages over WebSocket
- Implementation: `backend/src/ws/mod.rs`
- Connection management: `backend/src/ws/connections.rs`

**Message Types (Client -> Server):**
- `subscribe` - Subscribe to session output
- `unsubscribe` - Stop receiving session output
- `cancel` - Request to cancel running session
- `ping` - Keep-alive

**Message Types (Server -> Client):**
- `subscribed` / `unsubscribed` - Subscription confirmations
- `output` - Session stdout/stderr content
- `status` - Session status change
- `error` - Error messages
- `pong` - Keep-alive response

**Frontend Hook:** `frontend/src/hooks/useWebSocket.ts`
- Auto-reconnect on disconnect (3 second interval)
- Ping interval: 30 seconds
- Re-subscribes to tracked sessions on reconnect

## Authentication & Identity

**Authentication:**
- None implemented
- No user accounts, sessions, or tokens
- Application runs as localhost-only service

**Authorization:**
- None implemented
- All endpoints publicly accessible on localhost

## Monitoring & Observability

**Logging:**
- Framework: tracing + tracing-subscriber (Rust)
- Level: Info and above
- Format: Standard text format to stdout
- Key log points: WebSocket connections, session lifecycle, errors

**Error Tracking:**
- None (no Sentry, Rollbar, etc.)
- Errors logged via tracing

**Metrics:**
- None (no Prometheus, StatsD, etc.)

## CI/CD & Deployment

**Hosting:**
- Self-hosted as local service
- Designed for single-user localhost deployment

**Service Management:**
- Cross-platform via `service-manager` crate
- Implementation: `backend/src/service/mod.rs`
- CLI commands: `ralphtown install|uninstall|start|stop|status`

**macOS:**
- LaunchAgent at `~/Library/LaunchAgents/com.ralphtown.server.plist`
- User-level service (no root required)

**Linux:**
- systemd user service at `~/.config/systemd/user/ralphtown.service`

**Windows:**
- Windows Service

**CI Pipeline:**
- None configured in repository

## Environment Configuration

**Required Environment:**
- None (no .env files detected)
- Configuration stored in SQLite `config` table

**Runtime Dependencies:**
- `ralph` CLI must be in PATH

**Configurable Values (via config table/API):**
- Backend selection
- Preset selection
- Custom key-value pairs

## Webhooks & Callbacks

**Incoming Webhooks:**
- None

**Outgoing Webhooks:**
- None

## Process Management

**Ralph Process Lifecycle:**
- Spawned: `tokio::process::Command`
- Process group: setpgid on Unix for signal handling
- Stdout/stderr: Captured via async line readers
- Output: Persisted to database, broadcast via WebSocket
- Cancellation: SIGTERM then SIGKILL after 5 seconds
- Constraint: One ralph instance per repository
- Implementation: `backend/src/ralph/mod.rs`

## Frontend-Backend Communication

**REST API:**
- Base URL: `/api`
- Endpoints:
  - `/api/health` - Health check
  - `/api/repos` - Repository CRUD
  - `/api/repos/scan` - Directory scanning
  - `/api/sessions` - Session CRUD
  - `/api/sessions/:id/run` - Start ralph
  - `/api/sessions/:id/cancel` - Cancel ralph
  - `/api/sessions/:id/output` - Get output logs
  - `/api/sessions/:id/git/*` - Git operations
  - `/api/config` - Configuration CRUD
  - `/api/config/backends` - List AI backends
  - `/api/config/presets` - List presets
- Client: `frontend/src/api/client.ts`
- Types: `frontend/src/api/types.ts`
- Hooks: `frontend/src/api/hooks.ts` (React Query wrappers)

**Static Assets:**
- Frontend build embedded via rust-embed
- Served from fallback route
- Implementation: `backend/src/assets.rs`

---

*Integration audit: 2026-01-17*
