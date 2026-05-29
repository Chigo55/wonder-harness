// plugins/wonder-harness/hooks/scripts/lib/glob.js
'use strict';

// 최소 글롭→정규식. 지원: **/ , ** , * (슬래시 미포함). 외부 의존성 없음.
function globToRegExp(pattern) {
  const PLACEHOLDER_GLOBSTAR_SLASH = '\x01';
  const PLACEHOLDER_GLOBSTAR = '\x02';
  const PLACEHOLDER_STAR = '\x03';

  let p = pattern
    .replace(/\*\*\//g, PLACEHOLDER_GLOBSTAR_SLASH)
    .replace(/\*\*/g, PLACEHOLDER_GLOBSTAR)
    .replace(/\*/g, PLACEHOLDER_STAR);

  // 정규식 특수문자 이스케이프 (플레이스홀더 제외)
  p = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  p = p
    .split(PLACEHOLDER_GLOBSTAR_SLASH).join('(?:.*/)?')
    .split(PLACEHOLDER_GLOBSTAR).join('.*')
    .split(PLACEHOLDER_STAR).join('[^/]*');

  return new RegExp('^' + p + '$');
}

module.exports = { globToRegExp };
