# Phase 2: Core Clone - Research

**Researched:** 2026-01-17
**Domain:** Git clone integration (git2 library + frontend UI)
**Confidence:** HIGH

## Summary

This phase implements the ability to clone repositories from git URLs to a default location (`~/ralphtown/`). The codebase already uses `git2` for read operations and git CLI for write operations. Clone is unique in that it creates a new local repo, so it fits naturally with git2's `RepoBuilder` API which handles both network fetch and local checkout.

The existing architecture provides clear patterns:
- Frontend: Dialog components using shadcn/ui (`Dialog`, `DialogContent`, etc.) with React Query mutations
- Backend: Axum handlers in `backend/src/api/repos.rs` that validate git repos with git2 and insert into SQLite
- Git operations: `backend/src/git/mod.rs` uses git2 for reads, CLI for credential-dependent writes

**Primary recommendation:** Use git2's `RepoBuilder` with `RemoteCallbacks` for clone, implementing progress tracking via WebSocket messages. Parse git URLs manually (simple regex for SSH/HTTPS) rather than adding a new dependency.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Cargo.toml)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| git2 | 0.20 | Git clone/fetch operations | Already used for all git read ops |
| dirs | 6 | Home directory expansion | Already used for app data directory |
| tokio | 1.x | Async runtime for clone operation | Already the project's async runtime |

### Supporting (Already in Cargo.toml)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| thiserror | 2 | Error types for clone failures | Extend existing GitError enum |
| serde | 1 | Clone request/response serialization | Already used for all API types |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual URL parsing | git-url-parse crate | Adds dependency for simple task; manual regex sufficient |
| git2 clone | git CLI subprocess | Would use same credential approach as push/pull; but git2 gives progress callbacks |
| shellexpand | dirs::home_dir() | Already have dirs; shellexpand adds dep for tilde expansion only |

**No new dependencies required.** The existing stack handles all needs.

## Architecture Patterns

### Recommended Project Structure
```
backend/src/
  api/
    repos.rs         # Add clone_repo handler here (follows existing pattern)
  git/
    mod.rs           # Add clone() function here (follows existing pattern)
frontend/src/
  components/ralphtown/
    RepoSelector.tsx # Add "Clone from URL" menu item
    CloneDialog.tsx  # NEW: Clone dialog component (follows SettingsDialog pattern)
  api/
    client.ts        # Add cloneRepo() function
    hooks.ts         # Add useCloneRepo() mutation hook
    types.ts         # Add CloneRepoRequest/Response types
```

### Pattern 1: Clone Dialog Component
**What:** Modal dialog for entering git URL and initiating clone
**When to use:** When user clicks "Clone from URL" in repo selector dropdown
**Example:**
```typescript
// Follow existing Dialog pattern from RepoSelector.tsx
<Dialog open={isCloneOpen} onOpenChange={setIsCloneOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Clone from URL</DialogTitle>
      <DialogDescription>
        Enter a git URL (SSH or HTTPS) to clone.
      </DialogDescription>
    </DialogHeader>
    <Input
      value={gitUrl}
      onChange={(e) => setGitUrl(e.target.value)}
      placeholder="https://github.com/user/repo.git"
    />
    <DialogFooter>
      <Button onClick={handleClone} disabled={cloneRepo.isPending}>
        {cloneRepo.isPending ? "Cloning..." : "Clone"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Pattern 2: Backend Clone Endpoint
**What:** POST endpoint that clones a repo and returns the new Repo record
**When to use:** When frontend initiates clone
**Example:**
```rust
// backend/src/api/repos.rs - follows existing add_repo pattern

#[derive(Debug, Deserialize, Serialize)]
pub struct CloneRepoRequest {
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloneRepoResponse {
    pub repo: Repo,
    pub message: String,
}

async fn clone_repo(
    State(state): State<AppState>,
    Json(req): Json<CloneRepoRequest>,
) -> AppResult<Json<CloneRepoResponse>> {
    // 1. Parse URL to extract repo name
    let repo_name = extract_repo_name(&req.url)?;

    // 2. Build destination path: ~/ralphtown/{repo_name}
    let home = dirs::home_dir().ok_or(AppError::Internal("No home dir".into()))?;
    let dest = home.join("ralphtown").join(&repo_name);

    // 3. Check if already exists
    if dest.exists() {
        return Err(AppError::BadRequest(format!("Directory already exists: {}", dest.display())));
    }

    // 4. Create parent directory if needed
    std::fs::create_dir_all(dest.parent().unwrap())?;

    // 5. Clone using git2
    GitManager::clone(&req.url, &dest)?;

    // 6. Insert into database (follows add_repo pattern)
    let repo = state.db.insert_repo(
        dest.to_string_lossy().as_ref(),
        &repo_name,
    )?;

    Ok(Json(CloneRepoResponse {
        repo,
        message: format!("Cloned to {}", dest.display()),
    }))
}
```

### Pattern 3: git2 Clone with RepoBuilder
**What:** Use git2's RepoBuilder for clone with optional progress callbacks
**When to use:** In GitManager for clone operation
**Example:**
```rust
// backend/src/git/mod.rs

impl GitManager {
    /// Clone a repository from URL to destination path
    pub fn clone(url: &str, dest: &Path) -> GitResult<git2::Repository> {
        // For initial implementation: simple clone without auth
        // Auth callbacks can be added in Phase 3
        let repo = git2::build::RepoBuilder::new()
            .clone(url, dest)
            .map_err(|e| GitError::OperationFailed(format!("Clone failed: {}", e.message())))?;

        Ok(repo)
    }
}
```

### Anti-Patterns to Avoid
- **Blocking the async runtime:** Clone is potentially long-running; use `tokio::task::spawn_blocking`
- **Hardcoding paths:** Use `dirs::home_dir()` not `~` string literal
- **Skipping validation:** Validate URL format before attempting clone
- **Silent overwrites:** Check if destination exists before cloning

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git clone | Shell out to `git clone` | `git2::build::RepoBuilder` | Progress callbacks, error handling, no subprocess |
| Home directory | Parse `~` manually | `dirs::home_dir()` | Cross-platform, already in deps |
| Async clone | Run git2 on async executor | `tokio::task::spawn_blocking` | git2 is not async, blocks thread |
| URL validation | Complex regex | Simple prefix check | Only need to reject obviously invalid URLs |

**Key insight:** The codebase already uses git2 for reads and the pattern of mixing git2 (for read-like ops) with git CLI (for credential-heavy ops) is established. Clone fits with git2 because it's primarily a fetch+checkout, and for Phase 2 we target public repos or repos where credentials are already configured in the system.

## Common Pitfalls

### Pitfall 1: Blocking Async Runtime with git2
**What goes wrong:** git2 operations are synchronous and can take minutes for large repos
**Why it happens:** Calling git2 directly from async handler blocks the tokio runtime
**How to avoid:** Wrap clone in `tokio::task::spawn_blocking`
**Warning signs:** Server becomes unresponsive during clone

```rust
// WRONG - blocks async runtime
async fn clone_repo(...) {
    GitManager::clone(&url, &dest)?;  // This blocks!
}

// CORRECT - spawns blocking task
async fn clone_repo(...) {
    let url_clone = req.url.clone();
    let dest_clone = dest.clone();
    tokio::task::spawn_blocking(move || {
        GitManager::clone(&url_clone, &dest_clone)
    }).await??;
}
```

### Pitfall 2: Tilde in Paths Not Expanded
**What goes wrong:** User sees `~/ralphtown/repo` but backend tries to use literal `~`
**Why it happens:** File systems don't expand `~`; that's a shell feature
**How to avoid:** Always use `dirs::home_dir()` and `PathBuf::join()`
**Warning signs:** "File not found" errors with `~` in path

### Pitfall 3: Repo Name Extraction Edge Cases
**What goes wrong:** `repo.git` suffix not stripped, or URL without `.git` fails
**Why it happens:** Inconsistent URL formats (GitHub allows both with/without `.git`)
**How to avoid:** Handle both cases in extraction function

```rust
fn extract_repo_name(url: &str) -> Result<String, AppError> {
    // Handle: https://github.com/user/repo.git
    // Handle: https://github.com/user/repo
    // Handle: git@github.com:user/repo.git
    let name = url
        .trim_end_matches('/')
        .trim_end_matches(".git")
        .rsplit('/')
        .next()
        .or_else(|| url.rsplit(':').next())
        .ok_or_else(|| AppError::BadRequest("Invalid URL".into()))?
        .to_string();

    if name.is_empty() {
        return Err(AppError::BadRequest("Could not extract repo name".into()));
    }

    Ok(name)
}
```

### Pitfall 4: Destination Directory Already Exists
**What goes wrong:** Clone fails with confusing error or overwrites existing directory
**Why it happens:** git2 doesn't overwrite; gives generic error
**How to avoid:** Check existence explicitly before clone
**Warning signs:** User confusion about why clone failed

## Code Examples

Verified patterns from official sources and codebase:

### git2 RepoBuilder Clone
```rust
// Source: https://docs.rs/git2/latest/git2/build/struct.RepoBuilder.html
use git2::build::RepoBuilder;

let repo = RepoBuilder::new()
    .clone("https://github.com/user/repo.git", Path::new("/path/to/dest"))?;
```

### Home Directory with dirs crate
```rust
// Source: Existing codebase backend/src/db/mod.rs:142
use dirs;

let home = dirs::home_dir().ok_or(DbError::NoDataDir)?;
let path = home.join("ralphtown").join(repo_name);
```

### React Query Mutation Pattern
```typescript
// Source: Existing codebase frontend/src/api/hooks.ts
export function useCloneRepo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CloneRepoRequest) => api.cloneRepo(req),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repos });
    },
  });
}
```

### Dialog Component Pattern
```typescript
// Source: Existing codebase frontend/src/components/ralphtown/RepoSelector.tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Component uses useState for open state, Input for text entry,
// Button with disabled={mutation.isPending} for submit
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Shell out to `git clone` | Use git2 RepoBuilder | N/A (project choice) | Better error handling, progress callbacks |
| env::var("HOME") | dirs::home_dir() | dirs crate standard | Cross-platform support |

**Deprecated/outdated:**
- Nothing deprecated relevant to this phase

## Open Questions

Things that couldn't be fully resolved:

1. **Progress reporting during clone**
   - What we know: git2 provides `transfer_progress` callback for download progress
   - What's unclear: Best UX for showing progress (polling vs WebSocket vs simple "Cloning...")
   - Recommendation: Start with simple "Cloning..." state in Phase 2; add WebSocket progress in Phase 3

2. **Authentication for private repos**
   - What we know: git2 provides `credentials` callback for auth
   - What's unclear: How to prompt user for credentials from frontend
   - Recommendation: Phase 2 targets public repos; Phase 3 adds auth prompts per PROJECT.md

3. **Clone timeout/cancellation**
   - What we know: Clone can take a long time; user may want to cancel
   - What's unclear: git2 doesn't have built-in cancellation
   - Recommendation: Out of scope for Phase 2; could add cancel via dropping the task handle later

## Sources

### Primary (HIGH confidence)
- git2 crate documentation: https://docs.rs/git2/latest/git2/
- git2 RepoBuilder: https://docs.rs/git2/latest/git2/build/struct.RepoBuilder.html
- git2-rs clone example: https://github.com/rust-lang/git2-rs/blob/master/examples/clone.rs
- Existing codebase patterns in `backend/src/git/mod.rs`, `backend/src/api/repos.rs`

### Secondary (MEDIUM confidence)
- git2 RemoteCallbacks: https://docs.rs/git2/latest/git2/struct.RemoteCallbacks.html
- git-url-parse crate (for URL parsing patterns): https://docs.rs/git-url-parse/latest/git_url_parse/
- dirs crate: https://crates.io/crates/dirs

### Tertiary (LOW confidence)
- None - all findings verified with official docs or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - already in Cargo.toml, no new deps needed
- Architecture: HIGH - follows existing codebase patterns exactly
- Pitfalls: HIGH - verified with official git2 docs and async Rust patterns

**Research date:** 2026-01-17
**Valid until:** 30 days (stable domain, no fast-moving deps)

---

## RESEARCH COMPLETE

**Phase:** 2 - Core Clone
**Confidence:** HIGH

### Key Findings

1. **No new dependencies needed** - git2 0.20 and dirs 6 already in Cargo.toml support all clone requirements
2. **Follow existing patterns exactly** - Dialog UI from RepoSelector.tsx, API from repos.rs, git ops from git/mod.rs
3. **Use spawn_blocking for clone** - git2 is synchronous, must not block async runtime
4. **Simple URL parsing sufficient** - Don't need git-url-parse crate; regex for SSH/HTTPS works
5. **Phase 2 targets public repos** - Credential handling deferred to Phase 3

### File Created

`/Users/peterryszkiewicz/Repos/gascountry-ui/.planning/phases/02-core-clone/02-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All deps already in project |
| Architecture | HIGH | Follows existing codebase patterns |
| Pitfalls | HIGH | Verified with official git2 docs |

### Open Questions

- Progress UI: Simple "Cloning..." vs WebSocket progress (recommend simple for Phase 2)
- Auth for private repos: Deferred to Phase 3 per PROJECT.md

### Ready for Planning

Research complete. Planner can now create PLAN.md files.
