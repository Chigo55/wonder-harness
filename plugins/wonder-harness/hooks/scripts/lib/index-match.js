// plugins/wonder-harness/hooks/scripts/lib/index-match.js
'use strict';
const { globToRegExp } = require('./glob.js');

function normalize(p) {
  return String(p || '').replace(/\\/g, '/');
}

function matchesTemplate(filePath, index) {
  const norm = normalize(filePath);
  const templates = (index && Array.isArray(index.templates)) ? index.templates : [];
  for (const t of templates) {
    const patterns = Array.isArray(t.pathPatterns) ? t.pathPatterns : [];
    for (const pat of patterns) {
      if (globToRegExp(pat).test(norm)) return true;
    }
  }
  return false;
}

module.exports = { matchesTemplate, normalize };
