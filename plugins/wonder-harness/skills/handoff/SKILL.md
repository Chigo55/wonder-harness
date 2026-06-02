---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work.

**저장 경로 결정 순서:**
1. `CLAUDE.md` 에 handoff 저장 경로가 명시된 경우 → 해당 경로 사용
2. 경로 없음 → OS 임시 디렉터리에 `wh-handoff-{timestamp}.md` 로 저장

Include a "suggested skills" section in the document, which suggests skills that the agent should invoke.

Do not duplicate content already captured in other artifacts (PRDs, plans, ADRs, issues, commits, diffs). Reference them
by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc
accordingly.