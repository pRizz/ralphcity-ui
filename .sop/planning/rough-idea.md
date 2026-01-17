# Rough Idea: Ralph CLI Integration with Gascountry UI

## Source
User request during PDD session

## Idea
Integrate the AI agent functionality with the ralph CLI from https://github.com/pRizz/ralph-orchestrator such that the conversations in the UI get passed to a ralph command on the backend and the user can have a conversation with it with the goal of being able to change code and implement things.

## Context

### Current State - Gascountry UI
- React/TypeScript/Vite frontend with shadcn-ui components
- Chat-style interface for AI agent conversations
- Currently uses mock data - no real backend integration
- Structures for: instances (GastownInstance), chat messages, repo selection, model selection
- Ready for backend integration (React Query installed but unused)

### Target Integration - Ralph Orchestrator
- Rust-based CLI for AI agent orchestration
- Key commands: `ralph run`, `ralph resume`, `ralph plan`, `ralph task`
- Event-driven architecture with specialized agent "hats"
- Supports multiple AI backends (Claude Code, Gemini, Codex, etc.)
- Uses PROMPT.md files and scratchpad for state management
- Fresh context per iteration prevents drift

## Goal
Enable users to interact with ralph through the gascountry UI to:
1. Send prompts/messages that get executed as ralph commands
2. Have conversations that can modify code in repositories
3. Track the progress and output of ralph executions
4. Implement features and changes through natural language
