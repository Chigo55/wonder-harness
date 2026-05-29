// tests/hook/decide.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { decide } = require('../../plugins/wonder-harness/hooks/scripts/lib/decide.js');

const index = { version: 1, templates: [{ id: 'spring', pathPatterns: ['**/*Controller.java'] }] };

test('template path + no marker → deny', () => {
  const input = { tool_input: { file_path: 'src/UserController.java' } };
  const out = decide(input, index, false);
  assert.ok(out);
  assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
  assert.strictEqual(out.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /index\.json/);
});

test('template path + marker present → allow (null)', () => {
  const input = { tool_input: { file_path: 'src/UserController.java' } };
  assert.strictEqual(decide(input, index, true), null);
});

test('non-template path → allow regardless of marker', () => {
  const input = { tool_input: { file_path: 'README.md' } };
  assert.strictEqual(decide(input, index, false), null);
});

test('missing file_path → allow', () => {
  assert.strictEqual(decide({ tool_input: {} }, index, false), null);
});
