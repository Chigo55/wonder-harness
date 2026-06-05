# wh-init Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/wh-init` to reverse-engineer ADRs before rule generation, enforce step ordering via hooks, and produce per-layer HTML reports.

**Architecture:** A new `lib/state.js` module owns all reads/writes to `.claude/.wh-state.json`. A new `lib/init-guard.js` module encodes the two enforcement rules (cross-command gate, within-init step ordering). A new `enforce-init.js` hook wraps those modules in the stdin/stdout interface used by all wonder-harness hooks. The ruler agent gains an `adr-extract` sub-mode, and `wh-init.md` is rewritten around the four-step flow.

**Tech Stack:** Node.js ≥ 18 (node:test, node:fs, node:path, node:assert/strict), markdown agent/command files.

**Spec:** `docs/superpowers/specs/2026-06-05-wh-init-redesign-design.md`

---

## File Map

| Path | Status | Responsibility |
|---|---|---|
| `hooks/scripts/lib/state.js` | **CREATE** | Read/write `.claude/.wh-state.json` |
| `hooks/scripts/lib/init-guard.js` | **CREATE** | Cross-command gate + step-ordering enforcement logic |
| `hooks/scripts/lib/__tests__/state.test.js` | **CREATE** | Unit tests for state.js |
| `hooks/scripts/lib/__tests__/init-guard.test.js` | **CREATE** | Unit tests for init-guard.js |
| `hooks/scripts/enforce-init.js` | **CREATE** | Stdin/stdout hook wrapper using init-guard.js |
| `hooks/scripts/write-state.js` | **CREATE** | CLI wrapper — called from wh-init.md steps |
| `hooks/scripts/init-requests.js` | **MODIFY** | Add `writeState(requests_copied: true)` |
| `hooks/hooks.json` | **MODIFY** | Add enforce-init.js to PreToolUse |
| `agents/ruler.md` | **MODIFY** | Add `adr-extract` mode; enhance `generate` mode |
| `commands/wh-init.md` | **MODIFY** | Rewrite — 4-step flow with state recording |

All paths are relative to `plugins/wonder-harness/`.

---

## Task 1: lib/state.js — State Read/Write Utility

**Files:**
- Create: `plugins/wonder-harness/hooks/scripts/lib/state.js`
- Create: `plugins/wonder-harness/hooks/scripts/lib/__tests__/state.test.js`

- [ ] **Step 1: Write the failing tests**

Create `plugins/wonder-harness/hooks/scripts/lib/__tests__/state.test.js`:

```javascript
'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Loaded after file exists in Step 3
let readState, writeState, emptyState;

describe('state.js', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wh-state-test-'));
    ({ readState, writeState, emptyState } = require('../state.js'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('readState returns null when file does not exist', () => {
    assert.equal(readState(path.join(tmpDir, 'nonexistent')), null);
  });

  it('emptyState has version 1 and all layers null', () => {
    const s = emptyState();
    assert.equal(s.version, 1);
    assert.equal(s.requests_copied, false);
    assert.equal(s.adr.backend, null);
    assert.equal(s.rules.templates, null);
  });

  it('writeState creates file with updater applied to empty state', () => {
    const dir = fs.mkdtempSync(path.join(tmpDir, 'sub-'));
    writeState(dir, s => ({ ...s, requests_copied: true }));
    const result = readState(dir);
    assert.equal(result.requests_copied, true);
    assert.equal(result.adr.backend, null);
  });

  it('writeState merges correctly with existing state', () => {
    const dir = fs.mkdtempSync(path.join(tmpDir, 'sub-'));
    writeState(dir, s => ({ ...s, requests_copied: true }));
    writeState(dir, s => ({ ...s, adr: { ...s.adr, backend: '2026-06-05T10:00:00Z' } }));
    const result = readState(dir);
    assert.equal(result.requests_copied, true);
    assert.equal(result.adr.backend, '2026-06-05T10:00:00Z');
    assert.equal(result.adr.frontend, null);
  });

  it('writeState creates .claude directory if it does not exist', () => {
    const dir = fs.mkdtempSync(path.join(tmpDir, 'sub-'));
    writeState(dir, s => s);
    assert.ok(fs.existsSync(path.join(dir, '.claude', '.wh-state.json')));
  });
});
```

- [ ] **Step 2: Run tests — expect failure (module not found)**

```bash
cd D:\01_personal\04_project\01_wonder-harness
node --test plugins/wonder-harness/hooks/scripts/lib/__tests__/state.test.js
```

Expected: `Cannot find module '../state.js'`

- [ ] **Step 3: Create lib/state.js**

Create `plugins/wonder-harness/hooks/scripts/lib/state.js`:

```javascript
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const LAYERS = ['backend', 'frontend', 'security', 'templates'];

function statePath(cwd) {
  return path.join(cwd, '.claude', '.wh-state.json');
}

function emptyState() {
  return {
    version: 1,
    requests_copied: false,
    adr:     Object.fromEntries(LAYERS.map(l => [l, null])),
    rules:   Object.fromEntries(LAYERS.map(l => [l, null])),
    reports: Object.fromEntries(LAYERS.map(l => [l, null]))
  };
}

function readState(cwd) {
  try {
    return JSON.parse(fs.readFileSync(statePath(cwd), 'utf8'));
  } catch (_) {
    return null;
  }
}

function writeState(cwd, updater) {
  const p = statePath(cwd);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const next = updater(readState(cwd) || emptyState());
  fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

module.exports = { readState, writeState, statePath, emptyState, LAYERS };
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
node --test plugins/wonder-harness/hooks/scripts/lib/__tests__/state.test.js
```

Expected: `5 passing`

- [ ] **Step 5: Commit**

```bash
git add plugins/wonder-harness/hooks/scripts/lib/state.js plugins/wonder-harness/hooks/scripts/lib/__tests__/state.test.js
git commit -m "feat(hooks): add state.js utility for .wh-state.json read/write"
```

---

## Task 2: lib/init-guard.js — Enforcement Logic

**Files:**
- Create: `plugins/wonder-harness/hooks/scripts/lib/init-guard.js`
- Create: `plugins/wonder-harness/hooks/scripts/lib/__tests__/init-guard.test.js`

- [ ] **Step 1: Write the failing tests**

Create `plugins/wonder-harness/hooks/scripts/lib/__tests__/init-guard.test.js`:

```javascript
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  checkCrossCommandGate,
  checkStepOrdering,
  isClaudeInternal,
  extractRulesLayer,
  extractReportLayer
} = require('../init-guard.js');

const partialState = {
  version: 1, requests_copied: true,
  adr:     { backend: '2026-06-05T10:00:00Z', frontend: null, security: null, templates: null },
  rules:   { backend: '2026-06-05T10:05:00Z', frontend: null, security: null, templates: null },
  reports: { backend: null, frontend: null, security: null, templates: null }
};

describe('isClaudeInternal', () => {
  it('returns true for .claude/ paths', () => {
    assert.equal(isClaudeInternal('/project/.claude/rules/backend.md'), true);
  });
  it('returns true for Windows backslash .claude paths', () => {
    assert.equal(isClaudeInternal('D:\\project\\.claude\\rules\\backend.md'), true);
  });
  it('returns false for project source files', () => {
    assert.equal(isClaudeInternal('/project/src/main/java/Example.java'), false);
  });
});

describe('extractRulesLayer', () => {
  it('extracts backend from rules path', () => {
    assert.equal(extractRulesLayer('/project/.claude/rules/backend.md'), 'backend');
  });
  it('extracts frontend from rules path', () => {
    assert.equal(extractRulesLayer('/project/.claude/rules/frontend.md'), 'frontend');
  });
  it('returns null for non-rules .claude paths', () => {
    assert.equal(extractRulesLayer('/project/.claude/adr/backend.md'), null);
  });
  it('returns null for source files', () => {
    assert.equal(extractRulesLayer('/project/src/Backend.java'), null);
  });
});

describe('extractReportLayer', () => {
  it('extracts backend from report path', () => {
    const p = '/project/.claude/reports/wh-init-backend-20260605-100500.html';
    assert.equal(extractReportLayer(p), 'backend');
  });
  it('extracts templates from report path', () => {
    const p = '/project/.claude/reports/wh-init-templates-20260605-123456.html';
    assert.equal(extractReportLayer(p), 'templates');
  });
  it('returns null for non-report html files', () => {
    assert.equal(extractReportLayer('/project/.claude/reports/other.html'), null);
  });
});

describe('checkCrossCommandGate', () => {
  it('allows .claude/ internal files even when state is null', () => {
    assert.equal(checkCrossCommandGate('/project/.claude/rules/backend.md', null), null);
  });
  it('denies external files when state is null', () => {
    const result = checkCrossCommandGate('/project/src/Main.java', null);
    assert.ok(result && result.deny);
    assert.ok(result.reason.includes('/wh-init'));
  });
  it('denies when no layer has rules set', () => {
    const emptyRules = { rules: { backend: null, frontend: null, security: null, templates: null } };
    const result = checkCrossCommandGate('/project/src/Main.java', emptyRules);
    assert.ok(result && result.deny);
  });
  it('allows when at least one layer has rules', () => {
    assert.equal(checkCrossCommandGate('/project/src/Main.java', partialState), null);
  });
});

describe('checkStepOrdering', () => {
  it('blocks writing rules when ADR not set for that layer', () => {
    const result = checkStepOrdering('/project/.claude/rules/frontend.md', partialState);
    assert.ok(result && result.deny);
    assert.ok(result.reason.includes('adr-extract'));
  });
  it('allows writing rules when ADR is set for that layer', () => {
    const result = checkStepOrdering('/project/.claude/rules/backend.md', partialState);
    assert.equal(result, null);
  });
  it('blocks writing report when rules not set for that layer', () => {
    const p = '/project/.claude/reports/wh-init-frontend-20260605-100500.html';
    const result = checkStepOrdering(p, partialState);
    assert.ok(result && result.deny);
    assert.ok(result.reason.includes('generate'));
  });
  it('allows writing report when rules are set for that layer', () => {
    const p = '/project/.claude/reports/wh-init-backend-20260605-100500.html';
    const result = checkStepOrdering(p, partialState);
    assert.equal(result, null);
  });
  it('returns null for unrelated source file paths', () => {
    assert.equal(checkStepOrdering('/project/src/Main.java', partialState), null);
  });
  it('returns null when state is null for unrelated paths', () => {
    assert.equal(checkStepOrdering('/project/src/Main.java', null), null);
  });
});
```

- [ ] **Step 2: Run tests — expect failure (module not found)**

```bash
node --test plugins/wonder-harness/hooks/scripts/lib/__tests__/init-guard.test.js
```

Expected: `Cannot find module '../init-guard.js'`

- [ ] **Step 3: Create lib/init-guard.js**

Create `plugins/wonder-harness/hooks/scripts/lib/init-guard.js`:

```javascript
'use strict';

const LAYERS = ['backend', 'frontend', 'security', 'templates'];

function normalize(p) {
  return String(p || '').replace(/\\/g, '/');
}

function isClaudeInternal(filePath) {
  const n = normalize(filePath);
  return n.includes('/.claude/') || n.includes('\\.claude\\');
}

function extractRulesLayer(filePath) {
  const m = normalize(filePath).match(/\/\.claude\/rules\/(backend|frontend|security|templates)\.md$/);
  return m ? m[1] : null;
}

function extractReportLayer(filePath) {
  const m = normalize(filePath).match(
    /\/\.claude\/reports\/wh-init-(backend|frontend|security|templates)-\d{8}-\d{6}\.html$/
  );
  return m ? m[1] : null;
}

// Returns null (allow) or { deny: true, reason: string }
function checkCrossCommandGate(filePath, state) {
  if (isClaudeInternal(filePath)) return null;
  if (!state) {
    return { deny: true, reason: 'wonder-harness has not been initialized. Run /wh-init first.' };
  }
  const hasAnyRules = LAYERS.some(l => state.rules && state.rules[l] !== null);
  if (!hasAnyRules) {
    return { deny: true, reason: 'No layer has been fully initialized. Run /wh-init [--layer] first.' };
  }
  return null;
}

function checkStepOrdering(filePath, state) {
  const rulesLayer = extractRulesLayer(filePath);
  if (rulesLayer) {
    if (!state || !state.adr || state.adr[rulesLayer] === null) {
      return {
        deny: true,
        reason: `ADR for ${rulesLayer} must be completed before generating rules. Complete Step 1 (adr-extract) first.`
      };
    }
    return null;
  }

  const reportLayer = extractReportLayer(filePath);
  if (reportLayer) {
    if (!state || !state.rules || state.rules[reportLayer] === null) {
      return {
        deny: true,
        reason: `Rules for ${reportLayer} must be generated before producing the report. Complete Step 2 (generate) first.`
      };
    }
    return null;
  }

  return null;
}

module.exports = {
  checkCrossCommandGate,
  checkStepOrdering,
  isClaudeInternal,
  extractRulesLayer,
  extractReportLayer
};
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
node --test plugins/wonder-harness/hooks/scripts/lib/__tests__/init-guard.test.js
```

Expected: `14 passing`

- [ ] **Step 5: Run both test files together**

```bash
node --test plugins/wonder-harness/hooks/scripts/lib/__tests__/state.test.js plugins/wonder-harness/hooks/scripts/lib/__tests__/init-guard.test.js
```

Expected: `19 passing`, `0 failing`

- [ ] **Step 6: Commit**

```bash
git add plugins/wonder-harness/hooks/scripts/lib/init-guard.js plugins/wonder-harness/hooks/scripts/lib/__tests__/init-guard.test.js
git commit -m "feat(hooks): add init-guard.js enforcement logic with tests"
```

---

## Task 3: enforce-init.js — Hook Stdin/Stdout Wrapper

**Files:**
- Create: `plugins/wonder-harness/hooks/scripts/enforce-init.js`

- [ ] **Step 1: Create enforce-init.js**

Create `plugins/wonder-harness/hooks/scripts/enforce-init.js`:

```javascript
// plugins/wonder-harness/hooks/scripts/enforce-init.js
'use strict';
const { readState } = require('./lib/state.js');
const { checkCrossCommandGate, checkStepOrdering } = require('./lib/init-guard.js');

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw || '{}');
    const filePath = input.tool_input && input.tool_input.file_path;
    if (!filePath) { process.exit(0); return; }

    const cwd = input.cwd || process.cwd();
    const state = readState(cwd);

    const stepViolation = checkStepOrdering(filePath, state);
    if (stepViolation) {
      process.stdout.write(JSON.stringify(deny(stepViolation.reason)));
      process.exit(0);
      return;
    }

    const gateViolation = checkCrossCommandGate(filePath, state);
    if (gateViolation) {
      process.stdout.write(JSON.stringify(deny(gateViolation.reason)));
    }
  } catch (_) { /* silently allow on any error */ }
  process.exit(0);
});

function deny(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason
    }
  };
}
```

- [ ] **Step 2: Smoke-test with valid input (allow case)**

```bash
echo '{"cwd":"D:/tmp/test-project","tool_input":{"file_path":"D:/tmp/test-project/.claude/rules/backend.md"}}' | node plugins/wonder-harness/hooks/scripts/enforce-init.js
```

Expected: no output (empty stdout = allow)

- [ ] **Step 3: Smoke-test with deny case (no state file)**

```bash
echo '{"cwd":"D:/tmp/test-project","tool_input":{"file_path":"D:/tmp/test-project/src/Main.java"}}' | node plugins/wonder-harness/hooks/scripts/enforce-init.js
```

Expected: JSON output with `permissionDecision: "deny"` and reason mentioning `/wh-init`

- [ ] **Step 4: Commit**

```bash
git add plugins/wonder-harness/hooks/scripts/enforce-init.js
git commit -m "feat(hooks): add enforce-init.js hook for init gate enforcement"
```

---

## Task 4: write-state.js — CLI State Writer

**Files:**
- Create: `plugins/wonder-harness/hooks/scripts/write-state.js`

- [ ] **Step 1: Create write-state.js**

Create `plugins/wonder-harness/hooks/scripts/write-state.js`:

```javascript
// plugins/wonder-harness/hooks/scripts/write-state.js
// Called from wh-init.md steps via Bash tool after each ruler step completes.
// Usage: node write-state.js <cwd> <dotted.field> <value>
// Examples:
//   node write-state.js /project requests_copied true
//   node write-state.js /project adr.backend 2026-06-05T10:00:00Z
//   node write-state.js /project reports.backend wh-init-backend-20260605-100500.html
'use strict';
const { writeState } = require('./lib/state.js');

const [,, cwd, field, value] = process.argv;
if (!cwd || !field) {
  process.stderr.write('Usage: node write-state.js <cwd> <field> <value>\n');
  process.exit(1);
}

function parseValue(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  return v;
}

try {
  const parts = field.split('.');
  writeState(cwd, (state) => {
    if (parts.length === 1) {
      return { ...state, [parts[0]]: parseValue(value) };
    }
    return {
      ...state,
      [parts[0]]: { ...state[parts[0]], [parts[1]]: parseValue(value) }
    };
  });
  process.exit(0);
} catch (err) {
  process.stderr.write(err.message + '\n');
  process.exit(1);
}
```

- [ ] **Step 2: Smoke-test round-trip**

```bash
# Write a value
node plugins/wonder-harness/hooks/scripts/write-state.js D:/tmp/wh-test adr.backend 2026-06-05T10:00:00Z

# Read it back
node -e "const {readState}=require('./plugins/wonder-harness/hooks/scripts/lib/state.js'); console.log(JSON.stringify(readState('D:/tmp/wh-test'), null, 2))"
```

Expected: JSON with `adr.backend = "2026-06-05T10:00:00Z"`, all other fields at defaults.

- [ ] **Step 3: Commit**

```bash
git add plugins/wonder-harness/hooks/scripts/write-state.js
git commit -m "feat(hooks): add write-state.js CLI for command-driven state recording"
```

---

## Task 5: hooks.json — Register enforce-init

**Files:**
- Modify: `plugins/wonder-harness/hooks/hooks.json`

- [ ] **Step 1: Update hooks.json**

Replace the entire content of `plugins/wonder-harness/hooks/hooks.json`:

```json
{
  "description": "wonder-harness template enforcement hooks",
  "hooks": {
    "SessionStart": [
      {
        "hooks": [{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/init-requests.js", "timeout": 5 }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Read",
        "hooks": [{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/mark-template-read.js", "timeout": 5 }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/enforce-template.js", "timeout": 10 },
          { "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/enforce-init.js", "timeout": 10 }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Validate plugin structure**

```bash
cd D:\01_personal\04_project\01_wonder-harness
npm run validate
```

Expected: validation passes

- [ ] **Step 3: Commit**

```bash
git add plugins/wonder-harness/hooks/hooks.json
git commit -m "feat(hooks): register enforce-init.js in PreToolUse Write|Edit"
```

---

## Task 6: init-requests.js — Add State Recording

**Files:**
- Modify: `plugins/wonder-harness/hooks/scripts/init-requests.js`

- [ ] **Step 1: Update init-requests.js**

Replace the entire content of `plugins/wonder-harness/hooks/scripts/init-requests.js`:

```javascript
// plugins/wonder-harness/hooks/scripts/init-requests.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { writeState } = require('./lib/state.js');

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..', '..');
const SEEDS = ['create_request.md', 'modify_request.md'];

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw || '{}');
    const cwd = input.cwd || process.cwd();
    const destDir = path.join(cwd, '.claude', 'requests');

    fs.mkdirSync(destDir, { recursive: true });

    for (const seed of SEEDS) {
      const dest = path.join(destDir, seed);
      if (!fs.existsSync(dest)) {
        const src = path.join(PLUGIN_ROOT, 'requests', seed);
        fs.copyFileSync(src, dest);
      }
    }

    writeState(cwd, (s) => ({ ...s, requests_copied: true }));
  } catch (_) { /* silently ignore */ }
  process.exit(0);
});
```

- [ ] **Step 2: Smoke-test**

```bash
echo '{"cwd":"D:/tmp/wh-init-test"}' | node plugins/wonder-harness/hooks/scripts/init-requests.js
node -e "const {readState}=require('./plugins/wonder-harness/hooks/scripts/lib/state.js'); console.log(readState('D:/tmp/wh-init-test').requests_copied)"
```

Expected: `true`

- [ ] **Step 3: Commit**

```bash
git add plugins/wonder-harness/hooks/scripts/init-requests.js
git commit -m "feat(hooks): record requests_copied in wh-state after seed copy"
```

---

## Task 7: ruler.md — Add adr-extract Mode + Enhance generate Mode

**Files:**
- Modify: `plugins/wonder-harness/agents/ruler.md`

- [ ] **Step 1: Read current ruler.md**

Read `plugins/wonder-harness/agents/ruler.md` in full before editing.

- [ ] **Step 2: Update the Modes list and add adr-extract section**

In the `## Modes` section, change:

```markdown
## Modes
- **generate**: Generate a project-specific rule in `.claude/rules/` from a meta-rule. Invoked by `wh-init`.
- **create**: Author a new harness meta-rule document (frontmatter: title/owner/applies-to/stack).
- **modify**: Update existing harness rules and verify consistency with affected agent instructions.
- **review (default at pipeline terminus)**: Cross-check developer deliverables against rule checklists, then report violations.
```

to:

```markdown
## Modes
- **adr-extract**: Reverse-engineer Architecture Decision Records from project source. Writes `.claude/adr/{layer}.md`. Invoked by `wh-init` Step 1.
- **generate**: Generate a project-specific rule in `.claude/rules/` from a meta-rule and the layer's ADR. Invoked by `wh-init` Step 2.
- **create**: Author a new harness meta-rule document (frontmatter: title/owner/applies-to/stack).
- **modify**: Update existing harness rules and verify consistency with affected agent instructions.
- **review (default at pipeline terminus)**: Cross-check developer deliverables against rule checklists, then report violations.
```

- [ ] **Step 3: Insert the full adr-extract section after the Modes block**

Insert after the `---` separator that follows the Modes block and before `# Generate Mode`:

```markdown
# ADR-Extract Mode

Invoked by `wh-init` as Step 1 for each selected layer.

## Inputs
- Layer name: `backend` | `frontend` | `security` | `templates`
- Project source files (explored via Glob and Grep)

## Process

### Step 1 — Explore Project Code
Apply the same Exploration Guide as generate mode for this layer.
Use Glob and Grep to locate representative source files. Read 2–5 files per thematic area.

### Step 2 — Infer Architectural Decisions
For each significant pattern found (patterns appearing in ≥ 2 files), infer:
- **Context** — what problem this pattern solves in the project
- **Decision** — the specific architectural choice that was made
- **Rationale** — why this choice (inferred from code structure, naming, annotations, comments)
- **Consequences** — constraints this decision imposes on future code in this layer

Discard patterns that appear in only one file. Aim for 3–7 ADR entries per layer.

### Step 3 — User Confirmation
Present the inferred ADR summary:
> "I found the following architectural decisions for `{layer}`. Please correct any misinterpretations before I write the ADR:
> - **ADR-1: {title}** — {one-line summary}
> - ..."

Wait for user confirmation. Apply corrections to the draft.

### Step 4 — Write ADR
Save to `.claude/adr/{layer}.md` using this format:

```markdown
# ADR: {Layer} — {Project Name}
Generated: {ISO date}

## ADR-{N}: {Short Title}
**Context:** {what problem this solves}
**Decision:** {the architectural choice}
**Rationale:** {why — inferred from code evidence}
**Consequences:** {constraints imposed on future code}
```

Report: "`{layer}` ADR written to `.claude/adr/{layer}.md` ({N} decisions recorded)."
```

- [ ] **Step 4: Update the Generate Mode section to consume ADR**

In `# Generate Mode`, under `## Inputs`, change:

```markdown
## Inputs
- Meta-rule: `${CLAUDE_PLUGIN_ROOT}/rules/{layer}.md`
- Project code: existing source files in the current working directory
```

to:

```markdown
## Inputs
- Meta-rule: `${CLAUDE_PLUGIN_ROOT}/rules/{layer}.md`
- ADR: `.claude/adr/{layer}.md` — **required**; if absent, abort and instruct user to run Step 1 (adr-extract) first
- Project code: existing source files in the current working directory
```

Then in `## Process`, insert a new step between Step 1 and Step 2:

```markdown
### Step 1b — Load ADR
Read `.claude/adr/{layer}.md`. For each ADR entry, note its Consequences field.
These consequences are hard constraints: generated rule sections must not contradict them.
```

Then in `### Step 3 — Draft Generated Rule`, append:

```markdown
Cross-reference each constraint in the draft against ADR Consequences. If a meta-rule default conflicts with an ADR consequence, prefer the ADR consequence and flag the conflict for user review in Step 4.
```

Then in `### Step 4 — User Confirmation`, add to the summary template:

```markdown
> - [ADR Conflicts] (if any) — list each meta-rule default overridden by an ADR consequence
```

- [ ] **Step 5: Validate plugin**

```bash
npm run validate
```

Expected: passes

- [ ] **Step 6: Commit**

```bash
git add plugins/wonder-harness/agents/ruler.md
git commit -m "feat(ruler): add adr-extract mode; enhance generate mode to consume ADR"
```

---

## Task 8: wh-init.md — Rewrite Command

**Files:**
- Modify: `plugins/wonder-harness/commands/wh-init.md`

- [ ] **Step 1: Read current wh-init.md**

Read `plugins/wonder-harness/commands/wh-init.md` in full before replacing.

- [ ] **Step 2: Replace entire wh-init.md content**

```markdown
---
description: Initializes wonder-harness for a project — copies request seeds, reverse-engineers ADRs, generates project-specific rules, and produces HTML reports. Run once per project before using wh-create.
argument-hint: "[--backend] [--frontend] [--security] [--templates] — omit all flags to initialize all layers"
---

# /wh-init

Initializes wonder-harness on a new project through four mandatory steps executed in order for each selected layer. Step ordering is enforced by hook — skipping or reordering steps will be blocked.

## 0. Parse flags and copy request seeds

Read arguments for `--backend`, `--frontend`, `--security`, `--templates`.
If no flags provided, treat all four layers as selected.

Copy request seeds (runs once, before the layer loop):
- This is handled automatically by the `SessionStart` hook (`init-requests.js`).
- Verify `.claude/requests/create_request.md` and `.claude/requests/modify_request.md` exist.
- If either is missing, run: `node ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/init-requests.js` via the Bash tool with `{"cwd": "<project_cwd>"}` on stdin.

## 1–3. For each selected layer (sequentially)

Process layers one at a time. For each layer:

### Step 1 — ADR Reverse-Engineering

Invoke **ruler** in **adr-extract mode** for the layer.

Ruler will:
1. Explore project source files for this layer
2. Infer 3–7 architectural decisions
3. Present the ADR summary to the user for confirmation
4. Write `.claude/adr/{layer}.md`

After ruler confirms the ADR file is written, record the timestamp in state:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "adr.{layer}" "<ISO-timestamp>"
```

Replace `{layer}` with the actual layer name and `<ISO-timestamp>` with the current UTC time in ISO 8601 format (e.g. `2026-06-05T10:00:00Z`).

### Step 2 — Rule Generation

Invoke **ruler** in **generate mode** for the layer.

Ruler will:
1. Load the meta-rule from `${CLAUDE_PLUGIN_ROOT}/rules/{layer}.md`
2. Load `.claude/adr/{layer}.md` (required — ruler will abort if absent)
3. Draft the project-specific rule, cross-referencing ADR constraints
4. Present extracted conventions and any ADR conflicts to the user
5. Write `.claude/rules/{layer}.md`

After ruler confirms the rule file is written, record the timestamp:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "rules.{layer}" "<ISO-timestamp>"
```

### Step 3 — HTML Report

Generate a self-contained HTML report for this layer. The report filename must follow the pattern `wh-init-{layer}-YYYYMMDD-HHMMSS.html` where the timestamp is UTC.

Write the report to `.claude/reports/wh-init-{layer}-YYYYMMDD-HHMMSS.html`.

The report must contain these sections (inline CSS only, no external resources):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>wh-init report — {layer} — {project name}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; color: #1a1a1a; }
    h1 { border-bottom: 2px solid #333; }
    h2 { margin-top: 2rem; color: #444; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; font-weight: 600; }
    pre { background: #f8f8f8; padding: 1rem; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; }
    .conflict { background: #fff3cd; border-left: 4px solid #f0ad4e; padding: 0.5rem 1rem; margin: 0.5rem 0; }
    .footer { margin-top: 3rem; color: #888; font-size: 0.85rem; border-top: 1px solid #eee; padding-top: 1rem; }
  </style>
</head>
<body>
  <h1>wh-init Report — {Layer} Layer</h1>
  <p><strong>Project:</strong> {project name} &nbsp;|&nbsp; <strong>Generated:</strong> {UTC datetime}</p>

  <h2>ADR Summary</h2>
  <table>
    <thead><tr><th>ID</th><th>Title</th><th>Decision</th><th>Consequences</th></tr></thead>
    <tbody>
      <!-- one row per ADR entry from .claude/adr/{layer}.md -->
    </tbody>
  </table>

  <h2>Generated Rule</h2>
  <pre>{full content of .claude/rules/{layer}.md}</pre>

  <h2>ADR ↔ Rule Mapping</h2>
  <table>
    <thead><tr><th>ADR</th><th>Rule Section Influenced</th></tr></thead>
    <tbody><!-- populated from your cross-reference during generation --></tbody>
  </table>

  <h2>Conflicts Resolved</h2>
  <!-- If no conflicts: <p>No conflicts between ADR consequences and meta-rule defaults.</p> -->
  <!-- For each conflict: -->
  <div class="conflict">
    <strong>{ADR-N}:</strong> {meta-rule default} overridden by {ADR consequence} — resolved as: {resolution}
  </div>

  <div class="footer">
    Generated by wonder-harness wh-init &nbsp;|&nbsp; Plugin root: {CLAUDE_PLUGIN_ROOT}
  </div>
</body>
</html>
```

After writing the report file, record it in state:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/write-state.js" "<cwd>" "reports.{layer}" "wh-init-{layer}-YYYYMMDD-HHMMSS.html"
```

## 4. Result Report

After all selected layers are processed, output:

```
wh-init complete.

Generated:
  ✓ backend  — .claude/adr/backend.md, .claude/rules/backend.md, .claude/reports/wh-init-backend-YYYYMMDD-HHMMSS.html
  ...

Skipped:
  — frontend  (already existed, user chose skip)
  ...

Next step: Run /wh-create to build a new domain module.
Open .claude/reports/ to review the initialization reports.
```

## Overwrite Policy

Before Step 1 for each layer, check whether `.claude/adr/{layer}.md` or `.claude/rules/{layer}.md` already exists.

- If either exists, ask:
  > "`.claude/adr/{layer}.md` and/or `.claude/rules/{layer}.md` already exist. Overwrite or skip? (overwrite / skip)"
  - `skip` → proceed to the next layer.
  - `overwrite` → continue with Step 1, which will overwrite both artifacts and reset state entries for this layer.
```

- [ ] **Step 3: Validate plugin**

```bash
npm run validate
```

Expected: passes

- [ ] **Step 4: Run full test suite**

```bash
node --test plugins/wonder-harness/hooks/scripts/lib/__tests__/state.test.js plugins/wonder-harness/hooks/scripts/lib/__tests__/init-guard.test.js
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add plugins/wonder-harness/commands/wh-init.md
git commit -m "feat(wh-init): rewrite command — 4-step flow with ADR, state recording, HTML report"
```

---

## Task 9: Version Bump

**Files:**
- Modify: `plugins/wonder-harness/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Read both version files**

Read `plugins/wonder-harness/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` to get the current version.

- [ ] **Step 2: Increment patch version in both files simultaneously**

Edit both files to increment the patch version (e.g. `0.3.0` → `0.3.1`). The `"version"` field must match in both files.

- [ ] **Step 3: Commit version bump**

```bash
git add plugins/wonder-harness/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore: bump version to x.x.x"
```

---

## Self-Review Checklist

- [x] **Spec §4 (4-step flow)** — Tasks 6 (Step 0), 7 (Steps 1–2), 8 (Steps 1–3) cover all four steps
- [x] **Spec §5 (state schema)** — Task 1 (state.js) implements the exact schema; Task 4 (write-state.js) writes dotted-field paths
- [x] **Spec §6a (cross-command gate)** — Task 2 (init-guard.js checkCrossCommandGate), Task 3 (enforce-init.js)
- [x] **Spec §6b (step ordering)** — Task 2 (init-guard.js checkStepOrdering), Task 3
- [x] **Spec §6c (state writer utility)** — Task 4 (write-state.js) + Task 1 (lib/state.js)
- [x] **Spec §7 (ruler adr-extract + generate)** — Task 7
- [x] **Spec §8 (HTML report)** — Task 8 Step 2 includes full HTML template
- [x] **Spec §9 (files changed)** — all 6 spec files addressed; version bump added as Task 9
- [x] **No TBDs or placeholders** — all code blocks are complete
- [x] **Type consistency** — `readState`/`writeState` used consistently across Tasks 1, 4, 6; `checkCrossCommandGate`/`checkStepOrdering` used consistently across Tasks 2, 3
