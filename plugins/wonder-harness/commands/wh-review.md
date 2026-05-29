---
description: 기존 산출물(코드/템플릿/규칙)을 해당 에이전트의 review 모드로 단독 검토한다.
argument-hint: "검토 대상 경로 또는 설명 (예: src/.../UserService.java)"
---

# /wh-review

## 1. 대상 판별
- 인수로 받은 경로/설명을 분석해 검토 종류를 정한다:
  - 코드(`.java`/`.kt`/`.jsp` 등) → **developer** (review)
  - 템플릿(`.claude/templates/**`) → **templater** (review)
  - 규칙(`rules/**`) → **ruler** (review)
- 모호하면 사용자에게 한 번 확인한다.

## 2. 검토 실행
- 해당 에이전트를 review 모드로 호출한다. developer/ruler 는 관련 규칙 체크리스트를 로드해 대조한다.

## 3. 결과
- 통과/위반 항목과 수정 권고를 제시한다.
