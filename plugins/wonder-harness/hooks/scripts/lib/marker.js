// plugins/wonder-harness/hooks/scripts/lib/marker.js
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function safeId(sessionId) {
  return String(sessionId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function markerPath(sessionId) {
  return path.join(os.tmpdir(), `wh-template-checked-${safeId(sessionId)}`);
}

function setMarker(sessionId) {
  try { fs.writeFileSync(markerPath(sessionId), String(Date.now())); } catch (_) {}
}

function hasMarker(sessionId) {
  try { return fs.existsSync(markerPath(sessionId)); } catch (_) { return false; }
}

function clearMarker(sessionId) {
  try { fs.unlinkSync(markerPath(sessionId)); } catch (_) {}
}

module.exports = { markerPath, setMarker, hasMarker, clearMarker };
