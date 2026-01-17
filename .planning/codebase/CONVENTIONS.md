# Coding Conventions

**Analysis Date:** 2026-01-17

## Naming Patterns

**Files:**
- React components: PascalCase with `.tsx` extension (e.g., `MainPanel.tsx`, `AgentSidebar.tsx`)
- Hooks: camelCase prefixed with `use` (e.g., `useWebSocket.ts`, `use-toast.ts`)
- Utility files: camelCase (e.g., `utils.ts`, `mockData.ts`)
- Type definition files: camelCase (e.g., `types.ts`, `ralphtown.ts`)
- API layer files: camelCase (e.g., `client.ts`, `hooks.ts`)

**Functions:**
- Regular functions: camelCase (e.g., `mapApiSessionToInstance`, `handleSubmit`)
- React components: PascalCase (e.g., `MainPanel`, `ChatMessageBubble`)
- Event handlers: prefixed with `handle` (e.g., `handleSubmit`, `handleKeyDown`, `handleSelectRepo`)
- API functions: verb-noun camelCase (e.g., `listRepos`, `createSession`, `getGitStatus`)

**Variables:**
- Regular variables: camelCase (e.g., `selectedRepo`, `isConnected`)
- Boolean state: prefixed with `is`, `has`, or similar (e.g., `isLoading`, `isConnected`, `isDragActive`)
- Refs: suffixed with `Ref` (e.g., `wsRef`, `messagesEndRef`, `outputEndRef`)
- Constants: UPPER_SNAKE_CASE for module-level (e.g., `API_BASE`, `WS_URL`, `RECONNECT_INTERVAL`)

**Types:**
- Interfaces: PascalCase (e.g., `RalphtownInstance`, `Repository`, `MainPanelProps`)
- Type aliases: PascalCase (e.g., `AgentStatus`, `SessionStatus`, `MessageRole`)
- Props interfaces: ComponentName + `Props` suffix (e.g., `MainPanelProps`, `AgentSidebarProps`)
- Request/Response types: EntityName + `Request`/`Response` suffix (e.g., `AddRepoRequest`, `GitStatusResponse`)

## Code Style

**Formatting:**
- No dedicated Prettier config file detected (using editor defaults or ESLint)
- Double quotes for strings in TypeScript/TSX files
- Semicolons at end of statements
- 2-space indentation

**Linting:**
- ESLint with TypeScript ESLint plugin
- Config file: `frontend/eslint.config.js`
- Key rules:
  - `@typescript-eslint/no-unused-vars`: off
  - `react-refresh/only-export-components`: warn (allows constant exports)
  - React Hooks rules enabled via `eslint-plugin-react-hooks`

**TypeScript:**
- Strict mode: disabled (`strict: false` in `tsconfig.app.json`)
- `noImplicitAny`: disabled
- `strictNullChecks`: disabled
- Path aliases: `@/*` maps to `./src/*`

## Import Organization

**Order:**
1. React imports (`import { useState, useEffect } from "react"`)
2. External library imports (Radix UI, Tanstack Query, etc.)
3. Internal absolute imports using `@/` alias (`import { Button } from "@/components/ui/button"`)
4. Relative imports (used sparingly, mostly for sibling imports)

**Path Aliases:**
- `@/*` resolves to `frontend/src/*`
- Use for all internal imports except same-directory siblings

**Examples:**
```typescript
import { useState, useRef, useEffect } from "react";
import { ArrowUp, GitBranch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RalphtownInstance, ChatMessage } from "@/types/ralphtown";
import { cn } from "@/lib/utils";
import type { OutputLine } from "@/hooks/useWebSocket";
```

## Error Handling

**Patterns:**
- Custom error classes for API errors (see `frontend/src/api/client.ts`):
```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: string
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}
```

- Try/catch with toast notifications for user-facing errors:
```typescript
try {
  const session = await createSession.mutateAsync({ repo_id: repo.id });
  // success handling
} catch (error) {
  toast({
    title: "Failed to start session",
    description: error instanceof Error ? error.message : "Unknown error",
    variant: "destructive",
  });
}
```

- Silent console logging for non-critical errors:
```typescript
catch (e) {
  console.error("Failed to parse WebSocket message:", e);
}
```

## Logging

**Framework:** Native `console` methods

**Patterns:**
- `console.error` for caught exceptions
- No structured logging framework
- Minimal logging overall

## Comments

**When to Comment:**
- Section dividers in API client (e.g., `// --- Repos ---`, `// --- Sessions ---`)
- Complex logic explanations (sparingly used)
- TODO comments for future work

**JSDoc/TSDoc:**
- Not systematically used
- Interface properties are self-documenting via TypeScript types

## Function Design

**Size:**
- Keep functions focused; split into helper functions when logic becomes complex
- React components typically under 200 lines

**Parameters:**
- Use destructuring for props: `function MainPanel({ activeInstance, onStartSession, repos }: MainPanelProps)`
- Optional parameters with defaults: `function useWebSocket(options: UseWebSocketOptions = {})`
- Complex parameters use typed objects

**Return Values:**
- Explicit return types for API functions
- Inferred types acceptable for simple components and hooks
- Return objects for hooks with multiple values:
```typescript
return {
  isConnected,
  subscribe,
  unsubscribe,
  cancel,
};
```

## Module Design

**Exports:**
- Named exports preferred over default exports for utilities and hooks
- Default exports for page components (e.g., `export default Index`)
- Barrel exports via `index.ts` files:
```typescript
// frontend/src/api/index.ts
export * from "./types";
export * from "./client";
export * from "./hooks";
```

**Barrel Files:**
- Used in `frontend/src/api/index.ts` for API layer re-exports
- UI components not using barrel files (import from specific component file)

## React Patterns

**Component Structure:**
```typescript
interface ComponentProps {
  prop1: Type1;
  prop2?: Type2;
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // hooks
  const [state, setState] = useState();

  // derived values / memos
  const computed = useMemo(() => ..., [deps]);

  // callbacks
  const handleAction = useCallback(() => ..., [deps]);

  // effects
  useEffect(() => ..., [deps]);

  // early returns for loading/error states
  if (loading) return <Loading />;

  // render
  return <div>...</div>;
}
```

**State Management:**
- React Query (TanStack Query) for server state
- Local `useState` for UI state
- Query key factories for consistent cache management:
```typescript
export const queryKeys = {
  repos: ["repos"] as const,
  sessions: ["sessions"] as const,
  session: (id: string) => ["sessions", id] as const,
};
```

**UI Components:**
- shadcn/ui component library (Radix UI primitives + Tailwind CSS)
- class-variance-authority (cva) for component variants
- `cn()` utility for conditional class merging

## CSS/Styling

**Framework:** Tailwind CSS

**Patterns:**
- Utility-first classes directly in JSX
- `cn()` helper from `@/lib/utils` for conditional classes:
```typescript
<div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
```

- CSS variables for theming (defined in `index.css`)
- Dark mode via `class` strategy

**Custom Classes:**
- Defined in `frontend/tailwind.config.ts` theme extensions
- Semantic color tokens: `primary`, `secondary`, `muted`, `destructive`, `agent-running`, etc.

---

*Convention analysis: 2026-01-17*
