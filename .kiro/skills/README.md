# Agent Skills (this repo)

Skills follow the [Agent Skills](https://agentskills.io/specification) open format. Each skill is a directory with a `SKILL.md` file.

## Skills in this workspace

| Skill          | Description |
|----------------|-------------|
| **agent-setup** | Set up and use Agent Skills; SKILL.md format, validation, discovery. Use when creating/editing skills or following skills.every.to/agent-setup. |
| **agent-browser** | Browser automation for testing: navigate, snapshot, click, fill, screenshots. Use for web testing and form interaction. |
| **e2e-test** | End-to-end testing: research codebase, run agent-browser over user journeys, DB validation, screenshots. Use after implementation. |

## Discovery

Agents should scan `.kiro/skills/*/SKILL.md` and read frontmatter (`name`, `description`) at startup. Load full `SKILL.md` when a task matches a skill’s description.

## Validation

```bash
npx skills-ref validate ./.kiro/skills/agent-setup
# or, if installed globally:
skills-ref validate ./.kiro/skills/<skill-name>
```
