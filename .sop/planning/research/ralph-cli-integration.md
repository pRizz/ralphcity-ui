# Ralph CLI Integration Research

## Overview

Ralph Orchestrator is a Rust-based multi-agent orchestration framework. It coordinates specialized AI agents through an event-driven architecture, keeping them in a loop until tasks complete.

## CLI Commands

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `ralph run` | Execute orchestration loop | `-p/--prompt`, `--autonomous`, `--max-iterations` |
| `ralph resume` | Continue from scratchpad | `--max-iterations`, `-a/--autonomous` |
| `ralph plan` | Interactive PDD session | `-b/--backend` |
| `ralph task` | Code task generation | `-b/--backend` |
| `ralph events` | View event history | `--last N`, `--topic`, `--format` |
| `ralph clean` | Remove .agent/ directory | `--dry-run` |
| `ralph init` | Initialize configuration | `--preset`, `--backend` |
| `ralph emit` | Publish event to log | `<TOPIC> <PAYLOAD>` |

## Programmatic Invocation

### Key Invocation Pattern
```rust
let mut cmd = Command::new("ralph");
cmd.arg("run")
   .arg("--config").arg("ralph.yml")
   .arg("--prompt").arg(prompt_text)
   .arg("--autonomous")  // Headless mode (no TTY required)
   .current_dir(&working_dir)
   .stdout(Stdio::piped())
   .stderr(Stdio::piped());
```

### Process Group Management (Critical for Interrupts)
```rust
#[cfg(unix)]
unsafe {
    cmd.pre_exec(|| {
        nix::unistd::setpgid(Pid::from_raw(0), Pid::from_raw(0))
    });
}
```

This makes Ralph the process group leader, allowing us to signal the entire group.

## Output Handling

### Output Types
1. **Console logs** - stdout/stderr from CLI and underlying AI backend
2. **Events** - Written to `.agent/events.jsonl` as newline-delimited JSON
3. **Scratchpad** - Shared state at `.agent/scratchpad.md`
4. **Session recordings** - Full execution logs in `.agent/sessions/`

### Event Format (JSONL)
```json
{
  "topic": "build.done",
  "payload": "Task completed\nTests pass",
  "source": "builder-hat",
  "iteration": 5,
  "timestamp": "2024-01-17T10:30:45Z"
}
```

### Exit Codes
- `0` - Success
- `1` - Execution error
- `130` - User interrupt (Ctrl+C)
- `2` - Configuration error

## Interrupt/Cancel Handling

### Signal Flow
1. Send SIGTERM to process group: `kill(-child_pid, SIGTERM)`
2. Wait 5 seconds for graceful shutdown
3. If still running, send SIGKILL: `kill(-child_pid, SIGKILL)`

```rust
nix::sys::signal::kill(
    Pid::from_raw(-(child.id() as i32)),  // Negative = process group
    Signal::SIGTERM
)?;
tokio::time::sleep(Duration::from_secs(5)).await;
nix::sys::signal::kill(
    Pid::from_raw(-(child.id() as i32)),
    Signal::SIGKILL
)?;
```

### State Preservation
- Scratchpad saved at each iteration
- Git checkpoint every N iterations
- Can resume with `ralph resume`

## Configuration

### File: `ralph.yml`
```yaml
event_loop:
  prompt_file: "PROMPT.md"
  completion_promise: "TASK_COMPLETE"
  max_iterations: 100
  max_runtime_seconds: 14400

cli:
  backend: "claude"  # claude|kiro|gemini|codex|amp
  prompt_mode: "arg"
  default_mode: "autonomous"

core:
  scratchpad: ".agent/scratchpad.md"
  specs_dir: "specs/"
```

### Environment Variables
All config can be overridden via `RALPH_` prefix:
- `RALPH_BACKEND=claude`
- `RALPH_MAX_ITERATIONS=50`
- `RALPH_CONFIG=custom/ralph.yml`

## Directory Structure Created by Ralph

```
project/
├── ralph.yml
├── PROMPT.md
└── .agent/
    ├── scratchpad.md
    ├── events.jsonl
    ├── state_latest.json
    ├── sessions/
    └── checkpoints/
```

## Integration Recommendations

1. **Use `--autonomous` flag** - Ensures headless operation without TTY
2. **Stream stdout in real-time** - Ralph outputs continuous logs
3. **Monitor events.jsonl** - File watcher for structured events
4. **Process group signals** - Required for clean interrupts
5. **Check scratchpad before resume** - Understand current state
