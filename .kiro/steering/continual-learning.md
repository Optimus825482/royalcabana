# Continual Learning with Qdrant Memory

Persistent cross-session learning via Qdrant vector memory. Prevents context rot by retrieving only relevant memories on-demand.

## Session Start

1. Identify task domain from user's first message
2. `mcp_qdrant_memory_mem_search` with concise domain query, tags: `["continual-learning"]`, limit 5
3. Apply retrieved learnings silently — never narrate memory ops

## Memory Categories

| Category        | Tag               | Store                                |
| --------------- | ----------------- | ------------------------------------ |
| Task Continuity | `task-continuity` | Incomplete task state for resumption |
| User Preference | `user-preference` | Coding style, naming, workflow       |
| Workspace Fact  | `workspace-fact`  | Architecture, tech stack, structure  |
| Bug Fix         | `bug-fix`         | Root cause + solution                |
| Performance     | `performance`     | N+1, index, bundle fixes             |
| Architecture    | `architecture`    | Patterns, boundaries, data flow      |
| Gotcha          | `gotcha`          | Framework quirks, edge cases         |

## Task Continuity Protocol

Session-end: if task incomplete → store state with `task-continuity` tag.
Session-start: search `task-continuity` → offer to resume.
On task completion: delete stale `task-continuity` entries.
Format: `INCOMPLETE TASK: [goal] | STATUS: [where stopped] | NEXT: [action items] | FILES: [paths]`

## Dedup Protocol

Before storing: search with candidate content. Similarity >0.85 → SKIP. 0.7-0.85 → UPDATE if new value. <0.7 → STORE.

## Content Format

Clear, actionable statement with file paths: `"withAuth() in src/lib/api-middleware.ts handles auth+RBAC+rate limiting. All API routes must use it."`

## Rules

- Never load all memories at start (context rot)
- Never store trivial Q&A, secrets, PII, or what's already in AGENTS.md/steering
- Tag with project name for project-specific, omit for universal patterns
- Cross-project: search without project filter first on new projects
