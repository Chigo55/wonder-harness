---
description: modify_request.md 를 검증하고 planner→templater→developer→ruler 파이프라인을 modify 모드로 구동한다.
argument-hint: "(선택) 요청 문서 경로. 기본: .claude/requests/modify_request.md"
---

# /wh-modify

## 1. 입력 확보
- 인수가 있으면 그 경로를, 없으면 `.claude/requests/modify_request.md` 를 사용한다.
- 파일이 없으면 플러그인 시드 `${CLAUDE_PLUGIN_ROOT}/requests/modify_request.md` 를 복사하고 안내 후 **중단**한다.

## 2. 검증 게이트 (fail-fast)
필수 섹션: `## 대상`, `## 변경 내용`, `## 영향 범위`, `## 수용 기준`.
- 누락/공란이면 누락 항목 보고 후 **중단**한다.

## 3. 파이프라인 디스패치 (순차, modify 모드)
1. **planner** (modify) — 기존 구조 탐색 → 단계별 수정 계획
2. **templater** (modify) — 영향받는 템플릿/패턴 갱신
3. **developer** (modify) — 기존 패턴을 따라 코드 수정
4. **ruler** (review) — 규칙 대조 검증 리포트

## 4. 결과
- 단계별 요약과 검증 리포트를 제시한다.
