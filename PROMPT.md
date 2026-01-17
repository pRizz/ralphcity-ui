# Ralphtown: Web UI for Ralph CLI

## Objective

Build a web-based UI that integrates with the Ralph CLI orchestrator, enabling users to interact with AI coding agents through a browser. Users can send prompts, view real-time streaming output, manage git repositories, and control execution flow.

## Key Requirements

- **Rename project** from Gascountry/Gastown to Ralphtown throughout codebase
- **Monorepo structure** with `/frontend` (React) and `/backend` (Rust/Axum)
- **Ralph CLI integration** - spawn ralph processes, stream output via WebSocket
- **All ralph commands** - run, resume, plan, task, events, clean
- **Git commands via UI** - status, log, branch, pull, push, commit, reset --hard
- **Real-time output** - WebSocket streaming of console logs
- **Interrupt/cancel** - stop running ralph executions mid-run
- **SQLite persistence** - sessions, repos, config, output logs
- **1 instance per repo** - prevent conflicts
- **Easy installation** - `cargo install ralphtown`
- **System service** - optional auto-start via launchd/systemd/Windows Service
- **Basic tests** - for complex business logic only (process signals, state transitions, parsing)

## Acceptance Criteria

- [ ] All UI text shows "Ralphtown" (no Gascountry/Gastown references)
- [ ] Can add local repos or clone from URL
- [ ] Can create sessions and run ralph with prompts
- [ ] Console output streams in real-time to browser
- [ ] Can cancel running ralph execution
- [ ] Git buttons work (status, log, pull, push, commit, reset, branch)
- [ ] Settings allow configuring AI backend, preset, max iterations
- [ ] `cargo install --path backend` works
- [ ] `ralphtown serve` starts the server
- [ ] `ralphtown install` / `ralphtown uninstall` manages system service
- [ ] App persists data across restarts (SQLite)
- [ ] Tests pass for complex logic (process management, state machine, parsing)

## Tech Stack

**Backend:**
- Rust, Axum 0.7, tokio
- rusqlite (SQLite)
- git2 + git CLI
- service-manager crate
- WebSocket via axum

**Frontend:**
- React 18, TypeScript, Vite
- React Query
- shadcn-ui, Tailwind CSS

## Detailed Design

See: `.sop/planning/design/detailed-design.md`

This document contains:
- Full architecture diagrams
- API endpoint specifications
- WebSocket message protocol
- Database schema
- Component interfaces
- Error handling strategy
- Testing approach

## Implementation Plan

See: `.sop/planning/implementation/plan.md`

17 incremental steps (Step 0-16), each with:
- Clear objective
- Implementation guidance
- Test requirements
- Demo criteria

Progress checklist included at top of file.

## Quick Start for Implementation

1. Start with **Step 0**: Rename Gascountry → Ralphtown
2. Then **Step 1**: Restructure to monorepo
3. Follow steps sequentially - each builds on previous
4. Core E2E functionality ready by **Step 12**
5. Distribution/polish in **Steps 13-16**
