# Testing Patterns

**Analysis Date:** 2026-01-17

## Test Framework

**Runner:**
- Vitest 3.2.4
- Config: `frontend/vitest.config.ts`

**Assertion Library:**
- Vitest built-in assertions (`expect`)
- `@testing-library/jest-dom` for DOM matchers

**Run Commands:**
```bash
npm test              # Run all tests once (vitest run)
npm run test:watch    # Watch mode (vitest)
```

## Test File Organization

**Location:**
- Tests live in `frontend/src/test/` directory (separate from source)
- Pattern: Centralized test directory rather than co-located

**Naming:**
- `*.test.ts` or `*.test.tsx` suffix
- Example: `example.test.ts`

**Structure:**
```
frontend/
  src/
    test/
      setup.ts        # Test setup and global mocks
      example.test.ts # Test files
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from "vitest";

describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
```

**Patterns:**
- `describe()` blocks for grouping related tests
- `it()` for individual test cases
- Explicit imports from `vitest` (globals enabled but explicit import preferred)

**Setup:**
- Global setup file: `frontend/src/test/setup.ts`
- Imports `@testing-library/jest-dom` for extended matchers
- Mocks browser APIs not available in jsdom:
```typescript
import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
```

## Vitest Configuration

**Config file:** `frontend/vitest.config.ts`
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

**Key Settings:**
- `environment: "jsdom"` - Browser-like DOM environment
- `globals: true` - Vitest globals available without import
- `setupFiles` - Runs setup before each test file
- `include` pattern matches `.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx`
- Path alias `@/` mirrors app configuration

## Mocking

**Framework:** Vitest built-in mocking (`vi`)

**Patterns:**
- Browser APIs mocked in setup file (e.g., `matchMedia`)
- No extensive mocking patterns observed in current tests

**What to Mock:**
- Browser APIs not available in jsdom (`matchMedia`, `ResizeObserver`, etc.)
- External API calls (when testing components with API dependencies)
- WebSocket connections

**What NOT to Mock:**
- React Query hooks (use `QueryClientProvider` wrapper instead)
- UI component internals

## Fixtures and Factories

**Test Data:**
- Mock data located in `frontend/src/data/mockData.ts`
- Contains realistic test fixtures:
```typescript
export const mockRepositories: Repository[] = [
  {
    id: "1",
    fullName: "pRizz/degen-server",
    owner: "pRizz",
    name: "degen-server",
    defaultBranch: "main",
    branches: ["main", "develop", "feature/api-v2"],
  },
  // ...
];

export const mockRalphtownInstances: RalphtownInstance[] = [
  // ...
];
```

**Location:**
- `frontend/src/data/mockData.ts` - Shared mock data
- Can be used in both tests and development

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
npx vitest --coverage    # Not configured but available
```

## Test Types

**Unit Tests:**
- Minimal unit tests currently present
- Only example test in `frontend/src/test/example.test.ts`
- Focus on isolated function/component testing

**Integration Tests:**
- Not currently implemented

**E2E Tests:**
- Not currently implemented
- No Playwright, Cypress, or similar framework detected

## Common Patterns

**Async Testing:**
```typescript
import { describe, it, expect } from "vitest";

describe("async example", () => {
  it("should handle async operations", async () => {
    const result = await someAsyncFunction();
    expect(result).toBe(expected);
  });
});
```

**Error Testing:**
```typescript
describe("error handling", () => {
  it("should throw on invalid input", () => {
    expect(() => functionThatThrows()).toThrow();
  });
});
```

**React Component Testing:**
```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });
});
```

## Testing Libraries Available

**Installed:**
- `vitest` - Test runner
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Custom DOM matchers
- `jsdom` - DOM implementation for Node.js

**Usage:**
```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
```

## Recommendations for New Tests

**Component Tests:**
1. Wrap with necessary providers (QueryClientProvider, TooltipProvider)
2. Use `@testing-library/react` for rendering
3. Test user interactions with `fireEvent` or `userEvent`

**Hook Tests:**
1. Use `@testing-library/react` `renderHook` for custom hooks
2. Mock API calls with `vi.mock()`

**API Client Tests:**
1. Mock `fetch` globally
2. Test success and error paths
3. Verify request payloads and headers

---

*Testing analysis: 2026-01-17*
