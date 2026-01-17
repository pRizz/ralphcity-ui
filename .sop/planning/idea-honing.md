# Idea Honing: Ralph CLI Integration

This document captures the requirements clarification process through Q&A.

---

## Q1: Deployment Architecture

**Question:** How do you envision the backend being deployed? Specifically:

- **Option A: Local-only** - The UI and ralph CLI run on the user's local machine (e.g., Electron app, or localhost web server)
- **Option B: Server-based** - A backend server runs ralph on behalf of users (could be self-hosted or cloud)
- **Option C: Hybrid** - UI connects to a local ralph instance running on the user's machine via localhost

This affects security considerations, how we handle file system access, and authentication requirements.

**Answer:** Option A (Local-only) for initial implementation, but architecture should be designed to make Option B (Server-based) easy to plug in later. This means abstracting the ralph CLI interaction behind an API layer that could be swapped out for remote calls.

---

## Q2: Ralph Command Mapping

**Question:** Which ralph commands should the UI support initially?

Ralph offers several commands:
- `ralph run` - Execute orchestration loop autonomously (takes a PROMPT.md or inline prompt)
- `ralph resume` - Continue from existing scratchpad state
- `ralph plan` - Interactive PDD session for planning
- `ralph task` - Interactive code task generation
- `ralph events` - View event history
- `ralph clean` - Remove .agent/ directory

Should the UI:
- **Option A:** Focus on `ralph run` only - user sends a prompt, ralph executes it
- **Option B:** Support `run` + `resume` - allow continuing previous sessions
- **Option C:** Full support - expose most/all ralph commands through the UI
- **Option D:** Other combination (please specify)

**Answer:** Option C - Full support. The UI should expose most/all ralph commands (`run`, `resume`, `plan`, `task`, `events`, `clean`) through the interface.

---

## Q3: Conversation Model

**Question:** How should conversations map to ralph executions?

Currently, the UI has a chat-style interface where users send messages and receive responses. Ralph operates differently - it runs autonomously until a task completes, outputting logs/events along the way.

How should this work:
- **Option A: One-shot per message** - Each user message triggers a new `ralph run`, ralph completes, then user can send another message (triggers another run)
- **Option B: Persistent session** - A conversation maps to a single ralph session. First message starts `ralph run`, subsequent messages use `ralph resume` or inject into the running session
- **Option C: Explicit control** - User explicitly chooses when to "run", "resume", or start fresh. Messages are composed before execution
- **Option D: Other model (please describe)

**Answer:** Option A (One-shot per message) with enhancements:
- User initiates a ralph run and must wait for completion before sending another message
- User can send an interrupt/cancel command to stop ralph mid-execution if they see undesirable output in the logs
- Additionally, provide UI buttons for basic git commands (git status, git reset --hard, etc.) so users can manage repo state without leaving the interface

---

## Q4: Output Display

**Question:** How should ralph's output be displayed in the UI?

Ralph produces various types of output during execution:
- Console logs (stdout/stderr from the CLI)
- Event emissions (structured events like `build.done`, `test.pass`)
- File changes (diffs, new files created)
- Scratchpad updates (task progress tracking)

How should this be presented:
- **Option A: Unified stream** - All output shown as a single scrolling log in the chat area
- **Option B: Tabbed/sectioned view** - Separate tabs or collapsible sections for logs, events, file changes, etc.
- **Option C: Chat-style with expandable details** - High-level status messages in chat format, with expandable sections for detailed logs/diffs
- **Option D: Other preference (please describe)

**Answer:** Simplified display:
- Primary view: Console logs (stdout/stderr stream)
- Secondary: Basic file changes tab/list showing only file names with delta counts (green for additions, red for deletions)
- No in-depth code change inspection or detailed diffs needed - just file names and basic +/- numbers

---

## Q5: Repository Selection

**Question:** How should the user specify which repository ralph operates on?

The current UI has a repo selector dropdown with mock data. For ralph integration:
- **Option A: Directory picker** - User selects/enters a local directory path where ralph will run
- **Option B: Pre-configured list** - Admin/user configures a list of allowed repo paths in settings, then selects from dropdown
- **Option C: Recent + manual entry** - Show recently used directories plus ability to type/browse for new paths
- **Option D: Other approach (please describe)

Note: Since we're doing local-only initially, this would be local filesystem paths rather than GitHub URLs.

**Answer:** Hybrid approach:
- User can either connect to a local repo on their filesystem OR clone from a URL
- Pre-configured list of local repo paths that the UI can scan/find for easy dropdown selection
- **Constraint:** Maximum of 1 ralph instance per repo at a time (prevents conflicts)

---

## Q6: Backend Technology

**Question:** What technology should the backend server use?

Since we need a local server to bridge the UI and ralph CLI, options include:
- **Option A: Node.js/Express** - JavaScript ecosystem, easy integration with the existing React frontend, good process spawning support
- **Option B: Rust** - Match ralph's technology, potentially faster, but more complex setup
- **Option C: Python/FastAPI** - Simple, good subprocess handling, easy WebSocket support
- **Option D: Bun** - Fast JavaScript runtime, built-in server, modern tooling
- **Option E: Other preference (please specify)

**Answer:** Option B - Rust. Matches ralph's technology stack, provides performance benefits, and maintains consistency across the backend tooling.

---

## Q7: Real-time Communication

**Question:** How should the frontend receive real-time updates from ralph execution?

Ralph can run for extended periods. To stream output to the UI:
- **Option A: WebSockets** - Persistent bidirectional connection, real-time streaming, supports interrupt/cancel signals
- **Option B: Server-Sent Events (SSE)** - Simpler one-way streaming from server to client, would need separate endpoint for cancel
- **Option C: Polling** - Frontend periodically requests updates, simpler but less responsive
- **Option D: Other preference (please specify)

**Answer:** Option A - WebSockets. Enables persistent bidirectional connection for real-time log streaming and supports sending interrupt/cancel signals from the UI.

---

## Q8: Configuration & Presets

**Question:** How should ralph configuration be managed?

Ralph supports various presets (tdd-red-green, spec-driven, debug, code-review, etc.) and configuration options (AI backend, max iterations, completion promises).

Should users be able to:
- **Option A: Minimal config** - Sensible defaults, maybe just AI backend selection. Keep it simple.
- **Option B: Preset selection** - Allow choosing from ralph's built-in presets via UI dropdown
- **Option C: Full configuration UI** - Expose most ralph config options (presets, max iterations, backend, etc.) through settings panel
- **Option D: Config file based** - Users edit a config file directly, UI just uses whatever is configured

**Answer:** Hybrid of A and C - Sensible defaults out of the box for simplicity, but expose advanced configuration options (presets, max iterations, AI backend, etc.) for power users who want deeper control. Progressive disclosure pattern.

---

## Q9: Persistence & History

**Question:** How should session history and state be persisted?

When a user closes the app and reopens it:
- **Option A: No persistence** - Fresh start each time, ralph's own scratchpad/state in the repo is the only history
- **Option B: Local storage** - Save session history, conversation logs, and recent repos in browser localStorage or a local file
- **Option C: Database** - SQLite or similar for structured storage of sessions, logs, and configuration
- **Option D: Other approach (please describe)

**Answer:** Option C - SQLite database for structured storage of sessions, conversation logs, configuration, and recent repos.

---

## Q10: Git Commands

**Question:** You mentioned providing UI buttons for basic git commands. Which commands should be included?

Some reasonable options:
- `git status` - View current state
- `git diff` - See uncommitted changes
- `git reset --hard` - Discard all changes
- `git checkout .` - Discard working directory changes
- `git stash` / `git stash pop` - Temporarily save/restore changes
- `git log` (recent) - View commit history
- `git pull` - Fetch and merge updates
- `git push` - Push commits to remote
- `git branch` - List/switch branches
- `git commit` - Commit staged changes

Which of these (or others) should be included? Should any have confirmation dialogs (e.g., reset --hard)?

**Answer:** Include the following git commands:
- `git status`
- `git reset --hard` (should have confirmation dialog - destructive)
- `git log` (recent commits)
- `git pull`
- `git push`
- `git branch` (list/switch)
- `git commit`

---

## Q11: MVP Scope

**Question:** What should be included in the minimum viable product (MVP) vs deferred to later iterations?

Based on our discussion, the full feature set includes:
1. Rust backend with WebSocket communication
2. All ralph commands (run, resume, plan, task, events, clean)
3. Console log streaming + file delta display
4. Git command buttons (status, reset, log, pull, push, branch, commit)
5. Repo selection (local path + clone from URL)
6. SQLite persistence
7. Advanced configuration for power users
8. Interrupt/cancel during execution

For MVP, would you prefer:
- **Option A: Full scope** - Build everything before first usable release
- **Option B: Core first** - Start with `ralph run` + console streaming + basic repo selection, add other features incrementally
- **Option C: Specific subset** - You tell me which features are must-haves for v1

**Answer:** Option A - Full scope. Build all features before first release:
- Rust backend with WebSocket communication
- All ralph commands (run, resume, plan, task, events, clean)
- Console log streaming + file delta display
- Git command buttons (status, reset --hard, log, pull, push, branch, commit)
- Repo selection (local path + clone from URL)
- SQLite persistence
- Advanced configuration for power users
- Interrupt/cancel during execution

---

## Q12: Project Structure

**Question:** Should the Rust backend live in the same repository as the frontend, or in a separate repo?

- **Option A: Monorepo** - Single repo with `/frontend` and `/backend` directories. Easier to keep in sync, single versioning.
- **Option B: Separate repos** - Frontend stays here (gascountry-ui), backend in a new repo (e.g., gascountry-backend). Independent versioning and deployment.

**Answer:** Option A - Monorepo. Single repository with `/frontend` and `/backend` directories for easier synchronization and unified versioning.

---

## Q13: Installation & Service Management

**Question:** How should installation and service management work?

**Answer:**
- **Easy installation** via `cargo install` - single command to get up and running
- **Native service installation** - use platform-specific patterns:
  - macOS: launchd (LaunchAgent/LaunchDaemon)
  - Linux: systemd
  - Windows: Windows Service
- **Run on startup** - optional, user can enable to have the backend start when computer boots
- **Easy disable/uninstall** - accessible through settings UI or command line, allowing users to:
  - Disable the service (stop auto-start)
  - Completely uninstall the service
- Should be seamless and not require manual terminal commands for non-technical users