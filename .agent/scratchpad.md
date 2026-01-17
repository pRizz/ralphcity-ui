# Ralphtown Implementation Scratchpad

## Current Focus: Step 0 Complete - Moving to Step 1

### Progress Checklist (from plan.md)
- [x] Step 0: Rename project from Gascountry to Ralphtown
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

## Next: Step 1 - Project Restructure to Monorepo

### Tasks
- [ ] Create `/frontend` directory and move React code into it
- [ ] Create `/backend` directory for Rust project
- [ ] Create workspace `Cargo.toml` at root
- [ ] Update frontend paths (vite.config.ts, package.json scripts)
- [ ] Update .gitignore for Rust artifacts

---

## Notes
- Lint has pre-existing errors in shadcn-ui components (not from rename)
- Tests pass (1/1)
