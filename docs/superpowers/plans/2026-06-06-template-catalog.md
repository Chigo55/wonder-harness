# Template Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable template catalog to wonder-harness so that researcher surfaces existing templates to developer and marks new candidates for promotion via `/wh-template`.

**Architecture:** Templates are stored at `${CLAUDE_PLUGIN_ROOT}/templates/` (plugin-level, shared). `index.json` is a lightweight tag-indexed catalog; each template is a markdown file at `scaffolds/{id}.md`. Researcher gains Step 0 (lookup + inject) and Step 4 (candidate marking). `/wh-template` delegates CRUD to ruler via new template modes.

**Tech Stack:** Markdown (agent/command definitions), JSON (schema + catalog index) — no executable code.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `plugins/wonder-harness/templates/index.seed.json` | Delete | Replaced by index.json |
| `plugins/wonder-harness/templates/index.json` | Create | Catalog index with expanded schema |
| `plugins/wonder-harness/templates/index.schema.json` | Modify | Reflect new fields (name, tags, source, addedFrom) |
| `plugins/wonder-harness/templates/scaffolds/.gitkeep` | Delete | Activate directory for real template files |
| `plugins/wonder-harness/agents/researcher.md` | Modify | Add Step 0 (template lookup + inject) and Step 4 (candidate marking) |
| `plugins/wonder-harness/agents/ruler.md` | Modify | Add template-promote, template-add, template-edit, template-delete modes |
| `plugins/wonder-harness/commands/wh-template.md` | Create | promote / add / edit / delete subcommands |
| `plugins/wonder-harness/rules/workflow.md` | Modify | Note template lookup and candidate marking in Stage 2 row |

---

## Task 1: Upgrade Template Storage

**Files:**
- Delete: `plugins/wonder-harness/templates/index.seed.json`
- Create: `plugins/wonder-harness/templates/index.json`
- Modify: `plugins/wonder-harness/templates/index.schema.json`
- Delete: `plugins/wonder-harness/templates/scaffolds/.gitkeep`

- [ ] **Step 1: Remove index.seed.json**

```bash
git rm plugins/wonder-harness/templates/index.seed.json
```

Expected: `rm 'plugins/wonder-harness/templates/index.seed.json'`

- [ ] **Step 2: Create index.json**

Write `plugins/wonder-harness/templates/index.json`:

```json
{
  "version": 1,
  "templates": []
}
```

- [ ] **Step 3: Update index.schema.json**

Write `plugins/wonder-harness/templates/index.schema.json` (replace entire file):

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "wonder-harness template catalog index",
  "type": "object",
  "required": ["version", "templates"],
  "properties": {
    "version": { "type": "integer", "const": 1 },
    "templates": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "tags", "description", "source"],
        "properties": {
          "id": {
            "type": "string",
            "pattern": "^[a-z0-9-]+$",
            "description": "Kebab-case slug, unique across the catalog"
          },
          "name": { "type": "string" },
          "tags": {
            "type": "array",
            "items": { "type": "string" },
            "minItems": 1,
            "description": "Used by researcher for keyword matching"
          },
          "description": { "type": "string" },
          "source": {
            "type": "string",
            "enum": ["codebase", "external"],
            "description": "codebase = found in project code; external = from library/framework docs"
          },
          "addedFrom": {
            "type": "string",
            "description": "Run ID where the pattern was first discovered (e.g. runs/2026-06-06-001)"
          }
        }
      }
    }
  }
}
```

- [ ] **Step 4: Remove .gitkeep**

```bash
git rm plugins/wonder-harness/templates/scaffolds/.gitkeep
```

Expected: `rm 'plugins/wonder-harness/templates/scaffolds/.gitkeep'`

- [ ] **Step 5: Verify**

Read `plugins/wonder-harness/templates/index.json` and confirm:
- `"version": 1`
- `"templates": []`

Read `plugins/wonder-harness/templates/index.schema.json` and confirm the new fields (`name`, `tags`, `source`, `addedFrom`) appear in `properties`.

- [ ] **Step 6: Commit**

```bash
git add plugins/wonder-harness/templates/
git commit -m "feat(templates): replace index.seed.json with index.json, update schema"
```

---

## Task 2: Update researcher.md

**Files:**
- Modify: `plugins/wonder-harness/agents/researcher.md`

- [ ] **Step 1: Read current researcher.md**

Read `plugins/wonder-harness/agents/researcher.md` to confirm current content before editing.

- [ ] **Step 2: Write updated researcher.md**

Replace the entire file with:

```markdown
---
name: researcher
description: Stage 2 of the wonder-harness pipeline. Looks up existing templates, gathers codebase patterns and external references, and marks template candidates. Writes §Research to the run's work-doc.md. Invoked by orchestrator only.
tools: Read, Grep, Glob, Write, WebSearch, WebFetch, mcp__plugin_context7_context7__resolve-library-id, mcp__plugin_context7_context7__query-docs
---

# researcher

Performs Stage 2 (Research) of the wonder-harness pipeline.

## Inputs

- §Analysis from `work-doc.md`
- `.claude/rules/` — project-specific rules
- `${CLAUDE_PLUGIN_ROOT}/templates/index.json` — template catalog (may be empty)

## Process

### Step 0 — Template Lookup

1. Read `${CLAUDE_PLUGIN_ROOT}/templates/index.json`. If `templates` array is empty, skip to Step 1.
2. Extract task keywords from §Analysis (technology names, pattern types, layer names).
3. For each template entry in the index, check whether any of its `tags` match the extracted keywords.
4. For each match, read `${CLAUDE_PLUGIN_ROOT}/templates/scaffolds/{id}.md`.
5. Embed matched templates in §Research under **Available templates** (see Deliverable). If no templates match, omit the **Available templates** section entirely.

### Step 1 — Codebase Patterns

Search the existing codebase for patterns relevant to the implementation. Use Grep to find similar implementations. Read 2–4 representative files.

### Step 2 — External References

For any library, framework API, or external spec mentioned in §Analysis, use Context7 (preferred) or web search to retrieve current documentation. Only research what is directly needed.

### Step 3 — Compile Findings

Synthesize codebase patterns and external references into actionable findings.

### Step 4 — Candidate Marking

Review all findings from Steps 1–2. For each pattern that meets a criterion below, append `**[TEMPLATE CANDIDATE]** tags: {relevant-tags}` directly after the pattern entry:

- **Codebase**: pattern appears in ≥ 2 distinct files
- **External**: directly reusable across future tasks (recurring API shape, configuration block, call pattern)

Mark sparingly. Fewer, high-value candidates are better than many noisy ones.

## External Research Priority

1. Context7 (`mcp__plugin_context7_context7__resolve-library-id` + `query-docs`) — use for any known library
2. WebSearch / WebFetch — use only if Context7 lacks coverage

## Deliverable

Append to `.claude/runs/{run-id}/work-doc.md`, replacing `## Research` placeholder:

```markdown
## Research

**Available templates:** *(omit entire section if no templates matched)*
- `{id}` — {name} (tags: {tag1}, {tag2})

  {full content of scaffolds/{id}.md embedded here}

**Codebase patterns:**
- {pattern or convention found} — {file reference}
  **[TEMPLATE CANDIDATE]** tags: {tags}  ← append only if criterion met
- ...

**External references:**
- {library / spec}: {key finding relevant to this task}
  **[TEMPLATE CANDIDATE]** tags: {tags}  ← append only if criterion met
- ...

**Key decisions informed by research:**
- {decision} — {rationale from research}
```

## Constraints

- Do not write to any file other than `work-doc.md` during this stage.
- Do not propose implementation steps — that is planner's role.
- Research scope must be limited to what §Analysis identified as needed.
- Mark template candidates only when ≥ 2 files criterion (codebase) or clear reuse value (external) is met.
```

- [ ] **Step 3: Verify**

Read `plugins/wonder-harness/agents/researcher.md` and confirm:
- Frontmatter description mentions "template candidates"
- `## Inputs` section lists `${CLAUDE_PLUGIN_ROOT}/templates/index.json`
- Step 0 and Step 4 are present in `## Process`
- Deliverable includes `**Available templates:**` section and `[TEMPLATE CANDIDATE]` markers

- [ ] **Step 4: Commit**

```bash
git add plugins/wonder-harness/agents/researcher.md
git commit -m "feat(researcher): add template lookup (Step 0) and candidate marking (Step 4)"
```

---

## Task 3: Create wh-template Command and Add Ruler Template Modes

**Files:**
- Create: `plugins/wonder-harness/commands/wh-template.md`
- Modify: `plugins/wonder-harness/agents/ruler.md`

- [ ] **Step 1: Create wh-template.md**

Write `plugins/wonder-harness/commands/wh-template.md`:

```markdown
---
description: Template catalog management. Promote research candidates, add, edit, or delete templates.
argument-hint: "promote [run-id] | add | edit <id> | delete <id>"
---

# /wh-template

## Parse mode

Read the argument:
- `promote [run-id]`: promote candidate mode. If no run-id, use the most recent run.
- `add`: manual add mode.
- `edit <id>`: edit an existing template by id.
- `delete <id>`: delete a template by id.
- No argument or unrecognized: display usage and stop.

## Promote mode

1. Locate the target `work-doc.md`:
   - If run-id given: `.claude/runs/{run-id}/work-doc.md`
   - Otherwise: list all directories under `.claude/runs/`, pick the most recently modified one that contains a `work-doc.md`
2. Invoke **ruler** in **template-promote mode** with the full path to that `work-doc.md`.
3. Ruler parses all `[TEMPLATE CANDIDATE]` entries, presents a numbered list, asks the user to select, drafts `{id}.md` files for each selection, shows them for review, and on approval writes them and updates `index.json`.

## Add mode

1. Invoke **ruler** in **template-add mode**.
2. Ruler collects name, description, tags, and pattern content from the user interactively.
3. Ruler drafts `{id}.md`, presents for review, and on approval writes `${CLAUDE_PLUGIN_ROOT}/templates/scaffolds/{id}.md` and appends the entry to `${CLAUDE_PLUGIN_ROOT}/templates/index.json`.

## Edit mode

1. Read `${CLAUDE_PLUGIN_ROOT}/templates/index.json` and verify `{id}` exists. If not, report "Template '{id}' not found" and stop.
2. Invoke **ruler** in **template-edit mode** with `{id}`.
3. Ruler reads the current `scaffolds/{id}.md`, presents it, asks what to change, applies changes, and on approval writes the updated file and updates `index.json` if metadata changed.

## Delete mode

1. Read `${CLAUDE_PLUGIN_ROOT}/templates/index.json` and verify `{id}` exists. If not, report "Template '{id}' not found" and stop.
2. Confirm with user: "Delete template '{id}' ({name})? This cannot be undone."
3. On confirmation, invoke **ruler** in **template-delete mode** with `{id}`.
4. Ruler removes `${CLAUDE_PLUGIN_ROOT}/templates/scaffolds/{id}.md` and removes the entry from `${CLAUDE_PLUGIN_ROOT}/templates/index.json`.
```

- [ ] **Step 2: Read current ruler.md**

Read `plugins/wonder-harness/agents/ruler.md` to identify the exact end of the Audit Mode section where new modes will be appended.

- [ ] **Step 3: Append template modes to ruler.md**

Append the following to the end of `plugins/wonder-harness/agents/ruler.md`:

```markdown
---

# Template-Promote Mode

Invoked by `/wh-template promote`. Parses template candidates from a run's work-doc and promotes selected ones to the catalog.

## Inputs

- Path to `work-doc.md` (from `/wh-template`)
- `${CLAUDE_PLUGIN_ROOT}/templates/index.json`

## Process

1. **Parse candidates** — read `work-doc.md`. Find every line containing `[TEMPLATE CANDIDATE]`. Extract pattern description and tags for each. Display as a numbered list:
   ```
   Template candidates found:
   1. {pattern description} — tags: {tags}
   2. ...
   ```
2. **User selection** — ask: "Which candidates would you like to promote? (comma-separated numbers, or 'all', or 'none')"
3. **Draft templates** — for each selected candidate, generate a `{id}.md` draft:
   - `id`: kebab-case slug derived from first tag + a short keyword from the pattern description
   - Populate Context, Pattern (code snippet if present in the candidate, else prose), and Notes sections
   - Present draft to user for review
4. **Write on approval** — for each approved draft:
   - Write `${CLAUDE_PLUGIN_ROOT}/templates/scaffolds/{id}.md`
   - Append to `${CLAUDE_PLUGIN_ROOT}/templates/index.json`:
     ```json
     {
       "id": "{id}",
       "name": "{name}",
       "tags": [{tags}],
       "description": "{one-line description}",
       "source": "{codebase|external}",
       "addedFrom": "{run-id derived from work-doc.md path}"
     }
     ```
5. Report: "Promoted {N} template(s): {id-list}"

---

# Template-Add Mode

Invoked by `/wh-template add`. Interactively collects a new template from the user.

## Process

1. Ask: "Template name?" — collect a short descriptive name.
2. Ask: "Tags? (comma-separated, e.g. java, spring, repository)" — collect tags.
3. Ask: "Source — codebase or external?" — collect source type.
4. Ask: "Paste the pattern (code snippet or prose). End with a blank line."
5. Ask: "Any notes or caveats?"
6. Draft `{id}.md` with collected info (`id` = kebab-slug of name). Present for review.
7. On approval, write `${CLAUDE_PLUGIN_ROOT}/templates/scaffolds/{id}.md` and append entry to `${CLAUDE_PLUGIN_ROOT}/templates/index.json`.
8. Report: "Template '{id}' added."

## Template File Format

```markdown
---
id: {id}
name: {name}
tags: [{tags}]
source: {codebase|external}
---

## Context
{When and why to use this pattern — 1-2 sentences.}

## Pattern
{code block or prose — ≤ 30 lines of code; use {{PlaceholderName}} for variable parts}

## Notes
{Edge cases, caveats, or known variations. Omit if none.}
```

---

# Template-Edit Mode

Invoked by `/wh-template edit <id>`. Modifies an existing template.

## Inputs

- Template id (from `/wh-template`)
- `${CLAUDE_PLUGIN_ROOT}/templates/scaffolds/{id}.md`
- `${CLAUDE_PLUGIN_ROOT}/templates/index.json`

## Process

1. Read `scaffolds/{id}.md` and display current content.
2. Ask: "What would you like to change?"
3. Apply the requested change to the draft.
4. Present before/after diff for the modified sections.
5. On approval, write the updated `scaffolds/{id}.md`.
6. If frontmatter fields (name, tags, description, source) changed, update the matching entry in `index.json`.
7. Report: "Template '{id}' updated."

---

# Template-Delete Mode

Invoked by `/wh-template delete <id>`. Removes a template from the catalog.

## Inputs

- Template id (from `/wh-template`)

## Process

1. Read `${CLAUDE_PLUGIN_ROOT}/templates/index.json` to get the template's name.
2. Delete `${CLAUDE_PLUGIN_ROOT}/templates/scaffolds/{id}.md`.
3. Remove the entry with matching `id` from `index.json` and write the updated file.
4. Report: "Template '{id}' deleted."
```

- [ ] **Step 4: Verify wh-template.md**

Read `plugins/wonder-harness/commands/wh-template.md` and confirm:
- Frontmatter has `description` and `argument-hint`
- All four subcommands (promote/add/edit/delete) have their own `##` sections
- Each section references ruler in the correct mode

- [ ] **Step 5: Verify ruler.md additions**

Read the last 100 lines of `plugins/wonder-harness/agents/ruler.md` and confirm:
- 4 new mode sections are present: Template-Promote, Template-Add, Template-Edit, Template-Delete
- Template file format is included in Template-Add Mode
- Each mode references `${CLAUDE_PLUGIN_ROOT}/templates/`

- [ ] **Step 6: Commit**

```bash
git add plugins/wonder-harness/commands/wh-template.md plugins/wonder-harness/agents/ruler.md
git commit -m "feat(wh-template): add command and ruler template modes (promote/add/edit/delete)"
```

---

## Task 4: Update workflow.md

**Files:**
- Modify: `plugins/wonder-harness/rules/workflow.md`

- [ ] **Step 1: Edit workflow.md Stage 2 row**

In `plugins/wonder-harness/rules/workflow.md`, find the pipeline table row for Stage 2 and update it.

Old:
```
| 2. Research | researcher | §Analysis | `work-doc.md §Research` |
```

New:
```
| 2. Research | researcher | §Analysis + template catalog | `work-doc.md §Research` (with injected templates + candidate markers) |
```

- [ ] **Step 2: Add template catalog note under Principles**

Find the `## Principles` section and append a new bullet:

```markdown
- Template catalog (`${CLAUDE_PLUGIN_ROOT}/templates/index.json`) is read by researcher at Stage 2. Promote candidates to the catalog via `/wh-template promote` after each run.
```

- [ ] **Step 3: Verify**

Read `plugins/wonder-harness/rules/workflow.md` and confirm:
- Stage 2 row in the pipeline table mentions "template catalog" in the Input column
- New bullet is present under `## Principles`

- [ ] **Step 4: Commit**

```bash
git add plugins/wonder-harness/rules/workflow.md
git commit -m "docs(workflow): note template catalog lookup and candidate marking in Stage 2"
```

---

## Self-Review Checklist

After all tasks are complete, verify against the spec:

| Spec Requirement | Covered by |
|-----------------|------------|
| Templates stored at `templates/index.json` + `scaffolds/{id}.md` | Task 1 |
| `index.json` schema: id, name, tags, description, source, addedFrom | Task 1 Step 3 |
| `index.seed.json` removed | Task 1 Step 1 |
| `.gitkeep` removed | Task 1 Step 4 |
| Researcher Step 0: read index, match tags, embed in §Research | Task 2 |
| Researcher Step 4: mark candidates with `[TEMPLATE CANDIDATE]` | Task 2 |
| ≥ 2 files rule for codebase candidates | Task 2 |
| `/wh-template promote` parses candidates, drafts files, writes on approval | Task 3 |
| `/wh-template add` collects info interactively | Task 3 |
| `/wh-template edit` modifies file + index | Task 3 |
| `/wh-template delete` removes file + index entry | Task 3 |
| Ruler handles all template operations | Task 3 |
| No new agents introduced | ✓ (ruler extended, not replaced) |
| workflow.md Stage 2 updated | Task 4 |
