// plugins/wonder-harness/hooks/scripts/lib/decide.js
'use strict';
const { matchesTemplate } = require('./index-match.js');

// 반환: null(허용) | { hookSpecificOutput: {...} }(차단)
function decide(input, index, markerPresent) {
  const filePath = input && input.tool_input && input.tool_input.file_path;
  if (!filePath) return null;
  if (!matchesTemplate(filePath, index)) return null;
  if (markerPresent) return null;
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        '이 경로에 해당하는 템플릿이 카탈로그에 있습니다. 파일 생성 전 .claude/templates/index.json 을 먼저 읽어 기존 템플릿을 탐색하세요.'
    }
  };
}

module.exports = { decide };
