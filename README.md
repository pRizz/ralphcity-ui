# Ralphtown

[![GitHub](https://img.shields.io/badge/GitHub-Source%20Code-blue?logo=github)](https://github.com/pRizz/ralphtown)

A web-based UI for the [Ralph CLI](https://github.com/anthropics/ralph) orchestrator, enabling users to interact with AI coding agents through a browser.

## Features

- **Real-time streaming output** from Ralph executions via WebSocket
- **Repository management** - Add local repos or scan directories
- **Session management** - Create, run, and track multiple sessions
- **Git operations** - Status, branches, pull, push, commit, reset from the UI
- **Configuration** - Choose AI backend, preset, and other settings
- **Service installation** - Run as a system service (launchd/systemd)
- **Single binary deployment** - Frontend embedded in Rust binary

## Requirements

- [Rust](https://rustup.rs/) 1.75+ (for building)
- [Node.js](https://nodejs.org/) 18+ (for frontend development only)
- [Ralph CLI](https://github.com/anthropics/ralph) installed and in PATH

## Installation

### From Source (Recommended)

```bash
# Clone the repository
git clone https://github.com/pRizz/ralphtown.git
cd ralphtown

# Build the frontend
cd frontend && npm install && npm run build && cd ..

# Install the binary
cargo install --path backend

# Run the server
ralphtown serve
```

The server starts at `http://localhost:3000` with the frontend embedded.

### Development Mode

For frontend development with hot reload:

```bash
# Terminal 1: Run backend
cargo run --manifest-path backend/Cargo.toml

# Terminal 2: Run frontend dev server
cd frontend && npm run dev
```

Frontend dev server runs at `http://localhost:5173` and proxies API calls to backend.

## CLI Commands

```
ralphtown serve      # Start the server (default, port 3000)
ralphtown install    # Install as system service
ralphtown uninstall  # Remove system service
ralphtown start      # Start the installed service
ralphtown stop       # Stop the installed service
ralphtown status     # Show service status
ralphtown --help     # Show help
```

### Service Installation

Ralphtown can run as a background service that starts automatically:

- **macOS**: LaunchAgent (`~/Library/LaunchAgents/com.ralphtown.server.plist`)
- **Linux**: systemd user service (`~/.config/systemd/user/com.ralphtown.server.service`)
- **Windows**: Windows Service

```bash
# Install and start
ralphtown install
ralphtown start

# Check status
ralphtown status

# Remove
ralphtown stop
ralphtown uninstall
```

## Usage

1. **Add a repository**: Click the "+" button in the sidebar to add a local git repository
2. **Create a session**: Select a repo and click "New Session"
3. **Run Ralph**: Enter a prompt and click "Run" to start an AI coding session
4. **Monitor output**: Watch real-time streaming output in the console panel
5. **Git operations**: Use the git panel to view status, commit changes, push, etc.
6. **Cancel**: Click "Cancel" to stop a running session

## Configuration

Access settings via the gear icon in the sidebar:

| Setting | Description | Default |
|---------|-------------|---------|
| AI Backend | `claude`, `bedrock`, or `vertex` | `claude` |
| Preset | Workflow preset (default, tdd-red-green, feature, debug, refactor, review) | `default` |
| Max Iterations | Maximum Ralph iterations per run | `100` |
| Scan Directories | Paths to scan for git repositories | - |

## API Endpoints

### Repositories
- `GET /api/repos` - List all repositories
- `POST /api/repos` - Add a repository `{ "path": "/path/to/repo" }`
- `DELETE /api/repos/{id}` - Remove a repository
- `POST /api/repos/scan` - Scan directories for git repos

### Sessions
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create session `{ "repo_id": "uuid" }`
- `GET /api/sessions/{id}` - Get session details with messages
- `DELETE /api/sessions/{id}` - Delete session
- `POST /api/sessions/{id}/run` - Run Ralph `{ "prompt": "..." }`
- `POST /api/sessions/{id}/cancel` - Cancel running session
- `GET /api/sessions/{id}/output` - Get stored output logs

### Git Operations
- `GET /api/sessions/{id}/git/status` - Repository status
- `GET /api/sessions/{id}/git/log` - Commit history
- `GET /api/sessions/{id}/git/branches` - List branches
- `GET /api/sessions/{id}/git/diff` - Diff statistics
- `POST /api/sessions/{id}/git/pull` - Pull changes
- `POST /api/sessions/{id}/git/push` - Push changes
- `POST /api/sessions/{id}/git/commit` - Commit `{ "message": "..." }`
- `POST /api/sessions/{id}/git/checkout` - Switch branch `{ "branch": "..." }`
- `POST /api/sessions/{id}/git/reset` - Reset hard `{ "confirm": true }`

### Configuration
- `GET /api/config` - Get all config
- `PUT /api/config` - Update config
- `GET /api/config/presets` - List available presets
- `GET /api/config/backends` - List available AI backends

### WebSocket
- `GET /api/ws` - WebSocket endpoint for real-time output streaming

## Tech Stack

**Backend:**
- Rust with Axum web framework
- SQLite for persistence (rusqlite)
- WebSocket support via tokio
- git2 for git operations

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- TanStack Query for data fetching
- shadcn/ui components
- Tailwind CSS

## Data Storage

Ralphtown stores data in platform-specific locations:

- **macOS**: `~/Library/Application Support/ralphtown/ralphtown.db`
- **Linux**: `~/.local/share/ralphtown/ralphtown.db`
- **Windows**: `%APPDATA%\ralphtown\ralphtown.db`

## Troubleshooting

### "Ralph not found"
Ensure the `ralph` CLI is installed and in your PATH:
```bash
which ralph  # Should show path to ralph binary
```

### Database errors
Delete the database file to reset:
```bash
rm ~/.local/share/ralphtown/ralphtown.db  # Linux
rm ~/Library/Application\ Support/ralphtown/ralphtown.db  # macOS
```

### Port already in use
Another instance may be running. Check for existing processes:
```bash
lsof -i :3000
```

## License

MIT
