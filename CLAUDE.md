# wonder-harness 마켓플레이스

Claude Code 개발 하네스 단일 플러그인 마켓플레이스.

> ⚠️ **초기 단계** — 플러그인은 빈 쉘 구조이며 기능(commands·agents·hooks·skills)은 추후 구현 예정.

## 개발 명령어

```bash
# 플러그인 구조 검증
npm run validate

# 로컬 로드 (개발·테스트)
claude --plugin-dir ./plugins/wonder-harness
```

## 환경 요구사항

- Node.js >= 18.0.0

## 저장소 구조 (단일 플러그인 마켓플레이스)

```
root/                           ← 마켓플레이스 저장소
  ├── .claude-plugin/
  │     marketplace.json        ← 마켓플레이스 카탈로그 (wonder-harness 단독 등재)
  │
  ├── plugins/
  │     └── wonder-harness/     ← wonder-harness 플러그인
  │           ├── .claude-plugin/plugin.json   ← 플러그인 매니페스트
  │           ├── commands/     ← 슬래시 커맨드 (예정)
  │           ├── agents/       ← 격리 서브에이전트 (예정)
  │           ├── hooks/        ← 이벤트 훅 핸들러 (예정)
  │           └── skills/       ← SKILL.md 스킬 (예정)
  │
  ├── CLAUDE.md                 ← 이 파일
  └── package.json              ← 모노레포 루트
```

## 각 플러그인 구조 규칙

| 위치 | 내용 |
|------|------|
| `.claude-plugin/plugin.json` | 매니페스트만 (다른 파일 넣지 말 것) |
| `skills/` | `<name>/SKILL.md` 형태 |
| `agents/` | `<name>.md` 마크다운 에이전트 |
| `commands/` | `<name>.md` 슬래시 커맨드 |
| `hooks/hooks.json` | 훅 선언 정본 |

## 버전 업데이트 규칙

버전 변경 시 아래 2개 파일을 동시 수정:
- `plugins/wonder-harness/.claude-plugin/plugin.json` — `"version": "x.x.x"`
- `.claude-plugin/marketplace.json` — 해당 플러그인 항목 `"version": "x.x.x"`

커밋 순서: `fix/feat:` 커밋 → 별도 `chore: bump version to x.x.x` 커밋

## 개발 규칙

- 플러그인 경로는 모두 `./`로 시작하는 상대 경로
- 플러그인 외부 파일 참조 불가 (캐시 복사 방식)
- 훅은 경량 JS (Node.js built-in만 사용 — 외부 의존성 금지)
- 훅은 항상 non-blocking (차단 아닌 제안)
