# Technology Stack

**Analysis Date:** 2026-01-17

## Languages

**Primary:**
- TypeScript 5.8.x - Frontend React application (`frontend/src/`)
- Rust (Edition 2024) - Backend server (`backend/src/`)

**Secondary:**
- JavaScript - Configuration files (ESLint, PostCSS)
- SQL - Database schema definitions (`backend/src/db/schema.rs`)

## Runtime

**Frontend:**
- Node.js (ES Modules, `"type": "module"` in package.json)
- Browser environment (ES2020 target)

**Backend:**
- Rust with Tokio async runtime (full features enabled)
- Compiled binary: `ralphtown`

**Package Managers:**
- npm (lockfileVersion 3) - Frontend: `frontend/package-lock.json`
- Cargo - Backend: `Cargo.lock` at project root

## Frameworks

**Frontend Core:**
- React 18.3.x - UI library
- Vite 5.4.x - Build tool and dev server
- React Router DOM 6.30.x - Client-side routing

**Backend Core:**
- Axum 0.8 - Web framework (with WebSocket support)
- Tokio 1.x - Async runtime (full features)
- Tower HTTP 0.6 - CORS middleware

**UI Components:**
- Radix UI - Comprehensive primitive components (dialog, dropdown, tabs, etc.)
- shadcn/ui pattern - Component library built on Radix + Tailwind
- Lucide React 0.462.x - Icon library

**Styling:**
- Tailwind CSS 3.4.x - Utility-first CSS
- tailwindcss-animate 1.0.x - Animation utilities
- class-variance-authority 0.7.x - Variant management
- tailwind-merge 2.6.x - Class merging utilities

**State & Data:**
- TanStack React Query 5.83.x - Server state management
- React Hook Form 7.61.x - Form handling
- Zod 3.25.x - Schema validation

**Testing:**
- Vitest 3.2.x - Test runner (frontend)
- Testing Library React 16.0.x - React component testing
- jsdom 20.x - DOM environment for tests
- axum-test 18 - Backend API testing (Rust)
- tempfile 3 - Temporary files in tests (Rust)

## Key Dependencies

**Frontend Critical:**
- `@tanstack/react-query` - All API data fetching wraps through React Query hooks
- `react-router-dom` - Page routing and navigation
- `sonner` - Toast notifications
- `recharts` - Data visualization

**Frontend UI:**
- `@radix-ui/*` - Extensive use (~25 Radix packages) for accessible primitives
- `cmdk` - Command palette component
- `vaul` - Drawer component
- `embla-carousel-react` - Carousel functionality
- `date-fns` + `react-day-picker` - Date handling and picker

**Backend Critical:**
- `rusqlite` 0.33 (bundled) - SQLite database with foreign key support
- `git2` 0.20 - Git operations (libgit2 bindings)
- `serde` + `serde_json` - JSON serialization
- `uuid` 1.x (v4, serde) - Unique identifiers

**Backend Infrastructure:**
- `tokio` - Async I/O and task spawning
- `futures` 0.3 - Stream utilities for WebSocket
- `nix` 0.29 - Unix process signal handling (SIGTERM/SIGKILL)
- `service-manager` 0.10 - Cross-platform service installation
- `rust-embed` 8 - Embedding static frontend assets
- `clap` 4 (derive) - CLI argument parsing
- `tracing` + `tracing-subscriber` - Structured logging
- `chrono` 0.4 (serde) - Datetime handling
- `thiserror` 2 - Error derive macros
- `dirs` 6 - Platform data directory detection

## Configuration

**TypeScript:**
- Config: `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`
- Target: ES2020
- Module: ESNext with bundler resolution
- Strict mode: Disabled (relaxed type checking)
- Path alias: `@/*` maps to `./src/*`

**Vite:**
- Config: `frontend/vite.config.ts`
- Dev server: Port 8080, HMR overlay disabled
- Plugins: `@vitejs/plugin-react-swc` (SWC-based React transform)
- Development only: `lovable-tagger` component tagger

**Tailwind:**
- Config: `frontend/tailwind.config.ts`
- Dark mode: Class-based (`darkMode: ["class"]`)
- Custom theme: Extended colors for sidebar, diff, agent states
- Typography plugin: `@tailwindcss/typography`
- CSS variables for theming (HSL color system)

**ESLint:**
- Config: `frontend/eslint.config.js` (flat config format)
- Extends: JS recommended, TypeScript recommended
- Plugins: react-hooks, react-refresh
- Unused vars rule: Disabled

**Vitest:**
- Config: `frontend/vitest.config.ts`
- Environment: jsdom
- Globals: true (implicit imports)
- Setup file: `frontend/src/test/setup.ts`
- Pattern: `src/**/*.{test,spec}.{ts,tsx}`

**Rust/Cargo:**
- Workspace config: `Cargo.toml` at root
- Backend package: `backend/Cargo.toml`
- Edition: 2024
- Binary name: `ralphtown`

## Platform Requirements

**Development:**
- Node.js (ES Modules support, lockfileVersion 3 suggests Node 16+)
- Rust toolchain (2024 edition)
- npm for frontend package management
- cargo for Rust builds

**Production:**
- Single binary deployment (`ralphtown`)
- Frontend embedded in binary via `rust-embed`
- SQLite database file at platform data directory
- External CLI dependency: `ralph` command must be available in PATH

**Service Installation:**
- macOS: LaunchAgent (user-level, `~/Library/LaunchAgents/`)
- Linux: systemd user service
- Windows: Windows Service

**Server Ports:**
- Backend API: `127.0.0.1:3000`
- Frontend dev server: `::8080`

---

*Stack analysis: 2026-01-17*
