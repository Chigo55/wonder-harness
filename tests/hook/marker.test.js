// tests/hook/marker.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { markerPath, setMarker, hasMarker, clearMarker } = require('../../plugins/wonder-harness/hooks/scripts/lib/marker.js');

test('marker absent by default for a fresh session id', () => {
  const sid = 'test-session-' + process.pid + '-a';
  clearMarker(sid);
  assert.strictEqual(hasMarker(sid), false);
});

test('setMarker makes hasMarker true; clearMarker resets', () => {
  const sid = 'test-session-' + process.pid + '-b';
  clearMarker(sid);
  setMarker(sid);
  assert.strictEqual(hasMarker(sid), true);
  clearMarker(sid);
  assert.strictEqual(hasMarker(sid), false);
});

test('markerPath includes the session id', () => {
  assert.ok(markerPath('abc123').includes('abc123'));
});
