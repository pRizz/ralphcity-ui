# Phase 6: Repository Manager - Research

**Researched:** 2026-01-17
**Domain:** React UI components, shadcn/ui patterns, CRUD operations
**Confidence:** HIGH

## Summary

Phase 6 implements a Repository Manager view that allows users to view, manage, and delete repositories from a dedicated interface. This is a UI-focused phase that leverages existing backend APIs and frontend patterns already established in the codebase.

The codebase already has:
- Backend API: `DELETE /repos/{id}` (removes from DB only)
- Frontend hook: `useDeleteRepo()` from `@/api/hooks`
- Repo type with: `id`, `path`, `name`, `created_at`, `updated_at`
- Established dialog patterns (SettingsDialog, CloneDialog)
- shadcn/ui table, dialog, alert-dialog, and button components

The main work is creating a new `RepositoryManagerDialog` component and deciding on "delete from disk" behavior.

**Primary recommendation:** Create a dialog-based repository manager accessible from the sidebar footer, using shadcn/ui Table for the repo list and AlertDialog for delete confirmation. Start with DB-only delete; disk deletion can be added as optional checkbox if requirements confirm.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.3.1 | UI framework | Already in use |
| @tanstack/react-query | ^5.83.0 | Data fetching/mutations | useRepos, useDeleteRepo hooks exist |
| shadcn/ui | Latest | UI components | Dialog, Table, AlertDialog, Button in use |
| lucide-react | ^0.462.0 | Icons | Settings, Trash2, FolderOpen icons available |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^3.6.0 | Date formatting | Format created_at for display |
| sonner | ^1.7.4 | Toast notifications | Success/error feedback |

### No New Dependencies Required
This phase uses only existing dependencies. No new packages needed.

## Architecture Patterns

### Recommended Component Structure
```
src/components/ralphtown/
├── RepositoryManagerDialog.tsx   # Main dialog component (NEW)
└── AgentSidebar.tsx              # Add "Manage Repos" trigger button
```

### Pattern 1: Dialog-Based Manager (Recommended)
**What:** Repository manager as a modal dialog triggered from sidebar footer
**When to use:** For secondary management views that don't need full-page navigation
**Why:** Matches existing SettingsDialog pattern, keeps user in main workflow

**Example from existing codebase:**
```typescript
// Source: src/components/ralphtown/SettingsDialog.tsx (lines 33-97)
export function SettingsDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {/* Content here */}
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 2: Table for Repo List
**What:** shadcn/ui Table component for displaying repositories
**When to use:** Structured data with multiple columns
**Example:**
```typescript
// Source: src/components/ui/table.tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Path</TableHead>
      <TableHead>Added</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {repos.map((repo) => (
      <TableRow key={repo.id}>
        <TableCell>{repo.name}</TableCell>
        <TableCell className="text-muted-foreground">{repo.path}</TableCell>
        <TableCell>{format(new Date(repo.created_at), 'MMM d, yyyy')}</TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="icon" onClick={() => handleDelete(repo)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Pattern 3: AlertDialog for Delete Confirmation
**What:** shadcn/ui AlertDialog for destructive action confirmation
**When to use:** Any action that cannot be undone
**Example:**
```typescript
// Source: src/components/ui/alert-dialog.tsx
<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Repository?</AlertDialogTitle>
      <AlertDialogDescription>
        This will remove "{repoToDelete?.name}" from the list.
        The files on disk will not be deleted.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Pattern 4: Existing Hook Usage
**What:** Use existing `useRepos` and `useDeleteRepo` hooks
**Example:**
```typescript
// Source: src/api/hooks.ts (lines 35-59)
export function useRepos() {
  return useQuery({
    queryKey: queryKeys.repos,
    queryFn: api.listRepos,
  });
}

export function useDeleteRepo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteRepo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repos });
    },
  });
}
```

### Anti-Patterns to Avoid
- **Page navigation for simple CRUD:** Don't create a new route/page for this; dialog is sufficient
- **Custom modal implementation:** Use existing Dialog/AlertDialog components
- **Manual cache invalidation:** useDeleteRepo already handles query invalidation
- **Inline delete without confirmation:** Always use AlertDialog for destructive actions

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal/dialog | Custom modal with backdrop | shadcn/ui Dialog | Handles focus trap, escape key, aria attributes |
| Delete confirmation | window.confirm() | shadcn/ui AlertDialog | Accessible, styled consistently |
| Data table | Manual div grid | shadcn/ui Table | Semantic HTML, accessible, responsive |
| Date formatting | Manual string manipulation | date-fns format() | Handles i18n, edge cases |
| Cache invalidation | Manual refetch | TanStack Query mutations | Already wired up in useDeleteRepo |

**Key insight:** The entire UI stack for this feature already exists in the codebase. This phase is primarily component composition.

## Common Pitfalls

### Pitfall 1: Forgetting Query Invalidation
**What goes wrong:** Delete succeeds but UI doesn't update
**Why it happens:** Not invalidating the repos query after delete
**How to avoid:** useDeleteRepo already handles this via `onSuccess` callback
**Warning signs:** Stale data after mutation

### Pitfall 2: Blocking Clone Dialog
**What goes wrong:** Two dialogs fight for focus, poor UX
**Why it happens:** Opening CloneDialog while RepositoryManagerDialog is open
**How to avoid:** Pass `onOpenChange` to close manager before opening clone dialog
**Warning signs:** Nested dialogs, focus trap issues

### Pitfall 3: Destructive Delete Without Warning
**What goes wrong:** User accidentally deletes repo with no confirmation
**Why it happens:** Skipping AlertDialog to "simplify" UX
**How to avoid:** Always use AlertDialog for DELETE operations
**Warning signs:** User complaints about accidental deletions

### Pitfall 4: Delete From Disk Without Caution
**What goes wrong:** User loses work, no recovery possible
**Why it happens:** Implementing disk deletion without adequate safeguards
**How to avoid:**
  1. Start with DB-only delete (safe, reversible by re-adding path)
  2. If disk delete is needed: require explicit opt-in checkbox, show path clearly
  3. Never delete if repo has uncommitted changes
**Warning signs:** Data loss complaints

## Code Examples

Verified patterns from the existing codebase:

### Dialog Component Pattern
```typescript
// Source: src/components/ralphtown/SettingsDialog.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RepositoryManagerDialog() {
  const [open, setOpen] = useState(false);
  const { data: repos = [] } = useRepos();
  const deleteRepo = useDeleteRepo();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Manage Repos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Repositories</DialogTitle>
          <DialogDescription>
            View and manage repositories tracked by Ralphtown.
          </DialogDescription>
        </DialogHeader>
        {/* Table content */}
      </DialogContent>
    </Dialog>
  );
}
```

### Delete Handler with Confirmation
```typescript
// Pattern from codebase mutations
const [repoToDelete, setRepoToDelete] = useState<Repo | null>(null);

const handleDeleteClick = (repo: Repo) => {
  setRepoToDelete(repo);
};

const confirmDelete = async () => {
  if (!repoToDelete) return;
  try {
    await deleteRepo.mutateAsync(repoToDelete.id);
    toast({
      title: "Repository removed",
      description: `${repoToDelete.name} has been removed from the list.`,
    });
  } catch (error) {
    toast({
      title: "Failed to remove repository",
      description: error instanceof Error ? error.message : "Unknown error",
      variant: "destructive",
    });
  }
  setRepoToDelete(null);
};
```

### Existing API Types
```typescript
// Source: src/api/types.ts (lines 5-11)
export interface Repo {
  id: string;
  path: string;
  name: string;
  created_at: string;
  updated_at: string;
}
```

## Design Decisions

### UI Entry Point: Sidebar Footer
**Decision:** Add "Manage Repos" button to AgentSidebar footer, next to SettingsDialog
**Rationale:**
- Consistent with existing SettingsDialog placement
- Repository management is a secondary action, not primary workflow
- Footer is persistent and discoverable

**Implementation:**
```typescript
// In AgentSidebar.tsx footer section (around line 157)
<div className="px-3 py-3 border-t border-sidebar-border mt-auto flex items-center justify-between">
  {/* Existing source code link */}
  <div className="flex items-center gap-2">
    <RepositoryManagerDialog />
    <SettingsDialog />
  </div>
</div>
```

### Delete Behavior: DB-Only (Phase 1)
**Decision:** DELETE /repos/{id} removes from database only, files remain on disk
**Rationale:**
- This is already the backend behavior (see repos.rs line 206-216)
- Safe by default - user can re-add the path later
- Disk deletion is destructive and requires more safeguards

**Future Option (if requirements confirm):**
Add optional `?delete_from_disk=true` query param to DELETE endpoint. This would require:
1. Backend update to accept query param and call `fs::remove_dir_all`
2. Frontend checkbox in delete confirmation
3. Additional warning text
4. Check for uncommitted changes before allowing

### Repo Information to Display
**Decision:** Show: Name, Path, Added Date, Delete action
**Rationale:**
- Name: Primary identifier, already shown in RepoSelector
- Path: Important for disambiguation, shows location on disk
- Added Date: Useful for understanding repo history, available in `created_at`
- Delete: Only destructive action needed for MVP

**Optional additions:**
- Clone date vs added date (same field currently)
- Session count (would require join query)
- Last used date (would require tracking)

### Clone from Manager
**Decision:** Reuse existing CloneDialog component
**Rationale:**
- CloneDialog is fully featured with progress, error handling, credentials
- Pass `onCloneSuccess` to auto-select new repo and close manager
- Avoids code duplication

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| window.confirm | AlertDialog | shadcn/ui adoption | Accessible, styled confirmation |
| Manual state for open/close | Dialog controlled state | Radix UI Dialog | Focus management, escape key |
| Manual cache update | TanStack Query invalidation | Already implemented | Automatic UI sync |

**Deprecated/outdated:**
- None for this phase - using current patterns

## Open Questions

Things that require clarification from requirements:

1. **Disk Deletion**
   - What we know: Backend DELETE only removes from DB, files stay on disk
   - What's unclear: Should we add optional disk deletion?
   - Recommendation: Start with DB-only, add disk delete later if requested

2. **Session Cleanup**
   - What we know: Sessions are linked to repos via `repo_id`
   - What's unclear: Should deleting a repo also delete its sessions?
   - Recommendation: Keep sessions (they represent history), or add cascade delete option

3. **Active Session Protection**
   - What we know: Sessions can be "running" status
   - What's unclear: Can user delete repo with active session?
   - Recommendation: Block delete if repo has running sessions

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/api/hooks.ts` - useRepos, useDeleteRepo hooks
- Codebase analysis: `src/api/types.ts` - Repo interface definition
- Codebase analysis: `src/components/ralphtown/SettingsDialog.tsx` - Dialog pattern
- Codebase analysis: `src/components/ralphtown/CloneDialog.tsx` - Clone reuse pattern
- Codebase analysis: `src/components/ui/table.tsx` - Table component
- Codebase analysis: `src/components/ui/alert-dialog.tsx` - Confirmation pattern
- Codebase analysis: `backend/src/api/repos.rs` - DELETE endpoint behavior

### Secondary (MEDIUM confidence)
- shadcn/ui documentation patterns (training data)

### Tertiary (LOW confidence)
- None - all findings are from direct codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Direct codebase analysis, all dependencies already installed
- Architecture: HIGH - Follows established patterns from SettingsDialog, CloneDialog
- Pitfalls: HIGH - Based on understanding of existing patterns and common React/dialog issues

**Research date:** 2026-01-17
**Valid until:** Indefinite (codebase-specific patterns)
