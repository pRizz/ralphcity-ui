# Implementation Plan: Ralphtown

## Progress Checklist

- [ ] Step 0: Rename project from Gascountry to Ralphtown
- [ ] Step 1: Project restructure to monorepo
- [ ] Step 2: Backend scaffold with Axum
- [ ] Step 3: Database layer with SQLite
- [ ] Step 4: Repository management API
- [ ] Step 5: Session management API
- [ ] Step 6: WebSocket infrastructure
- [ ] Step 7: Ralph process spawning
- [ ] Step 8: Output streaming to WebSocket
- [ ] Step 9: Interrupt/cancel functionality
- [ ] Step 10: Git operations
- [ ] Step 11: Frontend API integration
- [ ] Step 12: Frontend WebSocket integration
- [ ] Step 13: Configuration management
- [ ] Step 14: Service installation
- [ ] Step 15: Cargo install packaging
- [ ] Step 16: Polish and integration testing

---

## Step 0: Rename Project from Gascountry to Ralphtown

**Objective:** Rename all project references from "Gascountry/Gastown" to "Ralphtown" across the codebase.

**Implementation Guidance:**

**Repository & Package Names:**
- Rename repo from `gascountry-ui` to `ralphtown` (or keep repo name, update internal references)
- Update `package.json`: name from "gascountry" to "ralphtown"
- Update page title in `index.html`

**TypeScript/React Code:**
- Rename `GastownInstance` type to `RalphtownInstance` in `src/types/gastown.ts`
- Rename file `src/types/gastown.ts` to `src/types/ralphtown.ts`
- Rename `src/components/gastown/` directory to `src/components/ralphtown/`
- Update all imports referencing gastown → ralphtown
- Rename component references: `AgentSidebar`, `MainPanel`, etc. (keep names, just move directory)
- Update mock data file `src/data/mockData.ts` - rename "Gastown instances" references

**UI Text & Labels:**
- Update any user-visible "Gastown" or "Gascountry" text to "Ralphtown"
- Update search placeholder text
- Update sidebar title/branding
- Update any toast messages or status text

**CSS & Styling:**
- Rename CSS custom properties if they reference gastown/gascountry
- Update any class names containing gastown/gascountry

**Configuration:**
- Update `vite.config.ts` if it references the project name
- Update any environment variables or config files

**Tests:** None needed - rename only.

**Integration:** Must complete before Step 1 to avoid confusion.

**Demo:** Run the app, verify all UI shows "Ralphtown" branding, no "Gascountry" or "Gastown" text visible.

---

## Step 1: Project Restructure to Monorepo

**Objective:** Reorganize the existing ralphtown repository into a monorepo structure with separate frontend and backend directories.

**Implementation Guidance:**
- Create `/frontend` directory and move all existing React code into it
- Create `/backend` directory for the new Rust project
- Create workspace `Cargo.toml` at root
- Update frontend paths (vite.config.ts, package.json scripts)
- Update .gitignore for Rust artifacts

**Directory Structure:**
```
ralphtown/
├── Cargo.toml              # Workspace manifest
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   └── ...
├── backend/
│   ├── Cargo.toml
│   └── src/
└── README.md
```

**Tests:** None needed - structural change only.

**Integration:** Starting point, no prior work to integrate.

**Demo:** Run `npm run dev` from `/frontend` and verify the existing UI still works. Run `cargo check` from root to verify workspace setup.

---

## Step 2: Backend Scaffold with Axum

**Objective:** Create a minimal Axum HTTP server that serves a health check endpoint.

**Implementation Guidance:**
- Initialize Rust project in `/backend` with required dependencies
- Set up Axum with basic routing
- Add health check endpoint: `GET /api/health`
- Configure CORS for localhost frontend
- Add basic error handling types

**Key Dependencies:**
```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tower-http = { version = "0.5", features = ["cors"] }
tracing = "0.1"
tracing-subscriber = "0.3"
```

**Tests:** Basic test that server starts and health endpoint returns 200.

**Integration:** Standalone backend, will later connect to frontend.

**Demo:** Start backend with `cargo run`, hit `http://localhost:3000/api/health` and see `{"status": "ok"}`.

---

## Step 3: Database Layer with SQLite

**Objective:** Add SQLite database with schema for repos, sessions, messages, and config.

**Implementation Guidance:**
- Add rusqlite dependency
- Create `Database` struct with connection pool
- Implement schema initialization (create tables if not exist)
- Create data access methods for basic CRUD
- Store database in user's data directory (dirs crate)

**Key Files:**
- `backend/src/db/mod.rs` - Database struct, connection management
- `backend/src/db/schema.rs` - Schema creation SQL
- `backend/src/db/models.rs` - Rust structs matching tables

**Tests:**
- Test schema creation on fresh database
- Test basic insert/select for repos table

**Integration:** Database will be injected into Axum state.

**Demo:** Start backend, verify `~/.local/share/gascountry/gascountry.db` (or platform equivalent) is created with correct tables.

---

## Step 4: Repository Management API

**Objective:** Implement REST endpoints for managing repositories (list, add, remove, scan).

**Implementation Guidance:**
- `GET /api/repos` - List all repos
- `POST /api/repos` - Add repo (local path or clone URL)
- `DELETE /api/repos/{id}` - Remove repo
- `POST /api/repos/scan` - Scan configured directories for git repos
- Validate paths exist and are git repositories
- For clone URLs, clone to a managed directory

**Key Logic:**
- Use `git2::Repository::open()` to validate git repos
- Use `git2::Repository::clone()` for cloning
- Store scan directories in config table

**Tests:**
- Test adding valid local repo path
- Test rejecting non-existent path
- Test rejecting non-git directory

**Integration:** Uses Database from Step 3.

**Demo:** Use curl/Postman to add a local repo, list repos, remove it. Show repos persisting across server restarts.

---

## Step 5: Session Management API

**Objective:** Implement REST endpoints for creating and managing sessions tied to repositories.

**Implementation Guidance:**
- `POST /api/sessions` - Create session for a repo
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/{id}` - Get session details with messages
- `DELETE /api/sessions/{id}` - Delete session and its data
- Enforce: session tied to valid repo
- Store session status (idle, running, completed, error, cancelled)

**Key Files:**
- `backend/src/api/sessions.rs` - Session endpoints
- `backend/src/db/sessions.rs` - Session data access

**Tests:**
- Test creating session for valid repo
- Test rejecting session for non-existent repo
- Test session status transitions

**Integration:** Uses Database and Repos from Steps 3-4.

**Demo:** Create a repo, create a session for it, list sessions, get session details.

---

## Step 6: WebSocket Infrastructure

**Objective:** Add WebSocket support for real-time communication between frontend and backend.

**Implementation Guidance:**
- Add WebSocket route: `GET /api/ws` → upgrade to WebSocket
- Create message types (subscribe, unsubscribe, cancel, output, status, error)
- Implement connection manager to track connected clients
- Support subscribing to session output by session_id
- Use tokio broadcast channels for pub/sub

**Key Files:**
- `backend/src/ws/mod.rs` - WebSocket handler
- `backend/src/ws/messages.rs` - Message types
- `backend/src/ws/connections.rs` - Connection manager

**Tests:**
- Test WebSocket connection establishment
- Test subscribe/unsubscribe message handling
- Test message broadcasting to subscribers

**Integration:** WebSocket will later receive output from Ralph Manager.

**Demo:** Connect to WebSocket via browser devtools or wscat, send subscribe message, verify acknowledgment.

---

## Step 7: Ralph Process Spawning

**Objective:** Implement RalphManager that can spawn ralph CLI processes and track their state.

**Implementation Guidance:**
- Create `RalphManager` struct
- Implement `run()` method that spawns `ralph run --autonomous --prompt "..."`
- Run ralph as process group leader (for signal handling)
- Track running processes by session_id
- Enforce 1 instance per repo constraint
- Capture exit code and update session status

**Key Logic:**
```rust
#[cfg(unix)]
unsafe {
    cmd.pre_exec(|| {
        nix::unistd::setpgid(Pid::from_raw(0), Pid::from_raw(0))
    });
}
```

**Tests:**
- Test repo busy detection (mock or simple script instead of real ralph)
- Test process group setup on Unix

**Integration:** Uses Session from Step 5, will connect to WebSocket in Step 8.

**Demo:** Create session, POST to run endpoint with simple prompt, verify ralph process starts (check `ps aux | grep ralph`), verify session status updates to "running" then "completed".

---

## Step 8: Output Streaming to WebSocket

**Objective:** Stream ralph's stdout/stderr to connected WebSocket clients in real-time.

**Implementation Guidance:**
- Capture stdout/stderr from spawned process as async streams
- Parse output line by line using `tokio::io::BufReader`
- Send each line to broadcast channel
- WebSocket handler forwards to subscribed clients
- Also store output in database for history

**Key Flow:**
```
Ralph stdout → BufReader → broadcast::Sender → WebSocket → Frontend
                                    ↓
                              Database (output_logs)
```

**Tests:**
- Test output parsing from mock process
- Test broadcast to multiple subscribers

**Integration:** Connects Ralph Manager (Step 7) to WebSocket (Step 6).

**Demo:** Start ralph run, open WebSocket connection in browser, see live console output streaming in real-time.

---

## Step 9: Interrupt/Cancel Functionality

**Objective:** Allow users to cancel running ralph executions via WebSocket cancel message.

**Implementation Guidance:**
- Handle "cancel" WebSocket message
- Send SIGTERM to process group
- Wait 5 seconds for graceful shutdown
- Send SIGKILL if still running
- Update session status to "cancelled"
- Notify subscribers of status change

**Key Logic:**
```rust
pub async fn interrupt(&mut self, session_id: Uuid) -> Result<()> {
    if let Some(process) = self.processes.get_mut(&session_id) {
        #[cfg(unix)]
        {
            let pid = Pid::from_raw(-(process.child.id() as i32));
            kill(pid, Signal::SIGTERM)?;
            tokio::time::sleep(Duration::from_secs(5)).await;
            let _ = kill(pid, Signal::SIGKILL); // Ignore if already dead
        }
        process.child.wait().await?;
    }
    Ok(())
}
```

**Tests:**
- Test interrupt signal sequence (SIGTERM → wait → SIGKILL)
- Test session status transitions to cancelled

**Integration:** Extends Ralph Manager and WebSocket from Steps 7-8.

**Demo:** Start ralph run, watch output streaming, click cancel (or send cancel via wscat), verify process stops and status shows "cancelled".

---

## Step 10: Git Operations

**Objective:** Implement git command endpoints for status, log, branch, pull, push, commit, reset.

**Implementation Guidance:**
- Create `GitManager` with methods for each operation
- Use `git2` for read operations (status, log, branches, diff stats)
- Use CLI subprocess for write operations (pull, push, commit, reset)
- Add confirmation requirement for reset --hard (frontend will handle UI)

**Endpoints:**
- `GET /api/sessions/{id}/git/status`
- `GET /api/sessions/{id}/git/log?limit=20`
- `GET /api/sessions/{id}/git/branches`
- `POST /api/sessions/{id}/git/pull`
- `POST /api/sessions/{id}/git/push`
- `POST /api/sessions/{id}/git/commit` (body: `{"message": "..."}`)
- `POST /api/sessions/{id}/git/reset` (body: `{"confirm": true}`)
- `POST /api/sessions/{id}/git/checkout` (body: `{"branch": "..."}`)

**Tests:**
- Test git status parsing
- Test diff stats calculation (added/removed lines per file)

**Integration:** Uses session's repo path from Step 5.

**Demo:** Create session for a repo, call git status endpoint, make a change, call git status again to see diff, call commit endpoint.

---

## Step 11: Frontend API Integration

**Objective:** Connect React frontend to backend REST API, replacing mock data.

**Implementation Guidance:**
- Create API client module with fetch wrappers
- Set up React Query for data fetching and caching
- Replace mock data in Index.tsx with real API calls
- Update RepoSelector to fetch from `/api/repos`
- Update session creation to POST to `/api/sessions`
- Add git command buttons that call git endpoints
- Handle loading and error states

**Key Files:**
- `frontend/src/api/client.ts` - API client
- `frontend/src/api/hooks.ts` - React Query hooks
- Update: `frontend/src/pages/Index.tsx`
- Update: `frontend/src/components/gastown/*`

**Tests:** None required (trust React Query, manual testing sufficient).

**Integration:** Frontend now talks to real backend from Steps 2-10.

**Demo:** Open UI, see real repos from filesystem, create session, see it persisted, refresh page and session still there.

---

## Step 12: Frontend WebSocket Integration

**Objective:** Connect frontend to WebSocket for real-time output streaming and cancel.

**Implementation Guidance:**
- Create WebSocket client hook with auto-reconnect
- Subscribe to session when viewing ConversationView
- Display streaming output in console log area
- Add cancel button that sends cancel message
- Show file deltas from git diff stats (poll or compute after completion)
- Handle connection errors gracefully

**Key Files:**
- `frontend/src/hooks/useWebSocket.ts` - WebSocket hook
- Update: `frontend/src/components/gastown/ConversationView.tsx`

**Tests:** None required (manual testing sufficient).

**Integration:** Connects to WebSocket from Step 6.

**Demo:** Send prompt, watch console output stream in real-time in UI, click cancel button, see execution stop.

---

## Step 13: Configuration Management

**Objective:** Add settings UI and backend for Ralph configuration and preferences.

**Implementation Guidance:**
- `GET /api/config` - Get current config
- `PUT /api/config` - Update config
- `GET /api/config/presets` - List ralph presets
- `GET /api/config/backends` - List AI backends
- Add Settings panel/modal in frontend
- Allow configuring: AI backend, preset, max iterations, scan directories
- Store in config table in database

**Key Settings:**
- `backend`: claude, gemini, codex, etc.
- `preset`: tdd-red-green, feature, debug, etc.
- `maxIterations`: default 100
- `scanDirectories`: paths to scan for repos

**Tests:** None required for basic config CRUD.

**Integration:** Config used when spawning ralph in Step 7.

**Demo:** Open settings, change AI backend, save, start new ralph run, verify it uses new backend.

---

## Step 14: Service Installation

**Objective:** Add ability to install/uninstall backend as a system service.

**Implementation Guidance:**
- Add `service-manager` crate dependency
- Create `ServiceController` struct
- Implement install/uninstall/start/stop/status methods
- Add CLI commands: `gascountry serve`, `gascountry install`, `gascountry uninstall`
- Add service status and controls to settings UI

**Platform-Specific:**
- macOS: LaunchAgent plist in `~/Library/LaunchAgents/`
- Linux: systemd user service in `~/.config/systemd/user/`
- Windows: Windows Service

**Endpoints:**
- `GET /api/service/status`
- `POST /api/service/install`
- `POST /api/service/uninstall`

**Tests:** None (platform-specific, manual testing required).

**Integration:** Service runs the same server from Step 2.

**Demo:** Run `gascountry install`, reboot machine, open browser to localhost:3000, backend is running automatically.

---

## Step 15: Cargo Install Packaging

**Objective:** Make the project installable via `cargo install`.

**Implementation Guidance:**
- Configure backend Cargo.toml for binary publication
- Add `[[bin]]` section with name "gascountry"
- Bundle frontend assets into binary (rust-embed or include_dir)
- Serve frontend from backend (static file serving)
- Add CLI argument parsing (clap) for subcommands
- Test installation from local path

**CLI Interface:**
```
gascountry serve      # Start server (default)
gascountry install    # Install as system service
gascountry uninstall  # Remove system service
gascountry --help     # Show help
```

**Frontend Bundling:**
- Build frontend with `npm run build`
- Embed dist/ into Rust binary
- Serve at root path `/`

**Tests:** None (integration testing via cargo install).

**Integration:** Combines all previous steps into single installable binary.

**Demo:** Run `cargo install --path backend`, then `gascountry serve`, open browser, full app works.

---

## Step 16: Polish and Integration Testing

**Objective:** Final polish, bug fixes, and end-to-end testing.

**Implementation Guidance:**
- Test all ralph commands (run, resume, plan, task, events, clean)
- Test all git commands
- Test service install/uninstall on each platform
- Fix any UI/UX issues discovered
- Add error messages for common problems (ralph not installed, etc.)
- Update README with installation and usage instructions
- Clean up any TODO comments or dead code

**Test Scenarios:**
- [ ] Fresh install via cargo install
- [ ] Add local repo
- [ ] Clone repo from URL
- [ ] Create session
- [ ] Run ralph with prompt
- [ ] View streaming output
- [ ] Cancel mid-execution
- [ ] Resume after cancel
- [ ] All git commands
- [ ] Change configuration
- [ ] Install as service
- [ ] Uninstall service
- [ ] Multiple sessions across repos

**Integration:** Full system integration.

**Demo:** Complete walkthrough: install, add repo, run ralph task, view output, use git commands, configure settings, install service, reboot, verify auto-start.

---

## Summary

| Step | Focus Area | Key Deliverable |
|------|------------|-----------------|
| 1 | Structure | Monorepo layout |
| 2 | Backend | Axum server |
| 3 | Database | SQLite persistence |
| 4 | API | Repo management |
| 5 | API | Session management |
| 6 | Real-time | WebSocket infrastructure |
| 7 | Core | Ralph process spawning |
| 8 | Core | Output streaming |
| 9 | Core | Cancel/interrupt |
| 10 | Feature | Git operations |
| 11 | Frontend | API integration |
| 12 | Frontend | WebSocket integration |
| 13 | Feature | Configuration |
| 14 | Feature | Service installation |
| 15 | Packaging | cargo install |
| 16 | Quality | Polish & testing |

Each step builds incrementally on previous work, with no orphaned code. Core end-to-end functionality (send prompt → see output) is available by Step 12.
