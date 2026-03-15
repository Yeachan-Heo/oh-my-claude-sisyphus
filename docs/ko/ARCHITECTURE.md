# 아키텍처

> oh-my-claudecode가 멀티 에이전트 워크플로우를 오케스트레이션하는 방법.

## 개요

oh-my-claudecode는 스킬 기반 라우팅 시스템을 통해 Claude Code가 전문 에이전트를 오케스트레이션할 수 있도록 합니다.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         OH-MY-CLAUDECODE                                 │
│                     Intelligent Skill Activation                         │
└─────────────────────────────────────────────────────────────────────────┘

  User Input                      Skill Detection                 Execution
  ──────────                      ───────────────                 ─────────
       │                                │                              │
       ▼                                ▼                              ▼
┌─────────────┐              ┌──────────────────┐           ┌─────────────────┐
│  "ultrawork │              │   CLAUDE.md      │           │ SKILL ACTIVATED │
│   refactor  │─────────────▶│   Auto-Routing   │──────────▶│                 │
│   the API"  │              │                  │           │ ultrawork +     │
└─────────────┘              │ Task Type:       │           │ default +       │
                             │  - Implementation│           │ git-master      │
                             │  - Multi-file    │           │                 │
                             │  - Parallel OK   │           │ ┌─────────────┐ │
                             │                  │           │ │ Parallel    │ │
                             │ Skills:          │           │ │ agents      │ │
                             │  - ultrawork ✓   │           │ │ launched    │ │
                             │  - default ✓     │           │ └─────────────┘ │
                             │  - git-master ✓  │           │                 │
                             └──────────────────┘           │ ┌─────────────┐ │
                                                            │ │ Atomic      │ │
                                                            │ │ commits     │ │
                                                            │ └─────────────┘ │
                                                            └─────────────────┘
```

## 핵심 개념

### 스킬

스킬은 오케스트레이터의 동작 방식을 변경하는 **동작 주입(behavior injection)**입니다. 에이전트를 교체하는 대신, 조합 가능한 스킬을 통해 기능을 주입합니다:

- **실행 스킬**: 주요 작업 처리기 (`default`, `planner`, `orchestrate`)
- **향상 스킬**: 추가 기능 (`ultrawork`, `git-master`, `frontend-ui-ux`)
- **보장 스킬**: 완료 보장 (`ralph`)

스킬은 스택 및 조합이 가능합니다:
```
Task: "ultrawork: refactor API with proper commits"
Skills: ultrawork + default + git-master
```

### 에이전트

32개의 전문 에이전트가 복잡도 티어별로 구성되어 있습니다:

| 티어 | 모델 | 용도 |
|------|------|------|
| LOW | Haiku | 빠른 조회, 간단한 작업 |
| MEDIUM | Sonnet | 표준 구현 |
| HIGH | Opus | 복잡한 추론, 아키텍처 |

전체 에이전트 목록은 [REFERENCE.md](./REFERENCE.md)를 참조하세요.

### 위임

작업은 지능형 모델 라우팅을 통해 Task 도구로 위임됩니다:

```typescript
Task(
  subagent_type="oh-my-claudecode:executor",
  model="sonnet",
  prompt="Implement feature..."
)
```

`visual-engineering`이나 `ultrabrain` 같은 카테고리가 모델 티어, 온도, 사고 예산을 자동으로 선택합니다.

## 스킬 조합

스킬은 레이어로 조합됩니다:

```
┌─────────────────────────────────────────────────────────────┐
│  GUARANTEE LAYER (선택)                                      │
│  ralph: "검증 완료될 때까지 중단할 수 없음"                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  ENHANCEMENT LAYER (0~N개 스킬)                              │
│  ultrawork (병렬) | git-master (커밋) | frontend-ui-ux        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  EXECUTION LAYER (주요 스킬)                                  │
│  default (빌드) | orchestrate (조율) | planner (계획)         │
└─────────────────────────────────────────────────────────────┘
```

**공식:** `[실행 스킬] + [0~N개 향상 스킬] + [선택적 보장 스킬]`

## 상태 관리

상태 파일은 표준화된 위치를 따릅니다:

**로컬 프로젝트 상태:**
- `.omc/state/{name}.json` - 세션 상태 (pipeline, team)
- `.omc/notepads/{plan-name}/` - 계획 범위의 지식 캡처

**글로벌 상태:**
- `~/.omc/state/{name}.json` - 사용자 환경설정 및 글로벌 설정

레거시 위치는 읽기 시 자동으로 마이그레이션됩니다.

## 훅

oh-my-claudecode는 `src/hooks/`에 라이프사이클 이벤트를 위한 31개의 훅을 포함합니다:

| 이벤트 | 용도 |
|--------|------|
| `UserPromptSubmit` | 키워드 감지, 모드 활성화 |
| `Stop` | 계속 실행 강제, 세션 종료 |
| `PreToolUse` | 권한 검증 |
| `PostToolUse` | 에러 복구, 규칙 주입 |

전체 훅 목록은 [REFERENCE.md](./REFERENCE.md)를 참조하세요.

## 검증 프로토콜

검증 모듈은 증거와 함께 작업 완료를 보장합니다:

**표준 검사 항목:**
- BUILD: 컴파일 통과
- TEST: 모든 테스트 통과
- LINT: 린팅 에러 없음
- FUNCTIONALITY: 기능이 예상대로 작동
- ARCHITECT: Opus 티어 리뷰 승인
- TODO: 모든 작업 완료
- ERROR_FREE: 해결되지 않은 에러 없음

증거는 최신 상태(5분 이내)여야 하며 실제 명령어 출력을 포함해야 합니다.

## 추가 정보

- **전체 레퍼런스**: [REFERENCE.md](./REFERENCE.md) 참조
- **내부 API**: [FEATURES.md](../FEATURES.md) 참조
- **사용자 가이드**: [README.md](../../README.md) 참조
- **스킬 레퍼런스**: 프로젝트의 CLAUDE.md 참조