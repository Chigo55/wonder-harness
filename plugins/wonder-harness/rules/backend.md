---
title: 백엔드 규칙 (Spring Boot)
owner: ruler
applies-to: developer
stack: Spring Boot (Java/Kotlin)
---

# 백엔드 규칙 — Spring Boot

## 계층 구조 (필수)

- `Controller` → `Service` → `Repository` 단방향 의존. 역방향·계층 건너뛰기 금지.
- Controller 는 HTTP 관심사만, 비즈니스 로직은 Service 에만 둔다.
- 엔티티를 Controller 응답으로 직접 노출하지 않는다 — DTO 로 변환한다.

## 영속성

- JPA 또는 MyBatis 중 프로젝트가 채택한 하나를 일관되게 사용한다.
- 쿼리는 파라미터 바인딩만 사용한다 (문자열 연결 금지 — security.md 참조).
- 트랜잭션 경계는 Service 메서드에 `@Transactional` 로 둔다.

## 네이밍·구조

- 패키지는 도메인(기능)별로 묶는다: `com.wonderit.<domain>.{controller,service,repository,dto}`.
- 클래스명: `<Domain>Controller`, `<Domain>Service`, `<Domain>Repository`.

## 에러 처리

- 도메인 예외는 명시적 예외 타입으로 던지고, `@ControllerAdvice` 에서 일괄 변환한다.
- 예외를 삼키지 않는다 — 최소 로깅 후 재던지거나 의미 있는 응답으로 변환한다.

## 검토 체크리스트 (review 모드)

- [ ] 계층 의존 방향 준수
- [ ] 엔티티 직접 노출 없음 (DTO 사용)
- [ ] 파라미터 바인딩 쿼리만 사용
- [ ] 트랜잭션 경계가 Service 에 있음
