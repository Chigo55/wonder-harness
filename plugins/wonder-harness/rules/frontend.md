---
title: 프론트엔드 규칙 (JSP/jQuery/Thymeleaf)
owner: ruler
applies-to: developer
stack: JSP + jQuery + Thymeleaf + 그리드 라이브러리
---

# 프론트엔드 규칙 — JSP / jQuery / Thymeleaf

## 뷰 구성

- 서버사이드 렌더링이 기본. 동적 조작만 jQuery 로 처리한다.
- JSP/Thymeleaf 에서 사용자 데이터 출력 시 항상 이스케이프한다 (`c:out` / `th:text`). 원시 출력 금지.
- 공통 레이아웃은 include/fragment 로 재사용한다.

## jQuery

- 셀렉터는 id 우선, 광범위 셀렉터 남용 금지.
- AJAX 응답은 항상 성공/실패 분기를 처리한다. 실패 시 사용자 메시지를 노출한다.
- 인라인 `onclick` 대신 이벤트 바인딩을 사용한다.

## 그리드 라이브러리

- 그리드 컬럼 정의·포맷터는 페이지 스크립트 상단에 모아 선언한다.
- 그리드 데이터 바인딩은 서버 응답 envelope(성공/데이터/에러)를 가정한다.

## 검토 체크리스트 (review 모드)

- [ ] 사용자 데이터 출력이 모두 이스케이프됨 (XSS 방지)
- [ ] AJAX 실패 처리 존재
- [ ] 인라인 핸들러 없음
