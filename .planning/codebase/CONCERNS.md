# Codebase Concerns

**Analysis Date:** 2026-01-17

## Tech Debt

**Excessive `.unwrap()` usage in database layer:**
- Issue: The `db/mod.rs` module uses `.unwrap()` extensively when parsing UUIDs and timestamps from database rows. This creates panic points on malformed data.
- Files: `backend/src/db/mod.rs` (lines 136, 140, 143, 163, 167, 170, 190, 194, 197, 256-264, 285-293, 312-320, 400-405, 542-560)
- Impact: Application crash if database contains unexpected data format (e.g., after schema migration or manual edits)
- Fix approach: Replace `.unwrap()` with proper error handling, returning `DbError::InvalidData` for parse failures

**Test code uses `.expect()` and `.unwrap()` liberally:**
- Issue: Test helper code and test assertions use `.expect()` which is acceptable, but the pattern bleeds into production code patterns
- Files: `backend/src/api/repos.rs`, `backend/src/api/sessions.rs`, `backend/src/api/git.rs`, `backend/src/git/mod.rs`, `backend/src/db/mod.rs` (test modules)
- Impact: Low - tests are expected to panic on failure
- Fix approach: No action needed for tests, but ensure test patterns don't influence production code

**Mock data file still in codebase:**
- Issue: `mockData.ts` contains hardcoded mock repositories and messages that appear unused now that real API integration exists
- Files: `frontend/src/data/mockData.ts`
- Impact: Dead code, could confuse developers about data flow
- Fix approach: Verify no imports exist, then delete file

**Minimal frontend test coverage:**
- Issue: Only one trivial example test exists for the entire frontend
- Files: `frontend/src/test/example.test.ts` - contains only `expect(true).toBe(true)`
- Impact: No validation that UI components render correctly or that hooks behave as expected
- Fix approach: Add tests for critical paths: `useWebSocket`, `useSession`, `ConversationView`, `Index` page

## Known Bugs

**WebSocket URL hardcoded to localhost:**
- Symptoms: WebSocket connection fails when accessing from non-localhost
- Files: `frontend/src/hooks/useWebSocket.ts` (line 9: `const WS_URL = "ws://localhost:3000/api/ws"`)
- Trigger: Access the UI from any host other than localhost:3000
- Workaround: None - must access from localhost

**No validation of repo path existence before session creation:**
- Symptoms: Sessions can be created for repos whose paths no longer exist on disk
- Files: `backend/src/api/sessions.rs` (lines 77-95)
- Trigger: Delete a repo directory, then try to run a session
- Workaround: The error surfaces when ralph tries to execute

## Security Considerations

**Permissive CORS configuration:**
- Risk: CORS allows any origin, method, and header in production
- Files: `backend/src/main.rs` (lines 67-70)
- Current mitigation: Server binds to 127.0.0.1 only, limiting network exposure
- Recommendations: For production deployment, restrict CORS to specific origins or remove if not needed

**WebSocket lacks authentication:**
- Risk: Any WebSocket client can subscribe to any session and receive output
- Files: `backend/src/ws/mod.rs`
- Current mitigation: Server only binds to localhost
- Recommendations: Add session token validation if exposing beyond localhost

**Command injection potential in ralph spawning:**
- Risk: User-provided `prompt` is passed directly to ralph CLI
- Files: `backend/src/ralph/mod.rs` (lines 97-105)
- Current mitigation: Prompt is passed as a single argument via `--prompt`, not shell-interpreted
- Recommendations: Continue using argument-based passing, never shell interpolation

## Performance Bottlenecks

**Database connection mutex blocks all operations:**
- Problem: Single `Mutex<Connection>` means all DB operations serialize
- Files: `backend/src/db/mod.rs` (line 39: `conn: Arc<Mutex<Connection>>`)
- Cause: SQLite in single-connection mode with synchronous mutex
- Improvement path: Use connection pooling (r2d2-sqlite) or SQLite WAL mode with multiple readers

**WebSocket broadcasts to all subscribers sequentially:**
- Problem: High-frequency output from ralph is broadcast to each subscriber sequentially
- Files: `backend/src/ws/connections.rs`, `backend/src/ralph/mod.rs` (lines 186-195, 215-224)
- Cause: Uses `broadcast::channel` but still awaits each send
- Improvement path: Use `try_send` or spawn broadcast tasks to avoid blocking output processing

**No pagination on session/repo listing:**
- Problem: All sessions and repos are returned in single queries
- Files: `backend/src/db/mod.rs` (lines 182-204, 276-300)
- Cause: Simple queries without LIMIT/OFFSET for list endpoints
- Improvement path: Add pagination parameters to list endpoints

## Fragile Areas

**Process management state synchronization:**
- Files: `backend/src/ralph/mod.rs`
- Why fragile: Process state is tracked in `RalphManagerInner` HashMap, separate from database `SessionStatus`. Race conditions possible between status update and process exit handling
- Safe modification: Ensure any status changes acquire write lock on inner state before database update
- Test coverage: Only basic unit tests for state checking; no integration tests for process lifecycle

**WebSocket subscription lifecycle:**
- Files: `backend/src/ws/mod.rs`, `backend/src/ws/connections.rs`
- Why fragile: Spawns new tasks for each subscription without clear cleanup path. If receiver channel closes, task continues running
- Safe modification: Add explicit cancellation tokens or use JoinSet to track spawned tasks
- Test coverage: Minimal - only unit tests for message serialization

**Frontend output line accumulation:**
- Files: `frontend/src/pages/Index.tsx` (lines 38-45)
- Why fragile: Output lines accumulate in `Map<string, OutputLine[]>` state with no limit. Long-running sessions could exhaust browser memory
- Safe modification: Add ring buffer or limit to outputLines state
- Test coverage: None

## Scaling Limits

**In-memory process tracking:**
- Current capacity: Limited by HashMap memory
- Limit: Cannot scale beyond single server instance
- Scaling path: Store process state in database or external cache (Redis) for multi-instance deployment

**SQLite database:**
- Current capacity: Single file database
- Limit: Single writer at a time, limited concurrent readers
- Scaling path: Migrate to PostgreSQL for production multi-instance deployment

## Dependencies at Risk

**`ralph` CLI dependency:**
- Risk: Application requires `ralph` binary in PATH; failure mode is unclear if missing
- Impact: Sessions fail to start with generic "SpawnFailed" error
- Migration plan: Add explicit check for ralph binary at startup with helpful error message

## Missing Critical Features

**No authentication or authorization:**
- Problem: All API endpoints and WebSocket connections are unauthenticated
- Blocks: Multi-tenant usage, public deployment

**No rate limiting:**
- Problem: No protection against API or WebSocket abuse
- Blocks: Public deployment without DoS risk

**No graceful shutdown:**
- Problem: Server doesn't cleanly terminate running ralph processes on shutdown
- Blocks: Clean deployment/restart cycles

## Test Coverage Gaps

**Frontend hooks:**
- What's not tested: `useWebSocket.ts`, `use-toast.ts`, `use-mobile.tsx`
- Files: `frontend/src/hooks/`
- Risk: WebSocket reconnection logic, message parsing could silently break
- Priority: High

**Frontend components:**
- What's not tested: All components in `frontend/src/components/ralphtown/`
- Files: `ConversationView.tsx`, `AgentSidebar.tsx`, `SettingsDialog.tsx`, `RepoSelector.tsx`, `MainPanel.tsx`, `PromptInput.tsx`, `AgentListItem.tsx`
- Risk: UI regressions undetected
- Priority: Medium

**Backend integration tests:**
- What's not tested: End-to-end flow from session creation through ralph execution to output streaming
- Files: Would need new integration test module
- Risk: Component interfaces could drift apart
- Priority: High

**WebSocket connection management:**
- What's not tested: Connection cleanup, subscription/unsubscription race conditions
- Files: `backend/src/ws/connections.rs` (tests only cover message serialization)
- Risk: Memory leaks from orphaned subscriptions
- Priority: Medium

---

*Concerns audit: 2026-01-17*
