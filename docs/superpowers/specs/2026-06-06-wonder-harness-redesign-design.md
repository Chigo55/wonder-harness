# wonder-harness Redesign — Design Spec

**Date:** 2026-06-06  
**Status:** Approved  
**Scope:** Full redesign of the wonder-harness plugin as a universal development workflow framework

---

## 1. Problem Statement

The current wonder-harness is tightly coupled to the Spring Boot + MyBatis + Thymeleaf + Kendo stack. It provides a 4-stage pipeline (planner→templater→developer→ruler) but lacks:

- Stack-agnostic applicability
- A universal entry point for all development work
- Strict, enforced workflow ordering across all task types
- Mandatory deliverables per stage

## 2. Design Goals

1. **Deterministic workflow ordering** — every development task follows the same 6-stage sequence; the order is non-negotiable when using commands
2. **Mandatory deliverables** — every stage produces a concrete artifact (document section or code files)
3. **Stack-agnostic** — the framework adapts to any project via project-generated rules (`.claude/rules/`), not built-in profiles
4. **Dual-mode enforcement** — command mode enforces all stages; prompt mode recommends the workflow via CLAUDE.md rules
5. **Extensible scope** — initially covers all development work; architecture supports extension to all Claude tasks in the future

---

## 3. Architecture Overview

```
wonder-harness (framework)
│
├── /wh-init          ← Project initialization (once per project)
│     └── ruler       → generates .claude/rules/ from codebase analysis
│
├── /wh-run           ← Development task entry point (per task)
│     └── orchestrator
│           ├── analyzer   (Stage 1: Analysis)
│           ├── researcher (Stage 2: Research)
│           ├── planner    (Stage 3: Planning)
│           ├── developer  (Stage 4: Implementation)
│           ├── inspector  (Stage 5: Inspection)
│           └── modifier   (Stage 6: Modification → delegates back to developer)
│
└── hooks             ← Workflow enforcement
      ├── PreToolUse  → blocks out-of-order Write/Edit attempts
      └── PostToolUse → records stage completion in state.json
```

**Core principles:**
- `/wh-run` is the single entry point for all development work
- The orchestrator has exclusive control over stage sequencing
- Individual agents handle only their stage's work; they have no sequencing authority
- Project-specific `.claude/rules/` files are the sole source of stack context

---

## 4. The 6-Stage Workflow

All development tasks follow this fixed sequence:

| # | Stage | Agent | Purpose |
|---|-------|-------|---------|
| 1 | 분석 (Analysis) | analyzer | Understand current state, scope, requirements |
| 2 | 자료조사 (Research) | researcher | Gather codebase patterns + external docs (Context7, web) |
| 3 | 계획 (Planning) | planner | Implementation plan, file list, step breakdown |
| 4 | 구현 (Implementation) | developer | Write code to project paths |
| 5 | 검사 (Inspection) | inspector | Quality, functional correctness, security, rules compliance |
| 6 | 수정 (Modification) | modifier | Prioritize fixes → delegate to developer |

**Enforcement strictness by mode:**

| Mode | Enforcement |
|------|------------|
| `/wh-run` command | All 6 stages mandatory. Content may be minimal but stage cannot be skipped. |
| Plain prompt | Workflow recommended via CLAUDE.md rules. No hook enforcement. |

**Post-modification behavior:** Inspector presents a report. User decides whether to re-run inspection or close the task.

---

## 5. Agent Responsibilities

### orchestrator
- Receives task definition (command argument or request doc)
- Asks clarifying questions to concretize requirements
- Gets user confirmation before starting the pipeline
- Controls stage transitions: invokes each agent in order, passes prior stage output
- No file-writing authority of its own

### analyzer
- **Input:** task definition + `.claude/rules/`
- **Output:** `work-doc.md §Analysis` — current state, affected scope, clarified requirements

### researcher
- **Input:** §Analysis result
- **Output:** `work-doc.md §Research` — codebase patterns, external library docs, references

### planner
- **Input:** §Analysis + §Research
- **Output:** `work-doc.md §Planning` — implementation steps, file list, decision rationale

### developer
- **Input:** §Planning + `.claude/rules/`
- **Output:** code files written to actual project paths

### inspector
- **Input:** code files + §Planning + `.claude/rules/`
- **Checks:** code quality, functional correctness vs plan, security, project rules compliance
- **Output:** `inspection-report.md`

### modifier
- **Input:** `inspection-report.md`
- **Output:** `modification-report.md` (prioritized fix list) + delegates fixes to developer

### ruler (init only)
- Used exclusively by `/wh-init`
- Analyzes codebase → generates ADRs → generates `.claude/rules/` files

---

## 6. Deliverables Structure

```
.claude/
├── runs/
│   └── {run-id}/                    ← one folder per task (e.g. 20260606-jwt-auth)
│       ├── work-doc.md              ← analysis + research + planning (bundled)
│       ├── inspection-report.md
│       └── modification-report.md   ← only when Stage 6 runs
│
├── requests/
│   ├── create_request.md            ← complex task input form
│   └── modify_request.md
│
└── rules/                           ← generated by wh-init, read by agents
    ├── backend.md
    ├── frontend.md
    └── security.md
```

**Rules:**
- `work-doc.md` is created by orchestrator; each agent appends its section
- Code files are written directly to project paths (not copied under `runs/`)
- `run-id` format: `YYYYMMDD-{task-slug}`
- Reports in `runs/` serve as an auditable task history

---

## 7. State Management & Hook Enforcement

**State file:** `.claude/runs/{run-id}/state.json` — written by orchestrator at pipeline start, updated by PostToolUse hook after each stage completes.

```json
{
  "run-id": "20260606-jwt-auth",
  "task": "JWT 인증 추가",
  "current-stage": "developer",
  "stages": {
    "analyzer":   "completed",
    "researcher": "completed",
    "planner":    "completed",
    "developer":  "in_progress",
    "inspector":  null,
    "modifier":   null
  }
}
```

**PreToolUse hook logic (Write/Edit):**

```
On Write/Edit attempt:
  1. Check if current.command == "wh-run" → if not, allow (prompt mode)
  2. Load state.json for active run
  3. Verify target file is permitted for current-stage:
       work-doc.md §Analysis    → analyzer only
       work-doc.md §Research    → researcher only
       work-doc.md §Planning    → planner only
       code files               → developer or modifier-delegated developer
       inspection-report.md     → inspector only
       modification-report.md   → modifier only
  4. Violation → deny + display stage violation message
```

**Prompt mode:** hooks only activate when `current.command` is `wh-run`. Plain conversation is never blocked; CLAUDE.md includes a rule recommending the 6-stage workflow.

---

## 8. Initialization (`/wh-init`)

Run once per project before using `/wh-run`.

```
/wh-init [--backend] [--frontend] [--security]
  │
  ├── 1. Codebase exploration (ruler)
  │       Extract conventions, patterns, dependencies per layer
  │
  ├── 2. ADR generation
  │       Infer 3–7 architectural decisions → .claude/adr/{layer}.md
  │       User confirmation required
  │
  ├── 3. Rule generation
  │       ADR-based → .claude/rules/{layer}.md
  │       User confirmation required
  │
  └── 4. Init report
          .claude/reports/wh-init-{layer}-{timestamp}.html
```

- No flags → all layers (backend, frontend, security) processed in sequence
- Existing rule files → prompt user: overwrite or skip
- `.claude/rules/` is the single source of stack knowledge for all agents

---

## 9. Task Input

| Input method | When to use |
|-------------|-------------|
| Command argument: `/wh-run "add JWT auth"` | Simple, self-explanatory tasks |
| Request document: `/wh-run` (reads `create_request.md`) | Complex tasks requiring detailed specification |

In both cases, the orchestrator asks clarifying questions before starting the pipeline and gets user confirmation.

---

## 10. Commands & Plugin Structure

**Commands:**

| Command | Role |
|---------|------|
| `/wh-init` | Project initialization; generates `.claude/rules/` |
| `/wh-run` | Run the 6-stage development pipeline |
| `/wh-review` | Re-run inspection only against an existing run-id |

**Plugin structure (after redesign):**

```
plugins/wonder-harness/
├── agents/
│   ├── orchestrator.md   ← new
│   ├── analyzer.md       ← new
│   ├── researcher.md     ← new
│   ├── planner.md        ← rewrite
│   ├── developer.md      ← rewrite
│   ├── inspector.md      ← new (replaces ruler in pipeline)
│   ├── modifier.md       ← new
│   └── ruler.md          ← retain (wh-init only; not part of wh-run pipeline)
├── commands/
│   ├── wh-init.md        ← rewrite
│   ├── wh-run.md         ← new (replaces wh-create + wh-modify)
│   └── wh-review.md      ← retain
├── hooks/                ← rewrite (stage-based file permission enforcement)
├── rules/                ← rewrite (stack-agnostic meta-rules)
└── requests/             ← retain (create_request, modify_request)
```

**Removed:** `wh-create.md`, `wh-modify.md`, `templater.md`, Spring Boot-specific meta-rules

---

## 11. Out of Scope (this iteration)

- Extension to non-development tasks (documents, analysis, etc.) — planned for a future version
- Testing enforcement (excluded: manual-only tests cannot be automated)
- Multi-project orchestration
