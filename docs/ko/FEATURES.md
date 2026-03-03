# 개발자 API 레퍼런스

> oh-my-claudecode 개발자 및 기여자를 위한 내부 API 문서입니다.

## 목차
1. [Notepad Wisdom 시스템](#notepad-wisdom-시스템)
2. [위임 카테고리](#위임-카테고리)
3. [디렉토리 진단](#디렉토리-진단)
4. [동적 프롬프트 생성](#동적-프롬프트-생성)
5. [에이전트 템플릿](#에이전트-템플릿)
6. [세션 재개](#세션-재개)
7. [Autopilot](#autopilot)

---

## Notepad Wisdom 시스템

작업을 실행하는 에이전트를 위한 계획 범위 지식 캡처 시스템입니다. 각 계획은 `.omc/notepads/{plan-name}/` 경로에 자체 노트패드 디렉토리를 가지며, 네 개의 마크다운 파일로 구성됩니다:

- **learnings.md**: 패턴, 관례, 성공적인 접근 방식
- **decisions.md**: 아키텍처 선택과 근거
- **issues.md**: 문제점과 차단 요소
- **problems.md**: 기술 부채와 주의사항

모든 항목은 자동으로 타임스탬프가 기록됩니다.

### 핵심 함수

```typescript
// 노트패드 디렉토리 초기화
initPlanNotepad(planName: string, directory?: string): boolean

// 항목 추가
addLearning(planName: string, content: string, directory?: string): boolean
addDecision(planName: string, content: string, directory?: string): boolean
addIssue(planName: string, content: string, directory?: string): boolean
addProblem(planName: string, content: string, directory?: string): boolean

// 지식 읽기
readPlanWisdom(planName: string, directory?: string): PlanWisdom
getWisdomSummary(planName: string, directory?: string): string
```

### 타입

```typescript
export interface WisdomEntry {
  timestamp: string;  // ISO 8601: "YYYY-MM-DD HH:MM:SS"
  content: string;
}

export type WisdomCategory = 'learnings' | 'decisions' | 'issues' | 'problems';

export interface PlanWisdom {
  planName: string;
  learnings: WisdomEntry[];
  decisions: WisdomEntry[];
  issues: WisdomEntry[];
  problems: WisdomEntry[];
}
```

### 사용 예시

```typescript
import { initPlanNotepad, addLearning, readPlanWisdom } from '@/features/notepad-wisdom';

// 초기화 및 기록
initPlanNotepad('api-v2-migration');
addLearning('api-v2-migration', 'API routes use Express Router pattern in src/routes/');

// 읽기
const wisdom = readPlanWisdom('api-v2-migration');
console.log(wisdom.learnings[0].content);
```

---

## 위임 카테고리

모델 티어, 온도, 사고 예산을 자동으로 결정하는 시맨틱 작업 분류 시스템입니다.

### 사용 가능한 카테고리

| 카테고리 | 티어 | 온도 | 사고 예산 | 용도 |
|----------|------|------|-----------|------|
| `visual-engineering` | HIGH | 0.7 | high | UI/UX, 프론트엔드, 디자인 시스템 |
| `ultrabrain` | HIGH | 0.3 | max | 복잡한 추론, 아키텍처, 디버깅 |
| `artistry` | MEDIUM | 0.9 | medium | 창의적 솔루션, 브레인스토밍 |
| `quick` | LOW | 0.1 | low | 간단한 조회, 기본 작업 |
| `writing` | MEDIUM | 0.5 | medium | 문서 작성, 기술 문서 |
| `unspecified-low` | LOW | 0.1 | low | 간단한 작업의 기본값 |
| `unspecified-high` | HIGH | 0.5 | high | 복잡한 작업의 기본값 |

### 핵심 함수

```typescript
// 카테고리 설정 해석
resolveCategory(category: DelegationCategory): ResolvedCategory

// 프롬프트에서 자동 감지
detectCategoryFromPrompt(taskPrompt: string): DelegationCategory | null

// 컨텍스트와 함께 카테고리 가져오기
getCategoryForTask(context: CategoryContext): ResolvedCategory

// 카테고리 가이드로 프롬프트 강화
enhancePromptWithCategory(taskPrompt: string, category: DelegationCategory): string

// 개별 접근자
getCategoryTier(category: DelegationCategory): ComplexityTier
getCategoryTemperature(category: DelegationCategory): number
getCategoryThinkingBudget(category: DelegationCategory): ThinkingBudget
getCategoryThinkingBudgetTokens(category: DelegationCategory): number
getCategoryPromptAppend(category: DelegationCategory): string
```

### 타입

```typescript
export type DelegationCategory =
  | 'visual-engineering'
  | 'ultrabrain'
  | 'artistry'
  | 'quick'
  | 'writing'
  | 'unspecified-low'
  | 'unspecified-high';

export type ThinkingBudget = 'low' | 'medium' | 'high' | 'max';

export interface ResolvedCategory {
  category: DelegationCategory;
  tier: ComplexityTier;
  temperature: number;
  thinkingBudget: ThinkingBudget;
  description: string;
  promptAppend?: string;
}

export interface CategoryContext {
  taskPrompt: string;
  agentType?: string;
  explicitCategory?: DelegationCategory;
  explicitTier?: ComplexityTier;
}
```

### 사용 예시

```typescript
import { getCategoryForTask, enhancePromptWithCategory } from '@/features/delegation-categories';

const userRequest = 'Debug the race condition in payment processor';

const resolved = getCategoryForTask({ taskPrompt: userRequest });
// resolved.category === 'ultrabrain'
// resolved.temperature === 0.3

const enhancedPrompt = enhancePromptWithCategory(userRequest, resolved.category);
// 추가됨: "Think deeply and systematically. Consider all edge cases..."
```

---

## 디렉토리 진단

이중 전략 방식을 사용하는 프로젝트 수준의 TypeScript/JavaScript QA 시스템입니다.

### 전략

- **`tsc`**: `tsc --noEmit`을 통한 빠른 TypeScript 컴파일 검사
- **`lsp`**: 파일별 Language Server Protocol 진단
- **`auto`**: 최적 전략 자동 선택 (기본값, tsc 사용 가능 시 우선)

### API

```typescript
runDirectoryDiagnostics(directory: string, strategy?: DiagnosticsStrategy): Promise<DirectoryDiagnosticResult>
```

### 타입

```typescript
export type DiagnosticsStrategy = 'tsc' | 'lsp' | 'auto';

export interface DirectoryDiagnosticResult {
  strategy: 'tsc' | 'lsp';
  success: boolean;
  errorCount: number;
  warningCount: number;
  diagnostics: string;
  summary: string;
}
```

### 사용 예시

```typescript
import { runDirectoryDiagnostics } from '@/tools/diagnostics';

const result = await runDirectoryDiagnostics(process.cwd());

if (!result.success) {
  console.error(`Found ${result.errorCount} errors:`);
  console.error(result.diagnostics);
  process.exit(1);
}

console.log('Build quality check passed!');
```

---

## 동적 프롬프트 생성

에이전트 메타데이터로부터 오케스트레이터 프롬프트를 동적으로 생성합니다. `definitions.ts`에 새로운 에이전트를 추가하면 생성된 프롬프트에 자동으로 포함됩니다.

### 핵심 함수

```typescript
// 전체 오케스트레이터 프롬프트 생성
generateOrchestratorPrompt(agents: AgentConfig[], options?: GeneratorOptions): string

// 정의를 설정으로 변환
convertDefinitionsToConfigs(definitions: Record<string, {...}>): AgentConfig[]

// 개별 섹션 빌더
buildHeader(): string
buildAgentRegistry(agents: AgentConfig[]): string
buildTriggerTable(agents: AgentConfig[]): string
buildToolSelectionSection(agents: AgentConfig[]): string
buildDelegationMatrix(agents: AgentConfig[]): string
buildOrchestrationPrinciples(): string
buildWorkflow(): string
buildCriticalRules(): string
buildCompletionChecklist(): string
```

### 타입

```typescript
export interface GeneratorOptions {
  includeAgents?: boolean;
  includeTriggers?: boolean;
  includeTools?: boolean;
  includeDelegationTable?: boolean;
  includePrinciples?: boolean;
  includeWorkflow?: boolean;
  includeRules?: boolean;
  includeChecklist?: boolean;
}
```

### 사용 예시

```typescript
import { getAgentDefinitions } from '@/agents/definitions';
import { generateOrchestratorPrompt, convertDefinitionsToConfigs } from '@/agents/prompt-generator';

const definitions = getAgentDefinitions();
const agents = convertDefinitionsToConfigs(definitions);
const prompt = generateOrchestratorPrompt(agents);
```

---

## 에이전트 템플릿

일반적인 작업 유형을 위한 표준화된 프롬프트 구조입니다.

### 탐색 템플릿

탐색, 리서치 또는 검색 작업을 위한 템플릿입니다.

**섹션:**
- **TASK**: 탐색이 필요한 항목
- **EXPECTED OUTCOME**: 오케스트레이터가 기대하는 반환 결과
- **CONTEXT**: 배경 정보
- **MUST DO**: 필수 수행 항목
- **MUST NOT DO**: 제약 사항
- **REQUIRED SKILLS**: 필요한 스킬
- **REQUIRED TOOLS**: 사용할 도구

**위치:** `src/agents/templates/exploration-template.md`

### 구현 템플릿

코드 구현, 리팩토링 또는 수정 작업을 위한 템플릿입니다.

**섹션:**
- **TASK**: 구현 목표
- **EXPECTED OUTCOME**: 산출물
- **CONTEXT**: 프로젝트 배경
- **MUST DO**: 필수 수행 항목
- **MUST NOT DO**: 제약 사항
- **REQUIRED SKILLS**: 필요한 스킬
- **REQUIRED TOOLS**: 사용할 도구
- **VERIFICATION CHECKLIST**: 완료 전 점검 항목

**위치:** `src/agents/templates/implementation-template.md`

---

## 세션 재개

전체 컨텍스트를 유지한 채 백그라운드 에이전트 세션을 재개하기 위한 래퍼입니다.

### API

```typescript
resumeSession(input: ResumeSessionInput): ResumeSessionOutput
```

### 타입

```typescript
export interface ResumeSessionInput {
  sessionId: string;
}

export interface ResumeSessionOutput {
  success: boolean;
  context?: {
    previousPrompt: string;
    toolCallCount: number;
    lastToolUsed?: string;
    lastOutputSummary?: string;
    continuationPrompt: string;
  };
  error?: string;
}
```

### 사용 예시

```typescript
import { resumeSession } from '@/tools/resume-session';

const result = resumeSession({ sessionId: 'ses_abc123' });

if (result.success && result.context) {
  console.log(`Resuming session with ${result.context.toolCallCount} prior tool calls`);

  // Task 위임으로 계속 진행
  Task({
    subagent_type: "oh-my-claudecode:executor",
    model: "sonnet",
    prompt: result.context.continuationPrompt
  });
}
```

---

## Autopilot

아이디어에서 검증된 작동 코드까지 5단계 개발 라이프사이클을 통한 자율 실행 시스템입니다.

### 5단계 워크플로우

1. **확장 (Expansion)** - Analyst + Architect가 아이디어를 요구 사항과 기술 사양으로 확장
2. **계획 (Planning)** - Architect가 실행 계획 작성 (Critic이 검증)
3. **실행 (Execution)** - Ralph + Ultrawork가 병렬 작업으로 계획 구현
4. **QA** - UltraQA가 수정 주기를 통해 빌드/린트/테스트 통과를 보장
5. **검증 (Validation)** - 전문 architect가 기능, 보안, 품질 리뷰 수행

### 핵심 타입

```typescript
export type AutopilotPhase =
  | 'expansion'
  | 'planning'
  | 'execution'
  | 'qa'
  | 'validation'
  | 'complete'
  | 'failed';

export interface AutopilotState {
  active: boolean;
  phase: AutopilotPhase;
  iteration: number;
  max_iterations: number;
  originalIdea: string;

  expansion: AutopilotExpansion;
  planning: AutopilotPlanning;
  execution: AutopilotExecution;
  qa: AutopilotQA;
  validation: AutopilotValidation;

  started_at: string;
  completed_at: string | null;
  phase_durations: Record<string, number>;
  total_agents_spawned: number;
  wisdom_entries: number;
  session_id?: string;
}

export interface AutopilotConfig {
  maxIterations?: number;              // 기본값: 10
  maxExpansionIterations?: number;     // 기본값: 2
  maxArchitectIterations?: number;     // 기본값: 5
  maxQaCycles?: number;                // 기본값: 5
  maxValidationRounds?: number;        // 기본값: 3
  parallelExecutors?: number;          // 기본값: 5
  pauseAfterExpansion?: boolean;       // 기본값: false
  pauseAfterPlanning?: boolean;        // 기본값: false
  skipQa?: boolean;                    // 기본값: false
  skipValidation?: boolean;            // 기본값: false
  autoCommit?: boolean;                // 기본값: false
  validationArchitects?: ValidationVerdictType[];
}
```

### 상태 관리

```typescript
// 세션 초기화
initAutopilot(directory: string, idea: string, sessionId?: string, config?: Partial<AutopilotConfig>): AutopilotState

// 상태 읽기/쓰기
readAutopilotState(directory: string): AutopilotState | null
writeAutopilotState(directory: string, state: AutopilotState): boolean
clearAutopilotState(directory: string): boolean

// 상태 확인
isAutopilotActive(directory: string): boolean

// 단계 전환
transitionPhase(directory: string, newPhase: AutopilotPhase): AutopilotState | null
transitionRalphToUltraQA(directory: string, sessionId: string): TransitionResult
transitionUltraQAToValidation(directory: string): TransitionResult
transitionToComplete(directory: string): TransitionResult
transitionToFailed(directory: string, error: string): TransitionResult

// 단계별 데이터 업데이트
updateExpansion(directory: string, updates: Partial<AutopilotExpansion>): boolean
updatePlanning(directory: string, updates: Partial<AutopilotPlanning>): boolean
updateExecution(directory: string, updates: Partial<AutopilotExecution>): boolean
updateQA(directory: string, updates: Partial<AutopilotQA>): boolean
updateValidation(directory: string, updates: Partial<AutopilotValidation>): boolean

// 메트릭
incrementAgentCount(directory: string, count?: number): boolean

// 경로
getSpecPath(directory: string): string  // .omc/autopilot/spec.md
getPlanPath(directory: string): string  // .omc/plans/autopilot-impl.md
```

### 프롬프트 생성

```typescript
// 단계별 프롬프트
getExpansionPrompt(idea: string): string
getDirectPlanningPrompt(specPath: string): string
getExecutionPrompt(planPath: string): string
getQAPrompt(): string
getValidationPrompt(specPath: string): string

// 범용 단계 프롬프트
getPhasePrompt(phase: string, context: object): string

// 전환 프롬프트
getTransitionPrompt(fromPhase: string, toPhase: string): string
```

### 검증 조율

```typescript
export type ValidationVerdictType = 'functional' | 'security' | 'quality';
export type ValidationVerdict = 'APPROVED' | 'REJECTED' | 'NEEDS_FIX';

// 판정 기록
recordValidationVerdict(directory: string, type: ValidationVerdictType, verdict: ValidationVerdict, issues?: string[]): boolean

// 상태 조회
getValidationStatus(directory: string): ValidationCoordinatorResult | null

// 검증 라운드 제어
startValidationRound(directory: string): boolean
shouldRetryValidation(directory: string, maxRounds?: number): boolean
getIssuesToFix(directory: string): string[]

// 프롬프트 및 표시
getValidationSpawnPrompt(specPath: string): string
formatValidationResults(state: AutopilotState): string
```

### 요약

```typescript
// 요약 생성
generateSummary(directory: string): AutopilotSummary | null

// 요약 포맷팅
formatSummary(summary: AutopilotSummary): string
formatCompactSummary(state: AutopilotState): string
formatFailureSummary(state: AutopilotState, error?: string): string
formatFileList(files: string[], title: string, maxFiles?: number): string
```

### 취소 및 재개

```typescript
// 진행 상황을 보존하며 취소
cancelAutopilot(directory: string): CancelResult
clearAutopilot(directory: string): CancelResult

// 재개
canResumeAutopilot(directory: string): { canResume: boolean; state?: AutopilotState; resumePhase?: string }
resumeAutopilot(directory: string): { success: boolean; message: string; state?: AutopilotState }

// 표시
formatCancelMessage(result: CancelResult): string
```

### 사용 예시

```typescript
import {
  initAutopilot,
  getPhasePrompt,
  readAutopilotState,
  transitionRalphToUltraQA,
  getValidationStatus,
  generateSummary,
  formatSummary
} from '@/hooks/autopilot';

// 세션 초기화
const idea = 'Create a REST API for todo management with authentication';
const state = initAutopilot(process.cwd(), idea, 'ses_abc123');

// 확장 단계 프롬프트 가져오기
const prompt = getPhasePrompt('expansion', { idea });

// 진행 상황 모니터링
const currentState = readAutopilotState(process.cwd());
console.log(`Phase: ${currentState?.phase}`);
console.log(`Agents spawned: ${currentState?.total_agents_spawned}`);

// 단계 전환
if (currentState?.phase === 'execution' && currentState.execution.ralph_completed_at) {
  const result = transitionRalphToUltraQA(process.cwd(), 'ses_abc123');
  if (result.success) {
    console.log('Transitioned to QA phase');
  }
}

// 검증 확인
const validationStatus = getValidationStatus(process.cwd());
if (validationStatus?.allApproved) {
  const summary = generateSummary(process.cwd());
  if (summary) {
    console.log(formatSummary(summary));
  }
}
```

### 상태 영속화

모든 상태는 `.omc/state/autopilot-state.json`에 영속화되며 다음 정보를 포함합니다:

- 활성 상태 및 현재 단계
- 원본 사용자 아이디어
- 단계별 진행 상황 (확장, 계획, 실행, QA, 검증)
- 생성 및 수정된 파일
- 에이전트 생성 수 및 메트릭
- 단계별 소요 시간 추적
- 세션 바인딩

---

## 추가 정보

- [CHANGELOG.md](../../CHANGELOG.md) - 버전 이력
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 시스템 아키텍처
- [MIGRATION.md](./MIGRATION.md) - 마이그레이션 가이드
- [에이전트 정의](../../src/agents/definitions.ts) - 에이전트 설정