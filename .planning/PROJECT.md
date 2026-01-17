# Ralphtown

## What This Is

A desktop UI for managing AI coding agents (ralph) across multiple git repositories. Users can run autonomous coding sessions, view real-time output, and manage multiple repos from a single local-first interface. Built with React/TypeScript frontend, Rust/Axum backend, WebSocket streaming, and SQLite persistence.

## Core Value

Users can run autonomous AI coding sessions across multiple repositories from a single interface with real-time feedback.

## Requirements

### Validated

- ✓ Add and manage local git repositories — existing
- ✓ Create ralph sessions with prompts — existing
- ✓ Run ralph in autonomous mode — existing
- ✓ Real-time WebSocket streaming of ralph output — existing
- ✓ Session history and persistence — existing
- ✓ Git operations (status, log, branches, diff, commit) — existing
- ✓ Cross-platform system service installation — existing
- ✓ Single binary distribution with embedded frontend — existing

### Active

- [ ] Clone repos from git URL (SSH or HTTPS)
- [ ] Default clone location (~/ralphtown/) with future settings escape hatch
- [ ] Clone progress UI with status feedback
- [ ] Auto-select cloned repo in selector
- [ ] Credential prompts for failed auth (GitHub PAT, username/password, SSH passphrase)
- [ ] Alternative auth instructions for users who prefer CLI setup
- [ ] Helpful error messages explaining auth failures and how to fix
- [ ] Delete unused mockData.ts (dead code cleanup)
- [ ] Validate repo path exists before session creation
- [ ] Helpful error when ralph CLI not found in PATH
- [ ] Replace .unwrap() with proper error handling in DB layer

### Out of Scope

- Multi-user authentication — local-only app, single user
- Remote deployment — localhost-bound by design
- Built-in credential storage/keychain — use system git credentials or prompt inline
- Folder picker for clone destination — defer to v2, use default location for now

## Context

**Existing codebase:**
- React 18 + TypeScript frontend with shadcn/ui components
- Rust backend with Axum, Tokio, SQLite (rusqlite)
- git2 crate for read operations, git CLI for write operations
- WebSocket for real-time output streaming
- `ralph` CLI spawned as subprocess, tracked in RalphManager

**Git operations context:**
- Already using git2 (libgit2) for status, log, branches, diff
- Using git CLI subprocess for push, pull, commit (credential handling)
- Clone will need credential callback support in git2 or fallback to CLI

**Platform directories:**
- App data: `dirs::data_dir()/ralphtown/` (database lives here)
- Clone destination: `~/ralphtown/` (user-visible, predictable location)

## Constraints

- **Tech stack**: Must use existing Rust/TypeScript stack — no new languages
- **Local-only**: Server binds to 127.0.0.1, no remote access
- **ralph dependency**: External CLI must be in PATH, can't bundle it
- **git credentials**: Must work with user's existing git auth setup (SSH keys, credential helpers, PATs)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Default clone to ~/ralphtown/ | Visible, predictable, follows ~/Documents pattern | — Pending |
| Prompt for creds on auth failure | Better UX than requiring pre-configured git credentials | — Pending |
| Use git2 callbacks for clone auth | Leverages existing git2 dependency, supports SSH/HTTPS | — Pending |

---
*Last updated: 2026-01-17 after initialization*
