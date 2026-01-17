# Phase 5: Authentication - Research

**Researched:** 2026-01-17
**Domain:** git2 credential callbacks, SSH/HTTPS authentication
**Confidence:** HIGH

## Summary

This phase implements credential prompting when git authentication fails. The core mechanism is git2's `RemoteCallbacks::credentials()` callback, which libgit2 invokes when authentication is required. The callback receives credential type flags (`SSH_KEY`, `USER_PASS_PLAINTEXT`, etc.) indicating what the server accepts.

Key findings:
1. **git2 credential callbacks are well-documented** - The API uses `Cred::ssh_key()` for SSH with passphrase and `Cred::userpass_plaintext()` for HTTPS
2. **Infinite loop prevention is critical** - libgit2 repeatedly calls the callback until authentication succeeds or we return an error; state tracking is mandatory
3. **SSH key detection is file-based** - Check default paths in order; detect encryption by attempting to parse with ssh-key crate
4. **Retry architecture is straightforward** - Frontend sends new clone request with credentials included; no need to pause/resume

**Primary recommendation:** Implement a custom credential callback with state tracking, using the "new request with credentials" pattern for retry rather than pausing/resuming mid-clone.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| git2 | 0.20 | Git operations with credential callbacks | Already in use; provides RemoteCallbacks::credentials() |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ssh-key | latest | Parse SSH keys, detect encryption | Detecting if key needs passphrase before prompting |
| dirs | 6 | Home directory discovery | Finding ~/.ssh/ path |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual credential callback | auth-git2 crate | auth-git2 has Prompter trait for custom UIs, but adds dependency and may be overkill for our specific needs |
| Manual credential callback | git2_credentials crate | Similar to auth-git2, provides CredentialUI trait but terminal-focused by default |

**Installation:**
```bash
# Already have git2 and dirs; optionally add:
cargo add ssh-key
```

## Architecture Patterns

### Recommended API Contract

The frontend retry pattern uses a new clone request with credentials:

```typescript
// First attempt: no credentials
POST /repos/clone-progress?url=git@github.com:user/repo.git

// On auth failure, show credential UI, then retry with credentials:
POST /repos/clone-progress?url=git@github.com:user/repo.git
Body: {
  credentials: {
    type: "ssh_passphrase",
    passphrase: "user-provided-passphrase",
    key_path: "~/.ssh/id_ed25519"  // optional, use default if not provided
  }
}
// OR
Body: {
  credentials: {
    type: "github_pat",
    token: "ghp_xxxx"
  }
}
// OR
Body: {
  credentials: {
    type: "https_basic",
    username: "user",
    password: "pass"
  }
}
```

### Pattern 1: Stateful Credential Callback

**What:** Track authentication attempts to prevent infinite callback loops
**When to use:** Always when using git2 credential callbacks
**Example:**
```rust
// Source: Cargo/rustsec authentication pattern
// https://docs.rs/rustsec/0.15.1/src/rustsec/repository/authentication.rs.html

struct CredentialState {
    tried_ssh_agent: bool,
    tried_ssh_key: bool,
    tried_userpass: bool,
    passphrase: Option<String>,  // Provided by user for retry
    username: Option<String>,
    password: Option<String>,
}

let state = Rc::new(RefCell::new(CredentialState::default()));
let state_clone = Rc::clone(&state);

callbacks.credentials(move |_url, username_from_url, allowed| {
    let mut state = state_clone.borrow_mut();

    // SSH authentication
    if allowed.contains(git2::CredentialType::SSH_KEY) {
        if !state.tried_ssh_agent {
            state.tried_ssh_agent = true;
            let username = username_from_url.unwrap_or("git");
            return git2::Cred::ssh_key_from_agent(username);
        }

        if !state.tried_ssh_key {
            state.tried_ssh_key = true;
            let username = username_from_url.unwrap_or("git");
            let key_path = find_default_ssh_key()?;
            return git2::Cred::ssh_key(
                username,
                None,  // public key path (optional)
                &key_path,
                state.passphrase.as_deref(),  // None on first try, Some on retry
            );
        }
    }

    // HTTPS authentication
    if allowed.contains(git2::CredentialType::USER_PASS_PLAINTEXT) {
        if !state.tried_userpass {
            if let (Some(user), Some(pass)) = (&state.username, &state.password) {
                state.tried_userpass = true;
                return git2::Cred::userpass_plaintext(user, pass);
            }
        }
    }

    // All methods exhausted - return error to stop callback loop
    Err(git2::Error::from_str("authentication failed"))
});
```

### Pattern 2: SSH Key Path Discovery

**What:** Find default SSH keys in standard locations
**When to use:** When user hasn't specified a key path
**Example:**
```rust
// Source: SSH key standard paths from OpenSSH documentation
// https://wiki.archlinux.org/title/SSH_keys

fn find_default_ssh_key() -> Result<PathBuf, Error> {
    let home = dirs::home_dir()
        .ok_or_else(|| Error::msg("Could not find home directory"))?;
    let ssh_dir = home.join(".ssh");

    // Try keys in preference order (ed25519 is modern and fast)
    let key_names = ["id_ed25519", "id_ecdsa", "id_rsa"];

    for name in &key_names {
        let key_path = ssh_dir.join(name);
        if key_path.exists() {
            return Ok(key_path);
        }
    }

    Err(Error::msg("No SSH key found in ~/.ssh/"))
}
```

### Pattern 3: SSH Key Encryption Detection

**What:** Check if SSH key is encrypted before attempting to use it
**When to use:** To determine if we need to prompt for passphrase
**Example:**
```rust
// Source: OpenSSH key format detection
// Encrypted keys will fail to parse without passphrase

use std::fs;

fn is_ssh_key_encrypted(key_path: &Path) -> Result<bool, Error> {
    let content = fs::read_to_string(key_path)?;

    // Modern OpenSSH format (BEGIN OPENSSH PRIVATE KEY)
    // Check if bcrypt encryption is used (indicated by cipher name in header)
    if content.contains("-----BEGIN OPENSSH PRIVATE KEY-----") {
        // Try to parse without passphrase - if it fails, key is encrypted
        // Using ssh-key crate:
        match ssh_key::PrivateKey::from_openssh(&content) {
            Ok(_) => Ok(false),  // Parsed successfully, not encrypted
            Err(e) if e.to_string().contains("encrypted") ||
                      e.to_string().contains("passphrase") => Ok(true),
            Err(e) => Err(e.into()),  // Other error
        }
    }
    // Legacy PEM format
    else if content.contains("ENCRYPTED") ||
            content.contains("Proc-Type: 4,ENCRYPTED") {
        Ok(true)
    }
    else {
        Ok(false)
    }
}

// Alternative: simpler heuristic check for OpenSSH keys
fn is_key_likely_encrypted(key_path: &Path) -> Result<bool, Error> {
    let content = fs::read_to_string(key_path)?;

    // OpenSSH keys: check the binary blob for encryption indicators
    // The "none" cipher means unencrypted
    if content.contains("-----BEGIN OPENSSH PRIVATE KEY-----") {
        // Quick heuristic: encrypted keys are typically larger due to bcrypt salt
        // A more robust check would be to use the ssh-key crate
        // For now, assume encrypted if we can't parse it
        return Ok(!content.contains("none"));  // Rough heuristic
    }

    // PEM format: look for ENCRYPTED header
    Ok(content.contains("ENCRYPTED"))
}
```

### Pattern 4: GitHub Detection

**What:** Detect GitHub URLs for PAT-specific UI
**When to use:** Showing PAT-only input vs username/password
**Example:**
```rust
// Source: CONTEXT.md decision - simple host string match

fn is_github_url(url: &str) -> bool {
    // Handle both SSH and HTTPS formats
    // git@github.com:user/repo.git
    // https://github.com/user/repo.git
    url.contains("github.com")
}

fn get_auth_type(url: &str) -> AuthType {
    if url.starts_with("git@") || url.contains("ssh://") {
        AuthType::Ssh
    } else if is_github_url(url) {
        AuthType::GitHubPat
    } else {
        AuthType::HttpsBasic
    }
}
```

### Anti-Patterns to Avoid

- **No state tracking in callback:** Will cause infinite loop when auth fails
- **Trying ssh-agent after it already failed:** libgit2 keeps calling, must track `tried_ssh_agent`
- **Returning generic error without exhausting options:** Should try all valid credential types first
- **Blocking on user input inside callback:** Callback runs in blocking clone thread; can't await user input

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSH key parsing | Manual PEM parsing | ssh-key crate | Handles OpenSSH format, encryption detection, multiple key types |
| Home directory | Hardcoded paths | dirs crate | Cross-platform, handles edge cases |
| Credential state | Global mutable state | Rc<RefCell<State>> in closure | Thread-safe, scoped to single clone operation |

**Key insight:** The credential callback runs in a blocking context (`spawn_blocking`), so we cannot await async operations inside it. Credentials must be provided upfront via the request.

## Common Pitfalls

### Pitfall 1: Infinite Credential Callback Loop
**What goes wrong:** libgit2 keeps calling credential callback even after auth fails
**Why it happens:** libgit2 design - it asks for credentials repeatedly hoping different creds work
**How to avoid:** Track `tried_X` flags for each auth method; return `Err` when all exhausted
**Warning signs:** Clone hangs indefinitely, high CPU usage

### Pitfall 2: SSH Agent Already Tried
**What goes wrong:** Code tries ssh-agent on every callback invocation
**Why it happens:** Not tracking that ssh-agent was already attempted
**How to avoid:** Set `tried_ssh_agent = true` before first attempt, check before subsequent
**Warning signs:** Same as infinite loop

### Pitfall 3: Wrong Credential Type for Protocol
**What goes wrong:** Providing SSH credentials for HTTPS URL or vice versa
**Why it happens:** Not checking `allowed_types` parameter in callback
**How to avoid:** Always check `allowed.contains(CredentialType::X)` before returning that type
**Warning signs:** "authentication method not supported" errors

### Pitfall 4: Blocking on User Input in Callback
**What goes wrong:** Trying to prompt user for passphrase inside credential callback
**Why it happens:** Assuming callback can do async I/O
**How to avoid:** Credentials must be provided before starting clone (via request body)
**Warning signs:** Deadlock, unresponsive UI

### Pitfall 5: libssh2 OpenSSL Dependency
**What goes wrong:** Encrypted SSH keys fail even with correct passphrase
**Why it happens:** libssh2 compiled against libgcrypt instead of OpenSSL
**How to avoid:** Ensure git2 is built with OpenSSL backend; document in troubleshooting
**Warning signs:** "publickey denied" errors on encrypted keys that work with `ssh` CLI

## Code Examples

### Complete Clone with Credentials

```rust
// Source: git2 RemoteCallbacks documentation + Cargo patterns
// https://docs.rs/git2/latest/git2/struct.RemoteCallbacks.html

use std::cell::RefCell;
use std::rc::Rc;
use std::path::Path;

#[derive(Default)]
struct CloneCredentials {
    // For SSH
    ssh_passphrase: Option<String>,
    ssh_key_path: Option<PathBuf>,

    // For HTTPS
    username: Option<String>,
    password: Option<String>,  // Or GitHub PAT
}

#[derive(Default)]
struct CredentialState {
    tried_ssh_agent: bool,
    tried_ssh_key: bool,
    tried_userpass: bool,
}

pub fn clone_with_credentials(
    url: &str,
    dest: &Path,
    credentials: Option<CloneCredentials>,
    progress_tx: mpsc::Sender<CloneProgress>,
) -> Result<git2::Repository, CloneError> {
    let creds = credentials.unwrap_or_default();
    let state = Rc::new(RefCell::new(CredentialState::default()));
    let state_clone = Rc::clone(&state);

    let mut callbacks = git2::RemoteCallbacks::new();

    // Progress callback (existing)
    callbacks.transfer_progress(move |stats| {
        let progress = CloneProgress {
            received_objects: stats.received_objects(),
            total_objects: stats.total_objects(),
            received_bytes: stats.received_bytes(),
            indexed_objects: stats.indexed_objects(),
            total_deltas: stats.total_deltas(),
            indexed_deltas: stats.indexed_deltas(),
        };
        let _ = progress_tx.try_send(progress);
        true
    });

    // Credential callback
    let passphrase = creds.ssh_passphrase.clone();
    let key_path = creds.ssh_key_path.clone();
    let username = creds.username.clone();
    let password = creds.password.clone();

    callbacks.credentials(move |_url, username_from_url, allowed| {
        let mut state = state_clone.borrow_mut();

        // SSH authentication path
        if allowed.contains(git2::CredentialType::SSH_KEY) {
            // Try ssh-agent first (only once)
            if !state.tried_ssh_agent {
                state.tried_ssh_agent = true;
                let user = username_from_url.unwrap_or("git");
                match git2::Cred::ssh_key_from_agent(user) {
                    Ok(cred) => return Ok(cred),
                    Err(_) => {} // Fall through to key file
                }
            }

            // Try SSH key file (only once)
            if !state.tried_ssh_key {
                state.tried_ssh_key = true;
                let user = username_from_url.unwrap_or("git");

                // Use provided key path or find default
                let key = match &key_path {
                    Some(p) => p.clone(),
                    None => find_default_ssh_key()?,
                };

                return git2::Cred::ssh_key(
                    user,
                    None,  // public key (optional)
                    &key,
                    passphrase.as_deref(),
                );
            }
        }

        // HTTPS authentication path
        if allowed.contains(git2::CredentialType::USER_PASS_PLAINTEXT) {
            if !state.tried_userpass {
                state.tried_userpass = true;
                if let (Some(u), Some(p)) = (&username, &password) {
                    return git2::Cred::userpass_plaintext(u, p);
                }
            }
        }

        // All methods exhausted
        Err(git2::Error::from_str("all authentication methods failed"))
    });

    let mut fetch_options = git2::FetchOptions::new();
    fetch_options.remote_callbacks(callbacks);

    git2::build::RepoBuilder::new()
        .fetch_options(fetch_options)
        .clone(url, dest)
        .map_err(classify_clone_error)
}
```

### Error Classification with Auth Type

```rust
// Enhanced CloneError to include auth type for UI decisions

#[derive(Debug, Error)]
pub enum CloneError {
    #[error("SSH authentication failed: {message}")]
    SshAuthFailed {
        message: String,
        help_steps: Vec<String>,
        needs_passphrase: bool,  // Detected encrypted key
        key_path: Option<String>,  // Which key was tried
    },

    #[error("HTTPS authentication failed: {message}")]
    HttpsAuthFailed {
        message: String,
        help_steps: Vec<String>,
        is_github: bool,  // Show PAT-specific UI
    },

    // ... other variants
}
```

### API Types for Credential Retry

```rust
// Request body for clone with credentials
#[derive(Debug, Deserialize)]
pub struct CloneWithCredentialsRequest {
    pub url: String,
    #[serde(default)]
    pub credentials: Option<Credentials>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Credentials {
    SshPassphrase {
        passphrase: String,
        #[serde(default)]
        key_path: Option<String>,
    },
    GitHubPat {
        token: String,
    },
    HttpsBasic {
        username: String,
        password: String,
    },
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ssh-agent only | ssh-agent + key file fallback | Standard practice | Supports keys not in agent |
| RSA keys | Ed25519 preferred | ~2020 | Faster, more secure; try id_ed25519 first |
| Password auth | PAT required (GitHub) | 2021 | Must detect GitHub and show PAT UI |

**Deprecated/outdated:**
- GitHub password auth: Deprecated since Aug 2021, PAT required for HTTPS
- DSA keys: Deprecated in OpenSSH, unlikely to encounter

## Open Questions

Things that couldn't be fully resolved:

1. **OpenSSH key encryption detection without ssh-key crate**
   - What we know: Can check for "ENCRYPTED" in PEM, but OpenSSH format is binary
   - What's unclear: Reliable heuristic without parsing
   - Recommendation: Use ssh-key crate for robust detection, or try parse and catch error

2. **libssh2 backend requirements**
   - What we know: Encrypted keys may fail with libgcrypt backend
   - What's unclear: Default backend in git2 v0.20 on various platforms
   - Recommendation: Document in troubleshooting; test on CI

3. **SSH config file parsing**
   - What we know: Users may have custom IdentityFile in ~/.ssh/config
   - What's unclear: Whether git2 respects this automatically
   - Recommendation: Out of scope for Phase 5; could add later as enhancement

## Sources

### Primary (HIGH confidence)
- [git2::RemoteCallbacks docs](https://docs.rs/git2/latest/git2/struct.RemoteCallbacks.html) - Credential callback API
- [git2::Cred docs](https://docs.rs/git2/latest/git2/struct.Cred.html) - ssh_key, userpass_plaintext methods
- [libgit2 authentication guide](https://libgit2.org/docs/guides/authentication/) - Callback protocol

### Secondary (MEDIUM confidence)
- [rustsec authentication.rs](https://docs.rs/rustsec/0.15.1/src/rustsec/repository/authentication.rs.html) - Cargo's credential pattern
- [auth-git2 crate](https://docs.rs/auth-git2/latest/auth_git2/) - Alternative implementation reference
- [Arch Wiki SSH keys](https://wiki.archlinux.org/title/SSH_keys) - Default key paths

### Tertiary (LOW confidence)
- [git2-rs Issue #347](https://github.com/rust-lang/git2-rs/issues/347) - Infinite callback loop discussion
- [git2-rs Issue #329](https://github.com/rust-lang/git2-rs/issues/329) - Auth callback basics
- [libssh2 Issue #68](https://github.com/libssh2/libssh2/issues/68) - Encrypted key issues

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - git2 already in use, patterns well-documented
- Architecture: HIGH - Credential callback API is stable, patterns from Cargo
- Pitfalls: HIGH - Well-documented in git2-rs issues and Cargo source
- SSH key detection: MEDIUM - May need ssh-key crate for robust detection

**Research date:** 2026-01-17
**Valid until:** 60 days (git2 0.20 is stable, credential API unchanged)
