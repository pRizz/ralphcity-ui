---
phase: 05-authentication
plan: 01
subsystem: api
tags: [git2, credentials, ssh, https, sse]

# Dependency graph
requires:
  - phase: 04-error-handling
    provides: CloneError with help_steps, UserActionRequired error type
provides:
  - CloneCredentials struct for SSH passphrase, key path, username, password
  - CredentialState for callback loop prevention
  - clone_with_credentials function with stateful credential callback
  - POST /repos/clone-progress accepting credentials
  - CloneEvent::Error with auth_type and can_retry_with_credentials hints
affects:
  - 05-authentication (phase 05-02 frontend will consume these API changes)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Rc<RefCell<State>> for stateful git2 credential callbacks
    - Tagged enum API credentials (serde tag = type)
    - Auth retry hints in SSE error events

key-files:
  created: []
  modified:
    - backend/src/git/mod.rs
    - backend/src/api/repos.rs
    - backend/src/error.rs

key-decisions:
  - "Use CredentialState with tried_* flags to prevent infinite credential callback loops"
  - "SSH: Try ssh-agent first, then key file with passphrase"
  - "GitHub PAT uses x-access-token username convention"
  - "POST endpoint for credentials, GET remains for no-creds clone"
  - "auth_type field for frontend UI hints: ssh, github_pat, https_basic"

patterns-established:
  - "Stateful git2 credential callback with Rc<RefCell<CredentialState>>"
  - "ApiCredentials tagged enum for typed credential input"
  - "can_retry_with_credentials boolean for frontend retry flow"

# Metrics
duration: 4min
completed: 2026-01-17
---

# Phase 5 Plan 1: Credential Callback Support Summary

**git2 credential callbacks with state tracking for SSH passphrase and HTTPS PAT authentication retry**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-17T20:11:47Z
- **Completed:** 2026-01-17T20:15:51Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Implemented CloneCredentials and CredentialState for git2 credential callback support
- Added clone_with_credentials function with stateful callback preventing infinite loops
- Created POST /repos/clone-progress endpoint accepting SSH passphrase, GitHub PAT, or HTTPS basic auth
- Enhanced CloneEvent::Error with auth_type hints for frontend retry UI

## Task Commits

Each task was committed atomically:

1. **Task 1: Add credential types and helper functions** - `9cf5809` (feat)
2. **Task 2: Implement clone_with_credentials function** - `8b2f374` (feat)
3. **Task 3: Update SSE endpoint to accept credentials** - `ea7d54e` (feat)

## Files Created/Modified

- `backend/src/git/mod.rs` - Added CloneCredentials, CredentialState, is_github_url, find_default_ssh_key, clone_with_credentials
- `backend/src/api/repos.rs` - Added CloneWithCredentialsRequest, ApiCredentials enum, clone_with_credentials_sse handler
- `backend/src/error.rs` - Updated CloneError pattern matches for new fields (needs_passphrase, is_github)

## Decisions Made

1. **CredentialState for callback loop prevention** - libgit2 repeatedly calls credential callback; tracking tried_ssh_agent, tried_ssh_key, tried_userpass prevents infinite loops
2. **SSH auth order: agent first, then key file** - Most common case is agent; fall back to key file with optional passphrase
3. **GitHub PAT convention: x-access-token username** - GitHub expects this username for PAT authentication over HTTPS
4. **Separate POST endpoint vs modifying GET** - Cleaner API: GET for no-creds, POST for credentials in body
5. **auth_type hints in error response** - Frontend can show appropriate UI: ssh passphrase input, GitHub PAT input, or username/password fields

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backend credential support complete
- Ready for Phase 5 Plan 2: Frontend credential UI
- Frontend can detect auth_type from error response and show appropriate credential input
- Auto-retry flow: frontend submits POST with credentials after auth failure

---
*Phase: 05-authentication*
*Completed: 2026-01-17*
