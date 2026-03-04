# Agent Skills specification (summary)

Full spec: https://agentskills.io/specification

## Frontmatter constraints

| Field         | Required | Constraints |
|---------------|----------|-------------|
| `name`        | Yes      | 1–64 chars, lowercase, [a-z0-9-], no leading/trailing/consecutive hyphens, must match parent directory name |
| `description` | Yes      | 1–1024 chars, non-empty; describe what the skill does and when to use it |
| `license`     | No       | Short license name or reference |
| `compatibility` | No     | Max 500 chars, environment requirements |
| `metadata`    | No       | Key-value map |
| `allowed-tools` | No     | Space-delimited list (experimental) |

## Optional directories

- **scripts/** — Executable code; self-contained or documented deps.
- **references/** — Docs loaded on demand; keep files focused.
- **assets/** — Static resources (images, templates, data); not loaded into context by default.

## Progressive disclosure

1. Metadata only at startup (~50–100 tokens per skill).
2. Full SKILL.md when the skill is activated (<5000 tokens recommended).
3. scripts/references/assets loaded only when needed.

## Validation

```bash
skills-ref validate ./path/to/skill
```

Install: https://github.com/agentskills/agentskills (skills-ref).
