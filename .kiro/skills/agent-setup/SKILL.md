---
name: agent-setup
description: Set up and use Agent Skills in this workspace. Use when creating or editing skills, validating SKILL.md files, understanding the skill directory structure, or when the user asks about agent setup, skill format, or skills.every.to/agent-setup instructions.
compatibility: Requires Node.js for skills-ref validation. Skills are discovered under .kiro/skills/
metadata:
  spec: https://agentskills.io/specification
  ref: https://github.com/agentskills/agentskills
---

# Agent Setup — Agent Skills in This Workspace

Follow the [Agent Skills specification](https://agentskills.io/specification) and the instructions from skills.every.to/agent-setup (and agentskills.io). This skill summarizes the format and how skills are used in this repo.

## Directory structure

A skill is a **directory** with at least `SKILL.md`. Optional support dirs:

```
skill-name/
├── SKILL.md          # Required: YAML frontmatter + Markdown body
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation loaded on demand
└── assets/           # Optional: templates, images, data
```

In this repo, skills live under **`.kiro/skills/`** (e.g. `.kiro/skills/agent-setup/`, `.kiro/skills/agent-browser/`, `.kiro/skills/e2e-test/`).

## SKILL.md format

### Frontmatter (required)

```yaml
---
name: skill-name
description: What this skill does and when to use it. Include trigger keywords so the agent knows when to activate it.
---
```

- **name**: Required. 1–64 chars, lowercase letters, numbers, hyphens only. Must **match the parent directory name**. No leading/trailing or consecutive hyphens.
- **description**: Required. 1–1024 chars. Describe both **what** the skill does and **when** to use it (trigger phrases).

Optional frontmatter: `license`, `compatibility`, `metadata` (key-value), `allowed-tools` (experimental).

### Body

Markdown after the frontmatter contains the skill instructions. No format restrictions. Recommended: step-by-step procedures, edge cases, examples. Keep the main body under ~500 lines; put long reference material in `references/`.

## Progressive disclosure

1. **Metadata (~100 tokens)**: At startup, only `name` and `description` of each skill are loaded.
2. **Instructions**: When a task matches a skill’s description, the full `SKILL.md` body is loaded.
3. **Resources**: Files in `scripts/`, `references/`, `assets/` are loaded only when needed.

## Validation

Validate a skill with the skills-ref CLI:

```bash
skills-ref validate ./.kiro/skills/<skill-name>
```

Or from the skill directory:

```bash
skills-ref validate ./agent-setup
```

This checks frontmatter and naming. Install from [github.com/agentskills/agentskills](https://github.com/agentskills/agentskills) (skills-ref) if needed.

## Creating a new skill

1. Create a directory under `.kiro/skills/<skill-name>/` (name = lowercase, hyphens only, matches dir).
2. Add `SKILL.md` with valid frontmatter (`name` matching directory, `description` with trigger phrases).
3. Add body content: overview, workflow, examples.
4. Optionally add `scripts/`, `references/`, `assets/`.
5. Run `skills-ref validate ./.kiro/skills/<skill-name>`.

## File references in skills

Use relative paths from the skill root:

```markdown
See [reference](references/REFERENCE.md).
Run: scripts/helper.py
```

Keep references one level deep from `SKILL.md`.

## Integration (for agent builders)

To support skills in an agent: parse each `SKILL.md` frontmatter and inject metadata into the system prompt, e.g.:

```xml
<available_skills>
  <skill>
    <name>agent-setup</name>
    <description>Set up and use Agent Skills in this workspace...</description>
    <location>.kiro/skills/agent-setup/SKILL.md</location>
  </skill>
</available_skills>
```

When the agent decides a skill is relevant, it loads the full `SKILL.md` from `<location>`.

## References

- Specification: https://agentskills.io/specification
- Integrate skills: https://agentskills.io/integrate-skills
- Reference library: https://github.com/agentskills/agentskills (skills-ref)
- Example skills: https://github.com/anthropics/skills
