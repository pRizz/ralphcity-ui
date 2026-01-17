# Phase 7: Agent Orchestrator Selection - Research

**Researched:** 2026-01-17
**Domain:** Database schema migration, Rust enums, React Select components, per-session configuration
**Confidence:** HIGH

## Summary

Phase 7 implements the ability for users to select different AI agent orchestrators when starting a session. Currently, the system hardcodes "ralph" as the only orchestrator. This phase introduces an orchestrator selection dropdown, persists the choice per-session in the database, and shows future orchestrators (GSD, Gastown) as disabled with "Coming Soon" badges.

The implementation requires:
1. **Backend**: Database schema migration to add `orchestrator` column to sessions table, Rust enum for orchestrator types, API updates
2. **Frontend**: New OrchestratorSelector component, integration with session creation flow

The codebase already has:
- Session model with fields: `id`, `repo_id`, `name`, `status`, `created_at`, `updated_at`
- RalphManager that spawns `ralph` CLI processes
- PromptInput component with model selector dropdown (good pattern reference)
- shadcn/ui Select component ready to use
- TanStack Query hooks for session mutations

**Primary recommendation:** Add an `orchestrator` TEXT column to the sessions table (nullable, default to "ralph" for backwards compatibility). Create an `Orchestrator` enum in Rust with serde serialization. Build an `OrchestratorSelector` component using shadcn/ui Select that shows Ralph as enabled/default and GSD/Gastown as disabled with Coming Soon badges. Pass orchestrator choice through session creation.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.3.1 | UI framework | Already in use |
| @tanstack/react-query | ^5.83.0 | Data fetching/mutations | useCreateSession hook exists |
| shadcn/ui | Latest | UI components | Select, Badge components available |
| rusqlite | 0.33 | SQLite database | Already handles schema migrations |
| serde | 1.x | Rust serialization | Enum serialization for API |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.462.0 | Icons | Bot/Sparkles icons for orchestrators |
| thiserror | 2 | Error handling | Error variants for invalid orchestrator |

### No New Dependencies Required
This phase uses only existing dependencies. No new packages needed.

## Architecture Patterns

### Recommended Component Structure
```
frontend/src/components/ralphtown/
├── OrchestratorSelector.tsx   # New orchestrator dropdown (NEW)
├── PromptInput.tsx            # Existing - reference for dropdown pattern
├── MainPanel.tsx              # Update to pass orchestrator to session creation

backend/src/db/
├── models.rs                  # Add Orchestrator enum
├── schema.rs                  # Add migration SQL
├── mod.rs                     # Update insert_session signature

backend/src/api/
├── sessions.rs                # Update CreateSessionRequest, RunSessionRequest
```

### Pattern 1: Orchestrator Enum (Backend)
**What:** Strongly-typed enum representing available orchestrators
**When to use:** For type-safe orchestrator handling across the system
**Example:**
```rust
// Source: Pattern from models.rs SessionStatus enum (lines 16-47)
use serde::{Deserialize, Serialize};

/// Available orchestrator types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Orchestrator {
    Ralph,
    Gsd,
    Gastown,
}

impl Orchestrator {
    pub fn as_str(&self) -> &'static str {
        match self {
            Orchestrator::Ralph => "ralph",
            Orchestrator::Gsd => "gsd",
            Orchestrator::Gastown => "gastown",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "ralph" => Ok(Orchestrator::Ralph),
            "gsd" => Ok(Orchestrator::Gsd),
            "gastown" => Ok(Orchestrator::Gastown),
            _ => Err(format!("invalid orchestrator: '{}'", s)),
        }
    }

    /// Returns true if this orchestrator is currently available
    pub fn is_available(&self) -> bool {
        matches!(self, Orchestrator::Ralph)
    }
}

impl Default for Orchestrator {
    fn default() -> Self {
        Orchestrator::Ralph
    }
}
```

### Pattern 2: Schema Migration
**What:** Add orchestrator column to sessions table with safe migration
**When to use:** Database schema changes that must preserve existing data
**Example:**
```rust
// In schema.rs - increment SCHEMA_VERSION and add migration
pub const SCHEMA_VERSION: i32 = 2;

/// Migration from v1 to v2: Add orchestrator column
pub const MIGRATE_V1_TO_V2: &str = r#"
ALTER TABLE sessions ADD COLUMN orchestrator TEXT NOT NULL DEFAULT 'ralph';
"#;
```

### Pattern 3: Select with Disabled Options (Frontend)
**What:** shadcn/ui Select with some options disabled and badged
**When to use:** When showing future options that aren't yet available
**Example:**
```typescript
// Pattern from existing PromptInput.tsx model selector
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface OrchestratorOption {
  id: string;
  name: string;
  description: string;
  available: boolean;
}

const orchestrators: OrchestratorOption[] = [
  { id: "ralph", name: "Ralph", description: "Autonomous coding agent", available: true },
  { id: "gsd", name: "GSD", description: "Task-driven orchestrator", available: false },
  { id: "gastown", name: "Gastown", description: "Multi-agent coordination", available: false },
];

export function OrchestratorSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select orchestrator" />
      </SelectTrigger>
      <SelectContent>
        {orchestrators.map((orch) => (
          <SelectItem
            key={orch.id}
            value={orch.id}
            disabled={!orch.available}
            className="flex items-center justify-between"
          >
            <span>{orch.name}</span>
            {!orch.available && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Coming Soon
              </Badge>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### Pattern 4: API Request Update
**What:** Add orchestrator field to session creation request
**When to use:** When session needs configuration at creation time
**Example:**
```rust
// In sessions.rs
#[derive(Debug, Deserialize, Serialize)]
pub struct CreateSessionRequest {
    pub repo_id: Uuid,
    pub name: Option<String>,
    #[serde(default)]  // Uses Orchestrator::default() if not provided
    pub orchestrator: Orchestrator,
}
```

```typescript
// In types.ts
export interface CreateSessionRequest {
  repo_id: string;
  name?: string;
  orchestrator?: "ralph" | "gsd" | "gastown";  // Optional, defaults to "ralph"
}
```

### Anti-Patterns to Avoid
- **String literals for orchestrator in multiple places:** Use enum/const arrays
- **Validating orchestrator only on frontend:** Backend must validate and reject invalid/unavailable orchestrators
- **Modifying RalphManager directly for future orchestrators:** Keep orchestrator-specific logic separate, RalphManager stays ralph-specific
- **Breaking existing sessions:** New column must have DEFAULT value

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dropdown with options | Custom dropdown div | shadcn/ui Select | Handles keyboard nav, accessibility, styling |
| Disabled option styling | Manual CSS classes | SelectItem disabled prop | Built-in disabled state handling |
| Badge/chip display | Custom styled span | shadcn/ui Badge | Consistent with design system |
| Database migration | Manual ALTER TABLE | Versioned schema with SCHEMA_VERSION | Existing pattern in schema.rs |
| Enum serialization | Manual string matching | serde with rename_all | Type-safe, consistent JSON |

**Key insight:** The UI pattern exists in PromptInput.tsx (model selector), the database migration pattern exists in schema.rs, and the enum pattern exists in models.rs (SessionStatus). This phase composes existing patterns.

## Common Pitfalls

### Pitfall 1: Breaking Existing Sessions
**What goes wrong:** Existing sessions fail to load because orchestrator column is NULL
**Why it happens:** Adding NOT NULL column without DEFAULT value
**How to avoid:** Use `DEFAULT 'ralph'` in ALTER TABLE statement
**Warning signs:** Query errors for sessions created before migration

### Pitfall 2: Frontend/Backend Enum Mismatch
**What goes wrong:** Frontend sends orchestrator value backend doesn't recognize
**Why it happens:** Enum values defined differently in TS and Rust
**How to avoid:**
  1. Use snake_case/lowercase consistently (`serde(rename_all = "lowercase")`)
  2. Define orchestrator options as const array in frontend, derive from API types
**Warning signs:** 400 Bad Request errors on session creation

### Pitfall 3: Allowing Selection of Unavailable Orchestrators
**What goes wrong:** User selects "GSD", backend tries to spawn non-existent CLI
**Why it happens:** Frontend disables option visually but doesn't prevent submission
**How to avoid:**
  1. Frontend: Use `disabled` prop on SelectItem
  2. Backend: Validate `orchestrator.is_available()` in create/run handlers
  3. Return 400 Bad Request with helpful message for unavailable orchestrators
**Warning signs:** Runtime errors when running session

### Pitfall 4: Hardcoded CLI Command in RalphManager
**What goes wrong:** Adding new orchestrators requires modifying RalphManager
**Why it happens:** CLI command ("ralph") hardcoded in run() method
**How to avoid:**
  1. Keep RalphManager as-is (it's ralph-specific)
  2. Create orchestrator dispatch layer in api/sessions.rs
  3. Future: Create GsdManager, GastownManager with same interface
**Warning signs:** Run handler grows with if/else for each orchestrator

### Pitfall 5: Schema Version Not Incremented
**What goes wrong:** Migration doesn't run on existing installations
**Why it happens:** Forgetting to increment SCHEMA_VERSION constant
**How to avoid:** Always increment version AND add migration SQL
**Warning signs:** "column orchestrator does not exist" in production

## Code Examples

Verified patterns from the existing codebase:

### Session Model Update
```rust
// Source: backend/src/db/models.rs (existing Session struct, line 50-58)
// Updated to include orchestrator field
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: Uuid,
    pub repo_id: Uuid,
    pub name: Option<String>,
    pub orchestrator: Orchestrator,  // NEW
    pub status: SessionStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### Database Insert with Orchestrator
```rust
// Source: backend/src/db/mod.rs insert_session pattern (line 274-299)
pub fn insert_session(
    &self,
    repo_id: Uuid,
    name: Option<&str>,
    orchestrator: Orchestrator,  // NEW parameter
) -> DbResult<Session> {
    let conn = self.conn.lock().unwrap();
    let now = Utc::now();
    let id = Uuid::new_v4();

    conn.execute(
        "INSERT INTO sessions (id, repo_id, name, orchestrator, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id.to_string(),
            repo_id.to_string(),
            name,
            orchestrator.as_str(),  // Store as string
            SessionStatus::Idle.as_str(),
            now.to_rfc3339(),
            now.to_rfc3339()
        ],
    )?;

    Ok(Session {
        id,
        repo_id,
        name: name.map(String::from),
        orchestrator,
        status: SessionStatus::Idle,
        created_at: now,
        updated_at: now,
    })
}
```

### Frontend Type Updates
```typescript
// Source: frontend/src/api/types.ts (existing Session interface, line 88-95)
// Updated to include orchestrator
export type OrchestratorType = "ralph" | "gsd" | "gastown";

export interface Session {
  id: string;
  repo_id: string;
  name: string | null;
  orchestrator: OrchestratorType;  // NEW
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionRequest {
  repo_id: string;
  name?: string;
  orchestrator?: OrchestratorType;  // NEW, optional (defaults to ralph)
}
```

### OrchestratorSelector Component
```typescript
// New file: frontend/src/components/ralphtown/OrchestratorSelector.tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, Users } from "lucide-react";
import type { OrchestratorType } from "@/api/types";

interface OrchestratorInfo {
  id: OrchestratorType;
  name: string;
  description: string;
  available: boolean;
  icon: React.ReactNode;
}

const ORCHESTRATORS: OrchestratorInfo[] = [
  {
    id: "ralph",
    name: "Ralph",
    description: "Autonomous coding agent",
    available: true,
    icon: <Bot className="h-4 w-4" />,
  },
  {
    id: "gsd",
    name: "GSD",
    description: "Task-driven orchestrator",
    available: false,
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: "gastown",
    name: "Gastown",
    description: "Multi-agent coordination",
    available: false,
    icon: <Users className="h-4 w-4" />,
  },
];

interface OrchestratorSelectorProps {
  value: OrchestratorType;
  onChange: (value: OrchestratorType) => void;
}

export function OrchestratorSelector({ value, onChange }: OrchestratorSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select orchestrator" />
      </SelectTrigger>
      <SelectContent>
        {ORCHESTRATORS.map((orch) => (
          <SelectItem
            key={orch.id}
            value={orch.id}
            disabled={!orch.available}
          >
            <div className="flex items-center gap-2">
              {orch.icon}
              <span>{orch.name}</span>
              {!orch.available && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Coming Soon
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

## Design Decisions

### Schema: Nullable vs Default
**Decision:** Use NOT NULL with DEFAULT 'ralph' for orchestrator column
**Rationale:**
- Existing sessions automatically get 'ralph' value
- No NULL handling needed in application code
- Backwards compatible - old sessions work without modification

### API: Optional in Request, Required in Response
**Decision:** orchestrator is optional in CreateSessionRequest, required in Session response
**Rationale:**
- Backwards compatibility: existing clients can omit field
- Backend applies default if not provided
- Response always includes orchestrator for display

### Validation: Backend Enforces Availability
**Decision:** Backend validates orchestrator is available before creating/running session
**Rationale:**
- Frontend can be bypassed (API calls, curl)
- Single source of truth for what's available
- Clear error message: "Orchestrator 'gsd' is not yet available"

### UI Location: In PromptInput Area
**Decision:** Place OrchestratorSelector in MainPanel, above or next to PromptInput
**Rationale:**
- Orchestrator choice is part of "starting a new session" flow
- Visible before user types prompt
- Similar to model selector placement in PromptInput

**Alternative considered:** In PromptInput bottom bar (like model selector)
**Why rejected:** Orchestrator is higher-level than model selection, deserves more prominent placement

### CLI Dispatch: Keep RalphManager As-Is
**Decision:** Don't modify RalphManager for multi-orchestrator support
**Rationale:**
- RalphManager is correctly scoped to ralph CLI
- Future orchestrators will have their own managers
- Dispatch logic goes in session handler, not in managers

**Future pattern:**
```rust
// In api/sessions.rs run_session handler
match session.orchestrator {
    Orchestrator::Ralph => state.ralph_manager.run(...).await,
    Orchestrator::Gsd => state.gsd_manager.run(...).await,      // Future
    Orchestrator::Gastown => state.gastown_manager.run(...).await, // Future
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded orchestrator | Per-session selection | This phase | User flexibility |
| Single manager pattern | Orchestrator-specific managers | This phase | Clean architecture |
| No schema versioning | SCHEMA_VERSION constant | Phase 1 | Safe migrations |

**Deprecated/outdated:**
- None for this phase - introducing new capability

## Open Questions

Things that require clarification or were resolved during research:

1. **Orchestrator CLI Commands**
   - What we know: Ralph uses `ralph run --autonomous --prompt "..."`
   - What's unclear: CLI commands for GSD and Gastown when they're implemented
   - Recommendation: Not needed now - those orchestrators show "Coming Soon"

2. **Session List Display**
   - What we know: Sessions list shows name, status, repo
   - What's unclear: Should orchestrator be visible in session list?
   - Recommendation: Add orchestrator icon/badge to AgentListItem in future, not required for phase 7

3. **Migration Rollback**
   - What we know: SQLite doesn't support DROP COLUMN easily
   - What's unclear: How to rollback if migration fails
   - Recommendation: Test migration thoroughly, no rollback mechanism needed (column is additive)

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `backend/src/db/models.rs` - SessionStatus enum pattern (lines 16-47)
- Codebase analysis: `backend/src/db/schema.rs` - Migration pattern with SCHEMA_VERSION
- Codebase analysis: `backend/src/db/mod.rs` - insert_session signature (lines 274-299)
- Codebase analysis: `backend/src/api/sessions.rs` - CreateSessionRequest (lines 16-22)
- Codebase analysis: `backend/src/ralph/mod.rs` - RalphManager run method (lines 77-253)
- Codebase analysis: `frontend/src/api/types.ts` - Session interface (lines 88-95)
- Codebase analysis: `frontend/src/components/ralphtown/PromptInput.tsx` - Model selector pattern
- Codebase analysis: `frontend/src/components/ui/select.tsx` - Select component
- Codebase analysis: `frontend/src/components/ui/badge.tsx` - Badge component

### Secondary (MEDIUM confidence)
- shadcn/ui Select documentation patterns (training data)
- SQLite ALTER TABLE ADD COLUMN behavior (training data)

### Tertiary (LOW confidence)
- None - all findings are from direct codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed, patterns exist in codebase
- Architecture: HIGH - Follows established enum, migration, and component patterns
- Pitfalls: HIGH - Based on understanding of existing patterns and SQLite constraints

**Research date:** 2026-01-17
**Valid until:** Indefinite (codebase-specific patterns)
