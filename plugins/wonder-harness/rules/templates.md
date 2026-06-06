---
title: Template Catalog Meta-Rules
owner: ruler
applies-to: ruler
stack: stack-agnostic
---

# Template Catalog Meta-Rules

> Related meta-rules: `${CLAUDE_PLUGIN_ROOT}/rules/backend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/frontend.md`
> Generated output location: `.claude/rules/templates.md`

This document is the **meta-rules for rule authors (ruler)**. It defines what a complete project-specific template rule must contain, how to discover the project's template conventions from the existing codebase and catalog, and how to validate completeness.

## Core Principle

**A generated template rule must make the catalog actionable: a researcher or developer reading it must know exactly which templates exist, when to use each, and what qualifies as a new candidate.**

- Catalog-first: base the generated rule on `${CLAUDE_PLUGIN_ROOT}/templates/index.json` and the actual scaffold files — do not invent templates that aren't there.
- Discovery over assumption: scan the project's existing code for repeated patterns; note which are already templated and which are not.
- Confirm with the user before finalizing promotion criteria.

---

## Required Sections

A complete `.claude/rules/templates.md` must contain all of the following sections:

| Section | Content |
|---------|---------|
| Catalog Summary | All templates currently in `index.json`: id, tags, one-line description, when to use |
| Naming Conventions | id slug rules, tag vocabulary for this project, `{{Placeholder}}` naming style |
| Promotion Criteria | Quantitative thresholds (≥ N files for codebase patterns) and qualitative guidance for external references, specific to this project's stack |
| Template Format | Required sections (Context / Pattern / Notes), snippet length limit, placeholder conventions |
| Un-promoted Candidates | `[TEMPLATE CANDIDATE]` entries found in run work-docs that have not yet been promoted — listed as action items |
| Review Checklist | Binary checklist: researcher surfaced relevant templates · developer followed them · new candidates marked |

---

## Exploration Guide

For each required section, use the following approach to discover the project's conventions:

### Catalog Summary
- Read `${CLAUDE_PLUGIN_ROOT}/templates/index.json` — list every entry's id, name, tags, description, source.
- For each entry, read `${CLAUDE_PLUGIN_ROOT}/templates/scaffolds/{id}.md` — extract the Context section (one-liner for "when to use").

### Naming Conventions
- Inspect existing ids in `index.json` — identify the slug convention (prefix style, separator).
- Inspect existing tags — extract the tag vocabulary in use (technology names, layer names, pattern types).
- Inspect existing scaffold files — identify the `{{Placeholder}}` naming style (PascalCase / camelCase / UPPER).

### Promotion Criteria
- Read `.claude/adr/templates.md` (if present) for decisions about threshold and candidate quality.
- Scan `.claude/runs/*/work-doc.md` for `[TEMPLATE CANDIDATE]` entries — note how many files triggered each candidate marking.
- Infer the project's actual repetition density: if most repeated patterns appear in 3+ files, raise the threshold above 2.

### Un-promoted Candidates
- Glob `.claude/runs/*/work-doc.md` — grep for `[TEMPLATE CANDIDATE]`.
- Cross-reference each candidate against `index.json` by tags — identify which have already been promoted and which have not.
- List un-promoted candidates with their tags and source run-id.

### Template Format
- Read all files in `${CLAUDE_PLUGIN_ROOT}/templates/scaffolds/` — check for structural consistency (all have Context / Pattern / Notes).
- Note the longest snippet length; compare against the 30-line limit.

---

## Reference Example

The following is a complete reference implementation of `.claude/rules/templates.md` for a hypothetical project with 3 templates in its catalog.

### Catalog Summary

| id | tags | When to use |
|----|------|-------------|
| `service-cud-pattern` | java, spring, service | Implementing a create/update/delete service method with `@Transactional` |
| `react-query-static` | react, react-query, cache | Fetching static/reference data that rarely changes |
| `pagination-response` | typescript, api, pagination | Returning a paginated list from any REST endpoint |

### Naming Conventions

- **id**: `{primary-tag}-{short-noun}` in kebab-case (e.g., `service-cud-pattern`, not `ServiceCUDPattern`)
- **Tags**: use technology name first, then layer, then pattern type (e.g., `java, spring, service`)
- **Placeholders**: PascalCase for type-level concepts (`{{EntityName}}`), camelCase for variable-level (`{{fieldName}}`)

### Promotion Criteria

- **Codebase patterns**: promote when the pattern appears in ≥ 3 distinct files in this project (the codebase is large enough that 2-file repetition may be coincidental).
- **External references**: promote when the same library call shape is required in ≥ 2 independent features.
- Do not promote patterns that are framework boilerplate with no project-specific decision (e.g., a bare `@RestController` class skeleton is not a candidate).

### Template Format

Every scaffold file must follow this structure:

```markdown
---
id: {id}
name: {name}
tags: [{tags}]
source: {codebase|external}
---

## Context
{One or two sentences: when to apply this template and what problem it solves.}

## Pattern
{code block — ≤ 30 lines; use {{PlaceholderName}} for variable parts}

## Notes
{Edge cases, required imports, known variations. Omit section if none.}
```

Snippet length must not exceed 30 lines of code. If the pattern requires more, split into multiple templates.

### Un-promoted Candidates

The following `[TEMPLATE CANDIDATE]` entries were found in run work-docs but have not yet been promoted:

- `error-boundary-hook` — tags: react, error-handling — found in `runs/2026-06-01-003/work-doc.md`
- `sp-count-query` — tags: java, mybatis, stored-procedure — found in `runs/2026-06-04-001/work-doc.md`

Run `/wh-template promote` with the relevant run-id to promote these.

### Review Checklist
- [ ] Researcher's §Research includes **Available templates** section when catalog is non-empty
- [ ] Developer's implementation follows any surfaced template (structure, placeholder substitution)
- [ ] New candidates are marked with `[TEMPLATE CANDIDATE]` only when ≥ 3 files repeat the pattern
- [ ] After each run, `/wh-template promote` is run to evaluate un-promoted candidates

---

## Validation Checklist

After completing a generated `.claude/rules/templates.md`, verify:

- [ ] All templates in `index.json` appear in the Catalog Summary
- [ ] Naming Conventions are derived from the actual ids and tags in `index.json` (not invented)
- [ ] Promotion Criteria threshold reflects the project's actual codebase size (not always ≥ 2)
- [ ] Un-promoted Candidates section is accurate (cross-referenced against `index.json`)
- [ ] Template Format matches what is actually in the scaffold files
- [ ] No contradictions with `${CLAUDE_PLUGIN_ROOT}/rules/workflow.md`
