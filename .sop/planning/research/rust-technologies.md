# Rust Technologies Research

## WebSocket Libraries

### Recommendation: **Axum**

| Library | Async | WebSocket Support | Notes |
|---------|-------|-------------------|-------|
| **Axum** | Yes (Tokio) | Built-in via `axum::extract::ws` | Best balance of ergonomics + performance |
| Actix Web | Yes | Excellent | Highest performance, more complex |
| Warp | Yes (Tokio) | Yes | Composable filters, smaller ecosystem |
| tokio-tungstenite | Yes | Low-level | Good for custom implementations |

**Why Axum:**
- Part of the Tokio project - excellent integration
- Nearly identical performance to Actix with lower memory
- Intuitive router-centric design
- Built-in WebSocket support (uses tungstenite internally)
- Best documentation and community support for newcomers

### Sources
- [Rust Web Frameworks Compared](https://dev.to/leapcell/rust-web-frameworks-compared-actix-vs-axum-vs-rocket-4bad)
- [Rust Web Framework Comparison GitHub](https://github.com/flosse/rust-web-framework-comparison)
- [LogRocket: Top Rust Web Frameworks](https://blog.logrocket.com/top-rust-web-frameworks/)

---

## Cross-Platform Service Installation

### Recommendation: **service-manager**

| Crate | Platforms | Features |
|-------|-----------|----------|
| **service-manager** | macOS (launchd), Linux (systemd), Windows | install/uninstall/start/stop, user & system level |
| uni_service_manager | macOS, Linux, Windows | Similar feature set |
| cross-platform-service | macOS, Linux, Windows | Uses windows-rs, D-Bus for systemd |

**Why service-manager:**
- Most actively maintained (Feb 2025)
- Unified API across platforms
- Supports both user-level and system-level services
- RestartPolicy enum for controlling restart behavior

```rust
use service_manager::{ServiceManager, ServiceInstallCtx};

let manager = ServiceManager::native()?;
manager.install(ServiceInstallCtx {
    label: "com.gascountry.backend".into(),
    program: program_path,
    args: vec!["--serve".into()],
    ..Default::default()
})?;
```

### Sources
- [service-manager crate](https://crates.io/crates/service-manager)
- [uni_service_manager crate](https://crates.io/crates/uni_service_manager)

---

## Process Management (Tokio)

### Key Patterns

**Spawning with output capture:**
```rust
use tokio::process::Command;
use std::process::Stdio;

let mut child = Command::new("ralph")
    .arg("run")
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()?;

let stdout = child.stdout.take().unwrap();
```

**Streaming output line by line:**
```rust
use tokio::io::{BufReader, AsyncBufReadExt};

let reader = BufReader::new(stdout);
let mut lines = reader.lines();

while let Some(line) = lines.next_line().await? {
    // Stream to WebSocket
    ws.send(Message::Text(line)).await?;
}
```

**Kill on drop:**
```rust
Command::new("ralph")
    .kill_on_drop(true)  // Auto-kill if handle dropped
    .spawn()?;
```

### Sources
- [Tokio Process Documentation](https://docs.rs/tokio/latest/tokio/process/index.html)
- [Tokio Child Documentation](https://docs.rs/tokio/latest/tokio/process/struct.Child.html)

---

## SQLite

### Recommendation: **rusqlite** (synchronous) or **SQLx** (if async needed elsewhere)

| Library | Async | Compile-time checks | Notes |
|---------|-------|---------------------|-------|
| **rusqlite** | Via rusqlite-tokio | No | Low-level, simple, bundles SQLite |
| SQLx | Native | Yes (requires DB) | Async-first, raw SQL |
| Diesel | Via diesel_async | Yes (via DSL) | Full ORM, steeper learning curve |

**Rationale:**
- SQLite is inherently synchronous - async wrappers add overhead
- For local-only app, rusqlite is simpler and sufficient
- If we need async for other DB operations later, SQLx is good choice

```rust
use rusqlite::{Connection, params};

let conn = Connection::open("gascountry.db")?;
conn.execute(
    "CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY,
        repo_path TEXT NOT NULL,
        created_at TEXT NOT NULL
    )",
    [],
)?;
```

### Sources
- [SQLx vs Diesel Comparison](https://blog.logrocket.com/interacting-databases-rust-diesel-vs-sqlx/)
- [Diesel vs SQLx Comparison](https://infobytes.guru/articles/rust-orm-comparison-sqlx-diesel.html)

---

## Git Integration

### Recommendation: **git2** for programmatic operations, **CLI subprocess** for user-initiated commands

| Approach | Pros | Cons |
|----------|------|------|
| **git2** | Type-safe, better error handling, faster | Learning curve, libgit2 dependency |
| CLI subprocess | Full feature support, familiar | Error-prone, string parsing |
| gitoxide | Pure Rust, no C deps | Not feature complete |

**Hybrid Strategy:**
- Use **git2** for: status, log, branch listing, diff stats
- Use **CLI subprocess** for: push, pull, reset --hard, commit (simpler, matches user expectation)

```rust
use git2::Repository;

let repo = Repository::open(&repo_path)?;
let statuses = repo.statuses(None)?;

for entry in statuses.iter() {
    println!("{}: {:?}", entry.path().unwrap(), entry.status());
}
```

### Sources
- [git2-rs GitHub](https://github.com/rust-lang/git2-rs)
- [gitoxide GitHub](https://github.com/GitoxideLabs/gitoxide)
- [Using git2 in debcargo](https://copyninja.in/blog/using-git2-debcargo.html)
