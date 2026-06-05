// plugins/wonder-harness/hooks/scripts/lib/init-guard.js
'use strict';

// Intentionally duplicated from state.js to keep this module dependency-free.
const LAYERS = ['backend', 'frontend', 'security', 'templates'];

function normalize(p) {
  return String(p || '').replace(/\\/g, '/');
}

function isClaudeInternal(filePath) {
  return normalize(filePath).includes('/.claude/');
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
  if (isClaudeInternal(filePath)) return null;

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
