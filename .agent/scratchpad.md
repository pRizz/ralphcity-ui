# Ralphtown Implementation Scratchpad

## Current Focus: Step 2 Complete - Moving to Step 3

### Progress Checklist (from plan.md)
- [x] Step 0: Rename project from Gascountry to Ralphtown
- [x] Step 1: Project restructure to monorepo
- [x] Step 2: Backend scaffold with Axum
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

## Step 0 - COMPLETED

### Changes Made
- [x] Renamed `src/types/gastown.ts` to `src/types/ralphtown.ts`
- [x] Renamed `GastownInstance` type to `RalphtownInstance`
- [x] Renamed `src/components/gastown/` directory to `src/components/ralphtown/`
- [x] Updated all imports across codebase (gastown -> ralphtown)
- [x] Updated `mockGastownInstances` to `mockRalphtownInstances`
- [x] Updated `package.json` name to "ralphtown"
- [x] Updated `index.html` title and meta tags
- [x] Updated `README.md` with Ralphtown branding
- [x] Updated CSS comment "Gastown specific tokens" -> "Ralphtown specific tokens"
- [x] Updated UI text:
  - "Gascountry" header -> "Ralphtown"
  - "Search gastowns..." -> "Search sessions..."
  - "New gascountry" -> "New session"
  - "gascountry source code" -> "ralphtown source code"
  - "Gastown spawned" toast -> "Session started"
  - "Ask gastown to build..." -> "Ask Ralph to build..."
- [x] Updated GitHub URL to pRizz/ralphtown
- [x] Renamed callback props: onNewGastown -> onNewSession, onSpawnGastown -> onStartSession

### Verification
- Build: ✅ PASS
- Tests: ✅ PASS
- Grep for gastown/gascountry in src/: ✅ No matches

---

## Step 1 - COMPLETED

### Changes Made
- [x] Created `/frontend` directory and moved all React code into it
- [x] Created `/backend` directory with Rust project scaffold
- [x] Created workspace `Cargo.toml` at root with `members = ["backend"]`
- [x] Frontend paths already use relative references - no changes needed
- [x] Updated `.gitignore` for Rust artifacts (target/, Cargo.lock)
- [x] Created `backend/src/main.rs` with minimal Axum server and health endpoint

### Directory Structure
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
│   └── src/main.rs
└── README.md
```

### Verification
- Frontend build: ✅ PASS (`npm run build` from frontend/)
- Frontend tests: ✅ PASS (1/1)
- Backend check: ✅ PASS (`cargo check` from root)

---

## Step 2 - COMPLETED

### Changes Made
- [x] Added `backend/src/error.rs` with AppError enum (Internal, NotFound, BadRequest)
- [x] Error types implement IntoResponse for Axum HTTP responses
- [x] Added AppResult<T> type alias for Result<T, AppError>
- [x] Refactored main.rs to export `create_app()` function for testing
- [x] Added integration test for health endpoint using axum-test v18
- [x] Made HealthResponse public and derive Deserialize for test assertions

### Files Added/Modified
- `backend/src/error.rs` (new) - Error handling types
- `backend/src/main.rs` - Added error module, create_app(), and test
- `backend/Cargo.toml` - Added axum-test v18 dev dependency

### Verification
- Backend cargo check: ✅ PASS
- Backend cargo test: ✅ PASS (1 test)
- Frontend build: ✅ PASS
- Frontend tests: ✅ PASS (1 test)

---

## Next: Step 3 - Database Layer with SQLite

Tasks:
- [ ] Add rusqlite dependency
- [ ] Create `backend/src/db/mod.rs` - Database struct, connection management
- [ ] Create `backend/src/db/schema.rs` - Schema creation SQL
- [ ] Create `backend/src/db/models.rs` - Rust structs matching tables
- [ ] Store database in user's data directory (dirs crate)
- [ ] Add tests for schema creation and basic CRUD

---

## Notes
- Lint has pre-existing errors in shadcn-ui components (not from rename)
- Backend uses Axum 0.8, tower-http 0.6, axum-test 18
