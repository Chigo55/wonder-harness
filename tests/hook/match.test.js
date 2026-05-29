// tests/hook/match.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { matchesTemplate } = require('../../plugins/wonder-harness/hooks/scripts/lib/index-match.js');

const index = {
  version: 1,
  templates: [
    { id: 'spring-module', pathPatterns: ['**/*Controller.java', '**/*Service.java'] },
    { id: 'jsp-page', pathPatterns: ['**/webapp/**/*.jsp'] }
  ]
};

test('matches a controller path', () => {
  assert.strictEqual(matchesTemplate('src/main/java/UserController.java', index), true);
});

test('normalizes backslashes (Windows)', () => {
  assert.strictEqual(matchesTemplate('src\\main\\java\\UserController.java', index), true);
});

test('non-template path does not match', () => {
  assert.strictEqual(matchesTemplate('README.md', index), false);
});

test('empty or missing templates → false', () => {
  assert.strictEqual(matchesTemplate('UserController.java', { version: 1, templates: [] }), false);
  assert.strictEqual(matchesTemplate('UserController.java', {}), false);
});
