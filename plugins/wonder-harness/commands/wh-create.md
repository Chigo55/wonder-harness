---
description: create_request.md 를 검증하고 planner→templater→developer→ruler 파이프라인을 구동한다.
argument-hint: "(선택) 요청 문서 경로. 기본: .claude/requests/create_request.md"
---

# /wh-create

## 1. 입력 확보
- 인수가 있으면 그 경로를, 없으면 `.claude/requests/create_request.md` 를 사용한다.
- 파일이 없으면 플러그인 시드 `${CLAUDE_PLUGIN_ROOT}/requests/create_request.md` 를 해당 위치로 복사하고,
  "양식을 작성한 뒤 다시 실행하세요" 라고 안내하고 **중단**한다.

## 2. 검증 게이트 (fail-fast)
다음 필수 섹션이 모두 존재하고 내용(주석/플레이스홀더 제외)이 비어있지 않은지 확인한다:
`## 목표`, `## 범위`, `## 제약`, `## 수용 기준`.
- 하나라도 누락/공란이면 **파이프라인을 시작하지 말고** 누락 항목 목록을 보고하고 중단한다.

## 3. 파이프라인 디스패치 (순차)
검증 통과 시 아래 순서로 에이전트를 호출한다. 각 단계 산출물을 다음 단계 입력으로 전달한다.
1. **planner** (create) — 요청 → 모듈 계획
2. **templater** (create) — 계획 → 템플릿 탐색/생성, index.json 갱신
3. **developer** (create) — 템플릿 기반 코드 구현
4. **ruler** (review) — 규칙 4종 대조 검증 리포트

## 4. 결과
- 각 단계 요약과 ruler 검증 리포트를 사용자에게 제시한다.
