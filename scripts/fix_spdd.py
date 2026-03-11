"""Create SKILL.md for SPDD skill folder."""
from pathlib import Path

skill_md = Path.home() / ".kiro" / "skills" / "SPDD" / "SKILL.md"
content = """---
name: SPDD
description: "Spec-Plan-Driven Development workflow with 3 phases: codebase research, spec writing, and implementation. Guides structured development from analysis to code."
---

# SPDD - Spec-Plan-Driven Development

A structured development workflow in 3 phases:

1. **Research** (1-research.md) - Codebase cartography: document what exists, where, and how components interact.
2. **Spec** (2-spec.md) - Write detailed specifications based on research findings.
3. **Implementation** (3-implementation.md) - Execute the spec with disciplined implementation.
"""
skill_md.write_text(content, encoding="utf-8")
print(f"Created: {skill_md}")
