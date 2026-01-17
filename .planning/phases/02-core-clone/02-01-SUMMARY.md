---
phase: 02-core-clone
plan: 01
subsystem: api
tags: [git2, clone, repos, axum, rust]

# Dependency graph
requires:
  - phase: 01-cleanup
    provides: Clean DB layer with proper error handling
provides:
  - Backend clone endpoint POST /api/repos/clone
  - GitManager::clone() function using git2 RepoBuilder
  - URL parsing for SSH and HTTPS git URLs
affects: [02-02, frontend-clone-dialog, clone-progress]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - spawn_blocking for synchronous git2 operations in async handlers

key-files:
  created: []
  modified:
    - backend/src/git/mod.rs
    - backend/src/api/repos.rs

key-decisions:
  - "Use git2 RepoBuilder for clone (not CLI subprocess)"
  - "Clone destination hardcoded to ~/ralphtown/{repo-name}"
  - "Use spawn_blocking to avoid blocking async runtime"

patterns-established:
  - "Synchronous git2 operations wrapped in spawn_blocking"

# Metrics
duration: 3min
completed: 2026-01-17
---

# Phase 2 Plan 1: Backend Clone Endpoint Summary

**Clone endpoint using git2 RepoBuilder with spawn_blocking, extracts repo name from SSH/HTTPS URLs, clones to ~/ralphtown/**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-17T18:12:48Z
- **Completed:** 2026-01-17T18:16:11Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Added GitManager::clone() function using git2::build::RepoBuilder
- Added POST /api/repos/clone endpoint with CloneRepoRequest/CloneRepoResponse types
- Implemented extract_repo_name() helper for both HTTPS and SSH URL formats
- Used tokio::task::spawn_blocking to avoid blocking async runtime
- Cloned repos auto-inserted into database and returned in response
- Manual integration test verified full clone workflow

## Task Commits

Each task was committed atomically:

1. **Task 1: Add clone function to GitManager** - `2e93490` (feat)
2. **Task 2: Add clone endpoint to repos API** - `cb3f988` (feat)
3. **Task 3: Manual integration test** - (verification only, no commit)

## Files Created/Modified

- `backend/src/git/mod.rs` - Added clone() function and tests
- `backend/src/api/repos.rs` - Added clone endpoint, request/response types, URL parsing helper, tests

## Decisions Made

1. **Use git2 RepoBuilder for clone** - Follows existing pattern of using git2 for operations that don't require credential prompting. Phase 2 targets public repos.
2. **Clone to ~/ralphtown/{repo-name}** - Predictable, user-visible location per PROJECT.md decisions.
3. **Use spawn_blocking for git2** - git2 is synchronous; must not block tokio async runtime during potentially long clone operations.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Clone endpoint ready for frontend integration
- Ready for 02-02-PLAN.md: Frontend CloneDialog + RepoSelector integration
- No blockers

---
*Phase: 02-core-clone*
*Completed: 2026-01-17*
