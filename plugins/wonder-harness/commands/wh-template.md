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
3. Ruler parses all `[TEMPLATE CANDIDATE]` entries, presents a numbered list, asks the user to select, drafts `{id}.md` files for each selection, shows them for review, and on approval writes them and updates `${CLAUDE_PLUGIN_ROOT}/templates/index.json`.

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
