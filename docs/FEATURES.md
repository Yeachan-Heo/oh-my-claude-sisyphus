# oh-my-claudecode Features Reference

> Developer documentation for v3.2 features integrated from oh-my-opencode.

## Table of Contents
1. [Notepad Wisdom System](#notepad-wisdom-system)
2. [Delegation Categories](#delegation-categories)
3. [Directory Diagnostics](#directory-diagnostics)
4. [Dynamic Prompt Generation](#dynamic-prompt-generation)
5. [Agent Templates](#agent-templates)
6. [Session Resume](#session-resume)
7. [Autopilot](#autopilot)

---

## Notepad Wisdom System

### Overview

The Notepad Wisdom system provides plan-scoped knowledge capture for agents executing tasks. Each plan gets its own notepad directory at `.omc/notepads/{plan-name}/` with four markdown files for categorizing knowledge:

- **learnings.md**: Patterns, conventions, successful approaches discovered during execution
- **decisions.md**: Architectural choices and rationales made during implementation
- **issues.md**: Problems and blockers encountered that may need attention
- **problems.md**: Technical debt, gotchas, or ongoing challenges

All entries are timestamped automatically, creating an audit trail of the agent's learning process.

### API Reference

#### `initPlanNotepad(planName: string, directory?: string): boolean`

Initialize notepad directory for a plan. Creates `.omc/notepads/{plan-name}/` with 4 empty markdown files.

**Parameters:**
- `planName`: Name of the plan (used as directory name)
- `directory`: Project root directory (defaults to `process.cwd()`)

**Returns:** `true` if successful, `false` on error

**Example:**
```typescript
import { initPlanNotepad } from '@/features/notepad-wisdom';

initPlanNotepad('feature-auth-refactor');
// Creates: .omc/notepads/feature-auth-refactor/{learnings,decisions,issues,problems}.md
```

---

#### `readPlanWisdom(planName: string, directory?: string): PlanWisdom`

Read all wisdom from a plan's notepad. Returns concatenated wisdom from all 4 categories.

**Parameters:**
- `planName`: Name of the plan
- `directory`: Project root directory (defaults to `process.cwd()`)

**Returns:** `PlanWisdom` object with all entries organized by category

**Example:**
```typescript
import { readPlanWisdom } from '@/features/notepad-wisdom';

const wisdom = readPlanWisdom('feature-auth-refactor');
console.log(wisdom.learnings.length); // Number of learning entries
console.log(wisdom.decisions[0].content); // First decision content
```

---

#### `addLearning(planName: string, content: string, directory?: string): boolean`

Add a timestamped learning entry to the plan's notepad.

**Parameters:**
- `planName`: Name of the plan
- `content`: Learning content to record
- `directory`: Project root directory (defaults to `process.cwd()`)

**Returns:** `true` if successful, `false` on error

**Example:**
```typescript
import { addLearning } from '@/features/notepad-wisdom';

addLearning(
  'feature-auth-refactor',
  'User authentication follows singleton pattern in src/auth/AuthService.ts'
);
```

---

#### `addDecision(planName: string, content: string, directory?: string): boolean`

Add a timestamped decision entry to the plan's notepad.

**Parameters:**
- `planName`: Name of the plan
- `content`: Decision content to record
- `directory`: Project root directory (defaults to `process.cwd()`)

**Returns:** `true` if successful, `false` on error

**Example:**
```typescript
import { addDecision } from '@/features/notepad-wisdom';

addDecision(
  'feature-auth-refactor',
  'Using JWT tokens instead of session cookies to maintain stateless architecture'
);
```

---

#### `addIssue(planName: string, content: string, directory?: string): boolean`

Add a timestamped issue entry to the plan's notepad.

**Parameters:**
- `planName`: Name of the plan
- `content`: Issue content to record
- `directory`: Project root directory (defaults to `process.cwd()`)

**Returns:** `true` if successful, `false` on error

**Example:**
```typescript
import { addIssue } from '@/features/notepad-wisdom';

addIssue(
  'feature-auth-refactor',
  'TypeScript errors in auth middleware - missing type definitions for req.user'
);
```

---

#### `addProblem(planName: string, content: string, directory?: string): boolean`

Add a timestamped problem entry to the plan's notepad.

**Parameters:**
- `planName`: Name of the plan
- `content`: Problem content to record
- `directory`: Project root directory (defaults to `process.cwd()`)

**Returns:** `true` if successful, `false` on error

**Example:**
```typescript
import { addProblem } from '@/features/notepad-wisdom';

addProblem(
  'feature-auth-refactor',
  'Legacy password hashing uses MD5 - needs migration strategy for existing users'
);
```

---

#### `getWisdomSummary(planName: string, directory?: string): string`

Get a formatted string of all wisdom for a plan. Returns markdown-formatted summary.

**Parameters:**
- `planName`: Name of the plan
- `directory`: Project root directory (defaults to `process.cwd()`)

**Returns:** Markdown-formatted summary string

**Example:**
```typescript
import { getWisdomSummary } from '@/features/notepad-wisdom';

const summary = getWisdomSummary('feature-auth-refactor');
console.log(summary);
// # Learnings
// - [2026-01-21 10:30:45] User authentication follows singleton pattern...
// # Decisions
// - [2026-01-21 10:35:12] Using JWT tokens instead of session cookies...
```

---

### Types

```typescript
export interface WisdomEntry {
  timestamp: string;  // ISO 8601 format: "YYYY-MM-DD HH:MM:SS"
  content: string;    // Entry content
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

### Examples

**Example 1: Agent recording learnings during task execution**
```typescript
import { initPlanNotepad, addLearning, addDecision } from '@/features/notepad-wisdom';

// Initialize notepad at start of plan
initPlanNotepad('api-v2-migration');

// Record learnings as you discover patterns
addLearning('api-v2-migration', 'API routes use Express Router pattern in src/routes/');
addLearning('api-v2-migration', 'Validation middleware applied at route level, not controller');

// Record architectural decisions
addDecision('api-v2-migration', 'Migrating to REST resource pattern with versioned endpoints');
```

**Example 2: Reading wisdom for context in follow-up tasks**
```typescript
import { readPlanWisdom } from '@/features/notepad-wisdom';

const wisdom = readPlanWisdom('api-v2-migration');

// Check what was learned previously
const hasRoutingInfo = wisdom.learnings.some(l =>
  l.content.includes('Express Router')
);

// Review past decisions
const migrationDecision = wisdom.decisions.find(d =>
  d.content.includes('REST resource pattern')
);
```

**Example 3: Generating a wisdom report**
```typescript
import { getWisdomSummary } from '@/features/notepad-wisdom';
import { writeFileSync } from 'fs';

const summary = getWisdomSummary('api-v2-migration');
writeFileSync('migration-report.md', summary);
```

---

## Delegation Categories

### Overview

The Delegation Categories system provides semantic task classification that automatically determines optimal model tier, temperature, and thinking budget. Categories enhance prompts with domain-specific guidance while the model-routing system independently selects the appropriate model.

**Available Categories:**
- **visual-engineering**: UI/UX work, frontend, design systems
- **ultrabrain**: Complex reasoning, architecture, deep debugging
- **artistry**: Creative solutions, innovative approaches
- **quick**: Simple lookups, straightforward operations
- **writing**: Documentation, technical writing, content
- **unspecified-low**: Default for simple unclassified tasks
- **unspecified-high**: Default for complex unclassified tasks

### API Reference

#### `resolveCategory(category: DelegationCategory): ResolvedCategory`

Resolve a category to its full configuration including tier, temperature, and thinking budget.

**Parameters:**
- `category`: The category to resolve

**Returns:** Resolved category with full configuration

**Example:**
```typescript
import { resolveCategory } from '@/features/delegation-categories';

const config = resolveCategory('ultrabrain');
console.log(config.tier);              // 'HIGH'
console.log(config.temperature);       // 0.3
console.log(config.thinkingBudget);    // 'max'
console.log(config.description);       // 'Complex reasoning, architecture...'
```

---

#### `isValidCategory(category: string): category is DelegationCategory`

Check if a string is a valid delegation category.

**Parameters:**
- `category`: String to check

**Returns:** `true` if valid category

**Example:**
```typescript
import { isValidCategory } from '@/features/delegation-categories';

isValidCategory('ultrabrain');      // true
isValidCategory('invalid-cat');     // false
```

---

#### `getAllCategories(): DelegationCategory[]`

Get all available delegation categories.

**Returns:** Array of all delegation categories

**Example:**
```typescript
import { getAllCategories } from '@/features/delegation-categories';

const categories = getAllCategories();
// ['visual-engineering', 'ultrabrain', 'artistry', 'quick', 'writing', ...]
```

---

#### `getCategoryDescription(category: DelegationCategory): string`

Get human-readable description for a category.

**Parameters:**
- `category`: The category

**Returns:** Description string

**Example:**
```typescript
import { getCategoryDescription } from '@/features/delegation-categories';

const desc = getCategoryDescription('visual-engineering');
// 'UI/visual reasoning, frontend work, design systems'
```

---

#### `detectCategoryFromPrompt(taskPrompt: string): DelegationCategory | null`

Detect category from task prompt using keyword matching. Requires at least 2 keyword matches for confidence.

**Parameters:**
- `taskPrompt`: The task description

**Returns:** Best matching category or `null` if no confident match

**Example:**
```typescript
import { detectCategoryFromPrompt } from '@/features/delegation-categories';

const category = detectCategoryFromPrompt('Design a beautiful dashboard with responsive layout');
console.log(category); // 'visual-engineering'

const category2 = detectCategoryFromPrompt('Debug race condition in payment processor');
console.log(category2); // 'ultrabrain'
```

---

#### `getCategoryForTask(context: CategoryContext): ResolvedCategory`

Get category for a task with full context. Handles explicit overrides and auto-detection.

**Parameters:**
- `context`: Category resolution context

**Returns:** Resolved category with configuration

**Example:**
```typescript
import { getCategoryForTask } from '@/features/delegation-categories';

// Auto-detect from prompt
const resolved = getCategoryForTask({
  taskPrompt: 'Create a responsive navigation component'
});
console.log(resolved.category);      // 'visual-engineering'
console.log(resolved.temperature);   // 0.7

// Explicit category override
const resolved2 = getCategoryForTask({
  taskPrompt: 'Some task',
  explicitCategory: 'ultrabrain'
});
console.log(resolved2.category);     // 'ultrabrain'
```

---

#### `getCategoryTier(category: DelegationCategory): ComplexityTier`

Get complexity tier from category (for backward compatibility).

**Parameters:**
- `category`: Delegation category

**Returns:** Complexity tier ('LOW' | 'MEDIUM' | 'HIGH')

**Example:**
```typescript
import { getCategoryTier } from '@/features/delegation-categories';

const tier = getCategoryTier('ultrabrain');  // 'HIGH'
const tier2 = getCategoryTier('quick');      // 'LOW'
```

---

#### `getCategoryTemperature(category: DelegationCategory): number`

Get temperature setting from category.

**Parameters:**
- `category`: Delegation category

**Returns:** Temperature value (0-1)

**Example:**
```typescript
import { getCategoryTemperature } from '@/features/delegation-categories';

const temp = getCategoryTemperature('visual-engineering');  // 0.7
const temp2 = getCategoryTemperature('ultrabrain');         // 0.3
```

---

#### `getCategoryThinkingBudget(category: DelegationCategory): ThinkingBudget`

Get thinking budget level from category.

**Parameters:**
- `category`: Delegation category

**Returns:** Thinking budget level ('low' | 'medium' | 'high' | 'max')

**Example:**
```typescript
import { getCategoryThinkingBudget } from '@/features/delegation-categories';

const budget = getCategoryThinkingBudget('ultrabrain');  // 'max'
const budget2 = getCategoryThinkingBudget('quick');      // 'low'
```

---

#### `getCategoryThinkingBudgetTokens(category: DelegationCategory): number`

Get thinking budget in approximate tokens.

**Parameters:**
- `category`: Delegation category

**Returns:** Token budget (1000/5000/10000/32000)

**Example:**
```typescript
import { getCategoryThinkingBudgetTokens } from '@/features/delegation-categories';

const tokens = getCategoryThinkingBudgetTokens('ultrabrain');  // 32000
const tokens2 = getCategoryThinkingBudgetTokens('quick');      // 1000
```

---

#### `getCategoryPromptAppend(category: DelegationCategory): string`

Get prompt appendix for category. Returns context-specific guidance added to prompts.

**Parameters:**
- `category`: Delegation category

**Returns:** Prompt appendix or empty string

**Example:**
```typescript
import { getCategoryPromptAppend } from '@/features/delegation-categories';

const append = getCategoryPromptAppend('visual-engineering');
// 'Focus on visual design, user experience, and aesthetic quality...'
```

---

#### `enhancePromptWithCategory(taskPrompt: string, category: DelegationCategory): string`

Create a delegation prompt with category-specific guidance appended.

**Parameters:**
- `taskPrompt`: Base task prompt
- `category`: Delegation category

**Returns:** Enhanced prompt with category guidance

**Example:**
```typescript
import { enhancePromptWithCategory } from '@/features/delegation-categories';

const enhanced = enhancePromptWithCategory(
  'Create a dashboard component',
  'visual-engineering'
);
// 'Create a dashboard component\n\nFocus on visual design, user experience...'
```

---

### Types

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

export interface CategoryConfig {
  tier: ComplexityTier;          // 'LOW' | 'MEDIUM' | 'HIGH'
  temperature: number;            // 0-1
  thinkingBudget: ThinkingBudget;
  promptAppend?: string;
  description: string;
}

export interface ResolvedCategory extends CategoryConfig {
  category: DelegationCategory;
}

export interface CategoryContext {
  taskPrompt: string;
  agentType?: string;
  explicitCategory?: DelegationCategory;
  explicitTier?: ComplexityTier;
}
```

### Examples

**Example 1: Auto-detecting category for delegation**
```typescript
import { getCategoryForTask, enhancePromptWithCategory } from '@/features/delegation-categories';

const userRequest = 'Debug the race condition in the payment processor';

const resolved = getCategoryForTask({ taskPrompt: userRequest });
console.log(resolved.category);      // 'ultrabrain'
console.log(resolved.tier);          // 'HIGH'
console.log(resolved.temperature);   // 0.3

const enhancedPrompt = enhancePromptWithCategory(userRequest, resolved.category);
// Prompt now includes: "Think deeply and systematically. Consider all edge cases..."
```

**Example 2: Explicit category override for specific needs**
```typescript
import { getCategoryForTask } from '@/features/delegation-categories';

const resolved = getCategoryForTask({
  taskPrompt: 'Implement user profile page',
  explicitCategory: 'visual-engineering'  // Force visual engineering approach
});
```

**Example 3: Building custom delegation with category configuration**
```typescript
import { resolveCategory, getCategoryThinkingBudgetTokens } from '@/features/delegation-categories';

const config = resolveCategory('artistry');
const tokens = getCategoryThinkingBudgetTokens('artistry');

const delegationParams = {
  tier: config.tier,
  temperature: config.temperature,
  thinkingBudgetTokens: tokens,
  prompt: config.promptAppend
    ? `${basePrompt}\n\n${config.promptAppend}`
    : basePrompt
};
```

---

## Directory Diagnostics

### Overview

Directory Diagnostics provides project-level QA enforcement for TypeScript/JavaScript projects using a dual-strategy approach:

1. **Primary Strategy (tsc)**: Fast, comprehensive TypeScript compilation check via `tsc --noEmit`
2. **Fallback Strategy (LSP)**: File-by-file Language Server Protocol diagnostics when tsc unavailable

The system automatically selects the best strategy based on project configuration.

### API Reference

#### `runDirectoryDiagnostics(directory: string, strategy?: DiagnosticsStrategy): Promise<DirectoryDiagnosticResult>`

Run directory-level diagnostics using the best available strategy.

**Parameters:**
- `directory`: Project directory to check
- `strategy`: Strategy to use - `'tsc'`, `'lsp'`, or `'auto'` (default: `'auto'`)

**Returns:** Promise resolving to diagnostic results

**Example:**
```typescript
import { runDirectoryDiagnostics } from '@/tools/diagnostics';

const result = await runDirectoryDiagnostics('/path/to/project');

console.log(result.strategy);        // 'tsc' or 'lsp'
console.log(result.success);         // true if no errors
console.log(result.errorCount);      // Number of errors
console.log(result.warningCount);    // Number of warnings
console.log(result.diagnostics);     // Formatted diagnostics output
console.log(result.summary);         // Human-readable summary
```

---

### Types

```typescript
export type DiagnosticsStrategy = 'tsc' | 'lsp' | 'auto';

export interface DirectoryDiagnosticResult {
  strategy: 'tsc' | 'lsp';     // Strategy that was used
  success: boolean;             // true if no errors
  errorCount: number;
  warningCount: number;
  diagnostics: string;          // Formatted diagnostic output
  summary: string;              // Human-readable summary
}

// Re-exported from sub-modules
export interface TscDiagnostic {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

export interface TscResult {
  success: boolean;
  errorCount: number;
  warningCount: number;
  diagnostics: TscDiagnostic[];
}

export interface LspDiagnosticWithFile {
  file: string;
  diagnostic: Diagnostic;  // VS Code LSP Diagnostic type
}

export interface LspAggregationResult {
  success: boolean;
  errorCount: number;
  warningCount: number;
  filesChecked: number;
  diagnostics: LspDiagnosticWithFile[];
}
```

### Examples

**Example 1: Auto-detect best strategy**
```typescript
import { runDirectoryDiagnostics } from '@/tools/diagnostics';

const result = await runDirectoryDiagnostics(process.cwd());

if (result.success) {
  console.log('All checks passed!');
} else {
  console.error(`Found ${result.errorCount} errors:`);
  console.error(result.diagnostics);
}
```

**Example 2: Force specific strategy**
```typescript
import { runDirectoryDiagnostics } from '@/tools/diagnostics';

// Force tsc even if LSP is available
const result = await runDirectoryDiagnostics(process.cwd(), 'tsc');

console.log(result.summary);
// 'TypeScript check failed: 3 errors, 1 warnings'
```

**Example 3: Integration with CI/CD**
```typescript
import { runDirectoryDiagnostics } from '@/tools/diagnostics';

async function ciCheck() {
  const result = await runDirectoryDiagnostics(process.cwd(), 'auto');

  if (!result.success) {
    console.error(result.diagnostics);
    process.exit(1);
  }

  console.log('Build quality check passed!');
}
```

---

## Dynamic Prompt Generation

### Overview

The Dynamic Prompt Generation system builds orchestrator prompts dynamically from agent metadata. Adding a new agent to `definitions.ts` automatically includes it in generated prompts. This ensures the orchestrator always has up-to-date knowledge of available agents.

### Generator API

#### `generateOrchestratorPrompt(agents: AgentConfig[], options?: GeneratorOptions): string`

Generate complete orchestrator prompt from agent definitions.

**Parameters:**
- `agents`: Array of agent configurations
- `options`: Optional configuration for which sections to include

**Returns:** Generated orchestrator prompt string

**Example:**
```typescript
import { getAgentDefinitions } from '@/agents/definitions';
import { generateOrchestratorPrompt, convertDefinitionsToConfigs } from '@/agents/prompt-generator';

const definitions = getAgentDefinitions();
const agents = convertDefinitionsToConfigs(definitions);
const prompt = generateOrchestratorPrompt(agents);

console.log(prompt);
// Full orchestrator prompt with agent registry, triggers, delegation guide, etc.
```

---

#### `convertDefinitionsToConfigs(definitions: Record<string, {...}>): AgentConfig[]`

Convert agent definitions record to array of AgentConfig for generation.

**Parameters:**
- `definitions`: Record of agent definitions from `getAgentDefinitions()`

**Returns:** Array of AgentConfig suitable for prompt generation

**Example:**
```typescript
import { getAgentDefinitions } from '@/agents/definitions';
import { convertDefinitionsToConfigs, generateOrchestratorPrompt } from '@/agents/prompt-generator';

const definitions = getAgentDefinitions();
const agents = convertDefinitionsToConfigs(definitions);
const prompt = generateOrchestratorPrompt(agents);
```

---

### Section Builders

Individual section builders are exported for custom prompt composition:

#### `buildHeader(): string`
Build the header section with core orchestrator identity.

#### `buildAgentRegistry(agents: AgentConfig[]): string`
Build the agent registry section with descriptions.

#### `buildTriggerTable(agents: AgentConfig[]): string`
Build the trigger table showing when to use each agent.

#### `buildToolSelectionSection(agents: AgentConfig[]): string`
Build tool selection guidance section.

#### `buildDelegationMatrix(agents: AgentConfig[]): string`
Build delegation matrix/guide table.

#### `buildOrchestrationPrinciples(): string`
Build orchestration principles section.

#### `buildWorkflow(): string`
Build workflow section.

#### `buildCriticalRules(): string`
Build critical rules section.

#### `buildCompletionChecklist(): string`
Build completion checklist section.

### Types

```typescript
export interface GeneratorOptions {
  includeAgents?: boolean;          // default: true
  includeTriggers?: boolean;        // default: true
  includeTools?: boolean;           // default: true
  includeDelegationTable?: boolean; // default: true
  includePrinciples?: boolean;      // default: true
  includeWorkflow?: boolean;        // default: true
  includeRules?: boolean;           // default: true
  includeChecklist?: boolean;       // default: true
}
```

### Examples

**Example 1: Generate full orchestrator prompt**
```typescript
import { getAgentDefinitions } from '@/agents/definitions';
import { generateOrchestratorPrompt, convertDefinitionsToConfigs } from '@/agents/prompt-generator';

const definitions = getAgentDefinitions();
const agents = convertDefinitionsToConfigs(definitions);
const fullPrompt = generateOrchestratorPrompt(agents);
```

**Example 2: Generate partial prompt (agents + triggers only)**
```typescript
import { generateOrchestratorPrompt, convertDefinitionsToConfigs } from '@/agents/prompt-generator';
import { getAgentDefinitions } from '@/agents/definitions';

const agents = convertDefinitionsToConfigs(getAgentDefinitions());
const partialPrompt = generateOrchestratorPrompt(agents, {
  includeAgents: true,
  includeTriggers: true,
  includeTools: false,
  includeDelegationTable: false,
  includePrinciples: false,
  includeWorkflow: false,
  includeRules: false,
  includeChecklist: false
});
```

**Example 3: Custom prompt composition with individual builders**
```typescript
import {
  buildHeader,
  buildAgentRegistry,
  buildDelegationMatrix
} from '@/agents/prompt-generator';
import { getAgentDefinitions } from '@/agents/definitions';
import { convertDefinitionsToConfigs } from '@/agents/prompt-generator';

const agents = convertDefinitionsToConfigs(getAgentDefinitions());

const customPrompt = [
  buildHeader(),
  '',
  buildAgentRegistry(agents),
  '',
  buildDelegationMatrix(agents),
  '',
  'CUSTOM SECTION: Special instructions here'
].join('\n');
```

---

## Agent Templates

### Overview

Agent templates provide standardized prompt structures for common task types. They ensure consistency in agent delegation and make it easier to provide comprehensive context.

### Available Templates

#### Exploration Template (`src/agents/templates/exploration-template.md`)

Use for exploration, research, or search tasks.

**Sections:**
- **TASK**: Clear description of what needs to be explored
- **EXPECTED OUTCOME**: What the orchestrator expects back
- **CONTEXT**: Background information to guide exploration
- **MUST DO**: Required actions
- **MUST NOT DO**: Constraints
- **REQUIRED SKILLS**: Skills needed for the task
- **REQUIRED TOOLS**: Tools the agent should use

**Example Use Case:**
- Finding all implementations of a class
- Researching how a feature is implemented
- Exploring database schema
- Searching for usage patterns

---

#### Implementation Template (`src/agents/templates/implementation-template.md`)

Use for code implementation, refactoring, or modification tasks.

**Sections:**
- **TASK**: Clear description of implementation goal
- **EXPECTED OUTCOME**: What should be delivered
- **CONTEXT**: Project background and conventions
- **MUST DO**: Required actions (tests, types, patterns)
- **MUST NOT DO**: Constraints (breaking changes, etc.)
- **REQUIRED SKILLS**: Skills needed
- **REQUIRED TOOLS**: Tools to use
- **VERIFICATION CHECKLIST**: Pre-completion checks

**Example Use Case:**
- Adding error handling
- Implementing new features
- Refactoring code
- Adding type definitions

---

### Examples

**Example 1: Using exploration template**
```typescript
const explorationTask = `
## TASK
Find all implementations of the UserService class and how they handle authentication.

## EXPECTED OUTCOME
- List of file paths with line numbers
- Summary of authentication patterns found
- Recommendations for consolidation if multiple patterns exist

## CONTEXT
- TypeScript monorepo using pnpm workspaces
- Investigating inconsistent authentication behavior
- Focus on src/services and src/auth directories

## MUST DO
- Use Grep for content search
- Return structured results with file paths and line numbers
- Highlight any security concerns

## MUST NOT DO
- Do not modify any files
- Do not search node_modules
- Do not include test files in primary results
`;
```

**Example 2: Using implementation template**
```typescript
const implementationTask = `
## TASK
Add rate limiting middleware to all API routes.

## EXPECTED OUTCOME
- Rate limiting middleware integrated with tests
- All API routes protected
- Configuration via environment variables

## CONTEXT
- Express.js API using TypeScript
- Existing middleware in src/middleware/
- Use express-rate-limit (already installed)
- Apply limits: 100 requests per 15 minutes per IP

## MUST DO
- Create middleware in src/middleware/rate-limit.ts
- Add TypeScript types
- Write unit tests
- Add JSDoc documentation
- Update README

## MUST NOT DO
- Do not modify existing route handlers
- Do not hard-code rate limit values
- Do not break existing tests
`;
```

---

## Session Resume

### Overview

The Session Resume tool provides a wrapper for resuming background agent sessions. Since Claude Code's native Task tool cannot be extended, this tool retrieves session context and builds continuation prompts for delegation.

### API Reference

#### `resumeSession(input: ResumeSessionInput): ResumeSessionOutput`

Resume a background agent session and prepare continuation prompt.

**Parameters:**
- `input.sessionId`: Session ID to resume

**Returns:** Resume context or error

**Example:**
```typescript
import { resumeSession } from '@/tools/resume-session';

const result = resumeSession({ sessionId: 'ses_abc123' });

if (result.success && result.context) {
  console.log(result.context.previousPrompt);
  console.log(result.context.toolCallCount);
  console.log(result.context.continuationPrompt);

  // Use continuation prompt in next Task delegation
  Task({
    subagent_type: "oh-my-claudecode:executor",
    model: "sonnet",
    prompt: result.context.continuationPrompt
  });
} else {
  console.error(result.error);
}
```

---

### Types

```typescript
export interface ResumeSessionInput {
  sessionId: string;  // Session ID to resume
}

export interface ResumeSessionOutput {
  success: boolean;
  context?: {
    previousPrompt: string;         // Original prompt from the session
    toolCallCount: number;           // Number of tool calls made so far
    lastToolUsed?: string;           // Last tool used (if any)
    lastOutputSummary?: string;      // Summary of last output (truncated to 500 chars)
    continuationPrompt: string;      // Formatted continuation prompt for next Task
  };
  error?: string;  // Error message (if failed)
}
```

### Examples

**Example 1: Basic session resume**
```typescript
import { resumeSession } from '@/tools/resume-session';

const result = resumeSession({ sessionId: 'ses_abc123' });

if (result.success && result.context) {
  console.log(`Resuming session with ${result.context.toolCallCount} prior tool calls`);
  console.log(`Last used: ${result.context.lastToolUsed}`);
}
```

**Example 2: Resume and continue with Task delegation**
```typescript
import { resumeSession } from '@/tools/resume-session';

async function continueBackgroundWork(sessionId: string) {
  const resume = resumeSession({ sessionId });

  if (!resume.success || !resume.context) {
    throw new Error(resume.error || 'Failed to resume session');
  }

  // Delegate continuation to same agent type
  const result = await Task({
    subagent_type: "oh-my-claudecode:executor",
    model: "sonnet",
    prompt: resume.context.continuationPrompt
  });

  return result;
}
```

**Example 3: Checking session progress before resuming**
```typescript
import { resumeSession } from '@/tools/resume-session';

const result = resumeSession({ sessionId: 'ses_abc123' });

if (result.success && result.context) {
  const { toolCallCount, lastOutputSummary } = result.context;

  console.log(`Session has made ${toolCallCount} tool calls`);
  console.log(`Last output: ${lastOutputSummary}`);

  // Decide whether to resume or start fresh based on progress
  if (toolCallCount > 50) {
    console.warn('Session may be stuck in a loop - consider starting fresh');
  }
}
```

---

## Autopilot

### Overview

The Autopilot feature provides autonomous execution from an initial idea to fully validated working code. It orchestrates a complete 5-phase development lifecycle with minimal human intervention.

**5-Phase Workflow:**

1. **Expansion** - Analyst + Architect expand the idea into detailed requirements and technical spec
2. **Planning** - Architect creates comprehensive execution plan (validated by Critic)
3. **Execution** - Ralph + Ultrawork implement the plan with parallel task execution
4. **QA** - UltraQA ensures build/lint/tests pass through automated fix cycles
5. **Validation** - Specialized architects perform functional, security, and quality reviews

The system automatically transitions between phases, handles mutual exclusion between conflicting modes (Ralph/UltraQA), and preserves progress for resumption if interrupted.

### Key Features

- **Zero-prompt planning**: From idea to spec to plan to code automatically
- **Parallel execution**: Ultrawork spawns multiple executors for independent tasks
- **Automated QA**: Fix-test cycles until build/lint/tests pass
- **Multi-architect validation**: Functional, security, and quality review in parallel
- **Resumable sessions**: Cancel and resume without losing progress
- **Wisdom capture**: Learning entries automatically recorded in notepad system

### API Reference

#### Types

##### `AutopilotPhase`

```typescript
export type AutopilotPhase =
  | 'expansion'    // Requirements gathering and spec creation
  | 'planning'     // Creating detailed execution plan
  | 'execution'    // Implementing the plan
  | 'qa'          // Quality assurance testing
  | 'validation'  // Final verification by architects
  | 'complete'    // Successfully completed
  | 'failed';     // Failed to complete
```

##### `AutopilotState`

Complete state for an autopilot session.

```typescript
export interface AutopilotState {
  active: boolean;              // Whether autopilot is currently active
  phase: AutopilotPhase;        // Current phase of execution
  iteration: number;            // Current iteration number
  max_iterations: number;       // Maximum iterations before giving up
  originalIdea: string;         // Original user input

  // State for each phase
  expansion: AutopilotExpansion;
  planning: AutopilotPlanning;
  execution: AutopilotExecution;
  qa: AutopilotQA;
  validation: AutopilotValidation;

  // Metrics
  started_at: string;
  completed_at: string | null;
  phase_durations: Record<string, number>;
  total_agents_spawned: number;
  wisdom_entries: number;

  // Session binding
  session_id?: string;
}
```

##### `AutopilotConfig`

Configuration options for autopilot behavior.

```typescript
export interface AutopilotConfig {
  maxIterations?: number;              // Max total iterations (default: 10)
  maxExpansionIterations?: number;     // Max expansion iterations (default: 2)
  maxArchitectIterations?: number;     // Max planning iterations (default: 5)
  maxQaCycles?: number;                // Max QA test-fix cycles (default: 5)
  maxValidationRounds?: number;        // Max validation rounds (default: 3)
  parallelExecutors?: number;          // Number of parallel executors (default: 5)
  pauseAfterExpansion?: boolean;       // Pause for confirmation (default: false)
  pauseAfterPlanning?: boolean;        // Pause for confirmation (default: false)
  skipQa?: boolean;                    // Skip QA phase (default: false)
  skipValidation?: boolean;            // Skip validation phase (default: false)
  autoCommit?: boolean;                // Auto-commit when complete (default: false)
  validationArchitects?: ValidationVerdictType[];  // Validation types (default: all)
}
```

##### Phase-Specific State

**AutopilotExpansion**

```typescript
export interface AutopilotExpansion {
  analyst_complete: boolean;       // Analyst finished requirements
  architect_complete: boolean;     // Architect finished technical design
  spec_path: string | null;        // Path to generated spec
  requirements_summary: string;    // Summary of requirements
  tech_stack: string[];            // Identified technology stack
}
```

**AutopilotPlanning**

```typescript
export interface AutopilotPlanning {
  plan_path: string | null;        // Path to execution plan
  architect_iterations: number;    // Number of architect iterations
  approved: boolean;               // Whether Critic approved the plan
}
```

**AutopilotExecution**

```typescript
export interface AutopilotExecution {
  ralph_iterations: number;        // Number of ralph persistence iterations
  ultrawork_active: boolean;       // Whether ultrawork is active
  tasks_completed: number;         // Tasks completed from plan
  tasks_total: number;             // Total tasks in plan
  files_created: string[];         // Files created during execution
  files_modified: string[];        // Files modified during execution
  ralph_completed_at?: string;     // Timestamp when ralph completed
}
```

**AutopilotQA**

```typescript
export interface AutopilotQA {
  ultraqa_cycles: number;          // Number of test-fix cycles
  build_status: QAStatus;          // Build status (pending/passing/failing)
  lint_status: QAStatus;           // Lint status
  test_status: QAStatus | 'skipped';  // Test status
  qa_completed_at?: string;        // Timestamp when QA completed
}
```

**AutopilotValidation**

```typescript
export interface AutopilotValidation {
  architects_spawned: number;      // Number of validation architects spawned
  verdicts: ValidationResult[];    // List of validation verdicts
  all_approved: boolean;           // Whether all validations approved
  validation_rounds: number;       // Number of validation rounds performed
}
```

##### Validation Types

```typescript
export type ValidationVerdictType = 'functional' | 'security' | 'quality';

export type ValidationVerdict = 'APPROVED' | 'REJECTED' | 'NEEDS_FIX';

export interface ValidationResult {
  type: ValidationVerdictType;
  verdict: ValidationVerdict;
  issues?: string[];
}
```

---

#### State Management

##### `initAutopilot(directory: string, idea: string, sessionId?: string, config?: Partial<AutopilotConfig>): AutopilotState`

Initialize a new autopilot session.

**Parameters:**
- `directory`: Project directory
- `idea`: Original user idea/request
- `sessionId`: Optional session ID for binding
- `config`: Optional configuration overrides

**Returns:** Initialized autopilot state

**Example:**
```typescript
import { initAutopilot } from '@/hooks/autopilot';

const state = initAutopilot(
  process.cwd(),
  'Create a REST API for user management',
  'ses_abc123',
  { maxQaCycles: 3, parallelExecutors: 3 }
);
```

---

##### `readAutopilotState(directory: string): AutopilotState | null`

Read current autopilot state from disk.

**Returns:** Current state or `null` if no session exists

**Example:**
```typescript
import { readAutopilotState } from '@/hooks/autopilot';

const state = readAutopilotState(process.cwd());
if (state) {
  console.log(`Current phase: ${state.phase}`);
  console.log(`Files created: ${state.execution.files_created.length}`);
}
```

---

##### `writeAutopilotState(directory: string, state: AutopilotState): boolean`

Write autopilot state to disk.

**Returns:** `true` if successful

---

##### `clearAutopilotState(directory: string): boolean`

Clear autopilot state file.

**Returns:** `true` if successful

---

##### `isAutopilotActive(directory: string): boolean`

Check if autopilot is currently active.

**Example:**
```typescript
import { isAutopilotActive } from '@/hooks/autopilot';

if (isAutopilotActive(process.cwd())) {
  console.log('Autopilot is running');
}
```

---

##### `transitionPhase(directory: string, newPhase: AutopilotPhase): AutopilotState | null`

Transition to a new phase and record duration metrics.

**Returns:** Updated state or `null` on error

**Example:**
```typescript
import { transitionPhase } from '@/hooks/autopilot';

const newState = transitionPhase(process.cwd(), 'execution');
```

---

##### `updateExpansion(directory: string, updates: Partial<AutopilotExpansion>): boolean`

Update expansion phase data.

**Example:**
```typescript
import { updateExpansion } from '@/hooks/autopilot';

updateExpansion(process.cwd(), {
  analyst_complete: true,
  requirements_summary: 'User auth, CRUD operations, rate limiting'
});
```

---

##### `updatePlanning(directory: string, updates: Partial<AutopilotPlanning>): boolean`

Update planning phase data.

---

##### `updateExecution(directory: string, updates: Partial<AutopilotExecution>): boolean`

Update execution phase data.

**Example:**
```typescript
import { updateExecution } from '@/hooks/autopilot';

updateExecution(process.cwd(), {
  tasks_completed: 5,
  files_created: ['src/auth.ts', 'src/routes.ts']
});
```

---

##### `updateQA(directory: string, updates: Partial<AutopilotQA>): boolean`

Update QA phase data.

---

##### `updateValidation(directory: string, updates: Partial<AutopilotValidation>): boolean`

Update validation phase data.

---

##### `incrementAgentCount(directory: string, count?: number): boolean`

Increment the total agent spawn counter.

---

##### `getSpecPath(directory: string): string`

Get the path where spec will be saved.

**Returns:** `.omc/autopilot/spec.md`

---

##### `getPlanPath(directory: string): string`

Get the path where plan will be saved.

**Returns:** `.omc/plans/autopilot-impl.md`

---

#### Phase Transitions

##### `transitionRalphToUltraQA(directory: string, sessionId: string): TransitionResult`

Transition from Ralph execution to UltraQA with proper mutual exclusion.

This function handles the critical transition by:
1. Preserving Ralph progress
2. Cleanly terminating Ralph (and linked Ultrawork)
3. Starting UltraQA mode
4. Rolling back on failure

**Parameters:**
- `directory`: Project directory
- `sessionId`: Session ID for UltraQA binding

**Returns:** Transition result with success status

**Example:**
```typescript
import { transitionRalphToUltraQA } from '@/hooks/autopilot';

const result = transitionRalphToUltraQA(process.cwd(), 'ses_abc123');
if (result.success) {
  console.log('Successfully transitioned to QA phase');
} else {
  console.error(result.error);
}
```

---

##### `transitionUltraQAToValidation(directory: string): TransitionResult`

Transition from UltraQA to validation phase.

---

##### `transitionToComplete(directory: string): TransitionResult`

Transition to complete state.

---

##### `transitionToFailed(directory: string, error: string): TransitionResult`

Transition to failed state with error message.

---

##### `getTransitionPrompt(fromPhase: string, toPhase: string): string`

Get a prompt explaining the phase transition for Claude to execute.

**Example:**
```typescript
import { getTransitionPrompt } from '@/hooks/autopilot';

const prompt = getTransitionPrompt('execution', 'qa');
// Returns detailed instructions for Ralph → UltraQA transition
```

---

#### Prompt Generation

##### `getExpansionPrompt(idea: string): string`

Generate prompt for expansion phase (Analyst + Architect).

**Example:**
```typescript
import { getExpansionPrompt } from '@/hooks/autopilot';

const prompt = getExpansionPrompt('Build a blog platform with CMS');
// Returns prompt with Task invocations for Analyst and Architect
```

---

##### `getDirectPlanningPrompt(specPath: string): string`

Generate prompt for planning phase (Architect + Critic).

---

##### `getExecutionPrompt(planPath: string): string`

Generate prompt for execution phase (Ralph + Ultrawork).

---

##### `getQAPrompt(): string`

Generate prompt for QA phase (UltraQA cycles).

---

##### `getValidationPrompt(specPath: string): string`

Generate prompt for validation phase (parallel architect review).

---

##### `getPhasePrompt(phase: string, context: object): string`

Get the appropriate prompt for a given phase with context.

**Parameters:**
- `phase`: Phase name ('expansion', 'planning', etc.)
- `context`: Context object with `idea`, `specPath`, `planPath`

**Example:**
```typescript
import { getPhasePrompt } from '@/hooks/autopilot';

const prompt = getPhasePrompt('expansion', {
  idea: 'E-commerce checkout flow'
});
```

---

#### Validation Coordination

##### `recordValidationVerdict(directory: string, type: ValidationVerdictType, verdict: ValidationVerdict, issues?: string[]): boolean`

Record a validation verdict from an architect.

**Parameters:**
- `type`: Validation type ('functional', 'security', 'quality')
- `verdict`: Verdict ('APPROVED', 'REJECTED', 'NEEDS_FIX')
- `issues`: Optional list of issues found

**Example:**
```typescript
import { recordValidationVerdict } from '@/hooks/autopilot';

recordValidationVerdict(
  process.cwd(),
  'security',
  'REJECTED',
  ['SQL injection risk in user input', 'Missing rate limiting']
);
```

---

##### `getValidationStatus(directory: string): ValidationCoordinatorResult | null`

Get current validation status and aggregated verdicts.

**Returns:**
```typescript
interface ValidationCoordinatorResult {
  success: boolean;        // All verdicts collected
  allApproved: boolean;    // All architects approved
  verdicts: ValidationResult[];
  round: number;
  issues: string[];        // Aggregated issues
}
```

**Example:**
```typescript
import { getValidationStatus } from '@/hooks/autopilot';

const status = getValidationStatus(process.cwd());
if (status?.allApproved) {
  console.log('All validations passed!');
} else {
  console.log('Issues to fix:', status?.issues);
}
```

---

##### `startValidationRound(directory: string): boolean`

Start a new validation round (clears previous verdicts).

---

##### `shouldRetryValidation(directory: string, maxRounds?: number): boolean`

Check if validation should retry based on rejections and max rounds.

---

##### `getIssuesToFix(directory: string): string[]`

Get all issues from rejected validations.

**Example:**
```typescript
import { getIssuesToFix } from '@/hooks/autopilot';

const issues = getIssuesToFix(process.cwd());
for (const issue of issues) {
  console.log(issue);
  // [SECURITY] Missing input validation
  // [QUALITY] Test coverage below 80%
}
```

---

##### `getValidationSpawnPrompt(specPath: string): string`

Generate prompt for spawning parallel validation architects.

---

##### `formatValidationResults(state: AutopilotState): string`

Format validation results for display.

**Example:**
```typescript
import { readAutopilotState, formatValidationResults } from '@/hooks/autopilot';

const state = readAutopilotState(process.cwd());
if (state) {
  console.log(formatValidationResults(state));
  // ## Validation Results
  // Round: 1
  // ✓ **FUNCTIONAL**: APPROVED
  // ✗ **SECURITY**: REJECTED
  //   - SQL injection risk
  // ✓ **QUALITY**: APPROVED
}
```

---

#### Summary Generation

##### `generateSummary(directory: string): AutopilotSummary | null`

Generate summary of autopilot run.

**Returns:**
```typescript
interface AutopilotSummary {
  originalIdea: string;
  filesCreated: string[];
  filesModified: string[];
  testsStatus: string;
  duration: number;           // Milliseconds
  agentsSpawned: number;
  phasesCompleted: AutopilotPhase[];
}
```

**Example:**
```typescript
import { generateSummary } from '@/hooks/autopilot';

const summary = generateSummary(process.cwd());
if (summary) {
  console.log(`Completed in ${summary.duration}ms`);
  console.log(`Created ${summary.filesCreated.length} files`);
  console.log(`Used ${summary.agentsSpawned} agents`);
}
```

---

##### `formatSummary(summary: AutopilotSummary): string`

Format summary as decorated box for terminal display.

**Example:**
```typescript
import { generateSummary, formatSummary } from '@/hooks/autopilot';

const summary = generateSummary(process.cwd());
if (summary) {
  console.log(formatSummary(summary));
  // ╭──────────────────────────────────────────────────────╮
  // │                  AUTOPILOT COMPLETE                   │
  // ├──────────────────────────────────────────────────────┤
  // │  Original Idea: REST API for user management         │
  // ...
}
```

---

##### `formatCompactSummary(state: AutopilotState): string`

Format compact summary for HUD statusline.

**Returns:** `[AUTOPILOT] Phase 3/5: EXECUTION | 12 files`

---

##### `formatFailureSummary(state: AutopilotState, error?: string): string`

Format failure summary with error details.

---

##### `formatFileList(files: string[], title: string, maxFiles?: number): string`

Format file list for detailed summary.

---

#### Cancellation

##### `cancelAutopilot(directory: string): CancelResult`

Cancel autopilot and preserve progress for resume.

**Returns:**
```typescript
interface CancelResult {
  success: boolean;
  message: string;
  preservedState?: AutopilotState;
}
```

**Example:**
```typescript
import { cancelAutopilot } from '@/hooks/autopilot';

const result = cancelAutopilot(process.cwd());
console.log(result.message);
// Autopilot cancelled at phase: execution. Progress preserved for resume.
```

---

##### `clearAutopilot(directory: string): CancelResult`

Fully clear autopilot state (no preserve).

---

##### `canResumeAutopilot(directory: string): { canResume: boolean; state?: AutopilotState; resumePhase?: string }`

Check if autopilot can be resumed.

**Example:**
```typescript
import { canResumeAutopilot } from '@/hooks/autopilot';

const { canResume, resumePhase } = canResumeAutopilot(process.cwd());
if (canResume) {
  console.log(`Can resume from phase: ${resumePhase}`);
}
```

---

##### `resumeAutopilot(directory: string): { success: boolean; message: string; state?: AutopilotState }`

Resume a paused autopilot session.

**Example:**
```typescript
import { resumeAutopilot } from '@/hooks/autopilot';

const result = resumeAutopilot(process.cwd());
if (result.success) {
  console.log(result.message);  // Resuming autopilot at phase: execution
}
```

---

##### `formatCancelMessage(result: CancelResult): string`

Format cancel result for display.

---

### Usage Examples

#### Example 1: Starting an autopilot session

```typescript
import {
  initAutopilot,
  getPhasePrompt,
  readAutopilotState
} from '@/hooks/autopilot';

// Initialize session
const idea = 'Create a REST API for todo management with authentication';
const state = initAutopilot(process.cwd(), idea, 'ses_abc123');

// Get the expansion phase prompt
const prompt = getPhasePrompt('expansion', { idea });
console.log(prompt);
// Prompt includes Task invocations for Analyst and Architect

// Monitor progress
const currentState = readAutopilotState(process.cwd());
console.log(`Phase: ${currentState?.phase}`);
console.log(`Agents spawned: ${currentState?.total_agents_spawned}`);
```

#### Example 2: Monitoring execution phase

```typescript
import {
  readAutopilotState,
  updateExecution
} from '@/hooks/autopilot';

// Check execution progress
const state = readAutopilotState(process.cwd());
if (state?.phase === 'execution') {
  console.log(`Tasks: ${state.execution.tasks_completed}/${state.execution.tasks_total}`);
  console.log(`Ralph iterations: ${state.execution.ralph_iterations}`);
  console.log(`Files created: ${state.execution.files_created.length}`);
}

// Update execution progress
updateExecution(process.cwd(), {
  tasks_completed: 8,
  tasks_total: 12,
  files_created: ['src/routes/todo.ts', 'src/models/todo.ts']
});
```

#### Example 3: Handling phase transitions

```typescript
import {
  readAutopilotState,
  transitionRalphToUltraQA,
  getTransitionPrompt
} from '@/hooks/autopilot';

const state = readAutopilotState(process.cwd());

if (state?.phase === 'execution' && state.execution.ralph_completed_at) {
  // Transition from execution to QA
  const result = transitionRalphToUltraQA(process.cwd(), 'ses_abc123');

  if (result.success) {
    // Get prompt for Claude to execute QA phase
    const prompt = getTransitionPrompt('execution', 'qa');
    console.log(prompt);
  } else {
    console.error(`Transition failed: ${result.error}`);
  }
}
```

#### Example 4: Validation coordination

```typescript
import {
  getValidationStatus,
  shouldRetryValidation,
  getIssuesToFix,
  recordValidationVerdict
} from '@/hooks/autopilot';

// Record verdicts from architects
recordValidationVerdict(process.cwd(), 'functional', 'APPROVED');
recordValidationVerdict(process.cwd(), 'security', 'REJECTED', [
  'Missing input sanitization',
  'No rate limiting'
]);
recordValidationVerdict(process.cwd(), 'quality', 'APPROVED');

// Check status
const status = getValidationStatus(process.cwd());
if (status?.allApproved) {
  console.log('All validations passed! Ready to complete.');
} else {
  console.log('Validation failed. Issues to fix:');
  for (const issue of getIssuesToFix(process.cwd())) {
    console.log(`  - ${issue}`);
  }

  if (shouldRetryValidation(process.cwd())) {
    console.log('Retrying validation after fixes...');
  } else {
    console.log('Max validation rounds reached');
  }
}
```

#### Example 5: Cancellation and resumption

```typescript
import {
  cancelAutopilot,
  canResumeAutopilot,
  resumeAutopilot,
  formatCancelMessage
} from '@/hooks/autopilot';

// Cancel autopilot
const cancelResult = cancelAutopilot(process.cwd());
console.log(formatCancelMessage(cancelResult));
// [AUTOPILOT CANCELLED]
// Autopilot cancelled at phase: execution. Progress preserved for resume.
// ...

// Check if can resume
const { canResume, resumePhase } = canResumeAutopilot(process.cwd());
if (canResume) {
  console.log(`Session can be resumed from ${resumePhase}`);

  // Resume session
  const resumeResult = resumeAutopilot(process.cwd());
  if (resumeResult.success) {
    console.log(resumeResult.message);
  }
}
```

#### Example 6: Complete workflow integration

```typescript
import {
  initAutopilot,
  readAutopilotState,
  transitionPhase,
  generateSummary,
  formatSummary
} from '@/hooks/autopilot';

async function runAutopilot(idea: string, sessionId: string) {
  // Initialize
  const state = initAutopilot(process.cwd(), idea, sessionId);
  console.log(`Autopilot started in phase: ${state.phase}`);

  // Monitor progress through phases
  const checkProgress = setInterval(() => {
    const current = readAutopilotState(process.cwd());
    if (!current?.active) {
      clearInterval(checkProgress);

      // Generate final summary
      const summary = generateSummary(process.cwd());
      if (summary) {
        console.log(formatSummary(summary));
      }
    } else {
      console.log(`Current phase: ${current.phase}`);
    }
  }, 5000);
}
```

---

### Workflow Details

#### Phase 0: Expansion

1. Spawn Analyst agent to extract requirements
2. Spawn Architect agent for technical specification
3. Combine into unified spec document
4. Save to `.omc/autopilot/spec.md`
5. Signal: `EXPANSION_COMPLETE`

#### Phase 1: Planning

1. Architect reads spec and creates implementation plan
2. Critic reviews plan for completeness
3. Iterate until Critic approves (max 5 iterations)
4. Save to `.omc/plans/autopilot-impl.md`
5. Signal: `PLANNING_COMPLETE`

#### Phase 2: Execution

1. Activate Ralph + Ultrawork modes
2. Read plan and identify parallel tasks
3. Spawn executor agents (low/medium/high based on complexity)
4. Track progress in TODO list
5. Signal: `EXECUTION_COMPLETE` when all tasks done

#### Phase 3: QA

1. **Critical**: Transition from Ralph to UltraQA (mutual exclusion)
2. Run build → lint → test
3. For each failure: diagnose → fix → re-run
4. Repeat until pass or max cycles (5)
5. Signal: `QA_COMPLETE`

#### Phase 4: Validation

1. Spawn 3 parallel architects:
   - Functional: Verify requirements implemented
   - Security: Check for vulnerabilities
   - Quality: Review code quality and tests
2. Aggregate verdicts
3. If any REJECTED: fix issues and retry (max 3 rounds)
4. Signal: `AUTOPILOT_COMPLETE` when all approved

---

### State Persistence

All state is persisted to `.omc/autopilot-state.json`:

```json
{
  "active": true,
  "phase": "execution",
  "iteration": 3,
  "max_iterations": 10,
  "originalIdea": "Create REST API...",
  "expansion": {
    "analyst_complete": true,
    "architect_complete": true,
    "spec_path": ".omc/autopilot/spec.md",
    "requirements_summary": "...",
    "tech_stack": ["Node.js", "Express", "TypeScript"]
  },
  "planning": {
    "plan_path": ".omc/plans/autopilot-impl.md",
    "architect_iterations": 2,
    "approved": true
  },
  "execution": {
    "ralph_iterations": 5,
    "ultrawork_active": true,
    "tasks_completed": 8,
    "tasks_total": 12,
    "files_created": ["src/routes.ts", "src/auth.ts"],
    "files_modified": ["package.json"]
  },
  "started_at": "2026-01-21T10:30:00.000Z",
  "total_agents_spawned": 15,
  "session_id": "ses_abc123"
}
```

---

## Integration Examples

### Example 1: Complete agent workflow with wisdom and diagnostics

```typescript
import { initPlanNotepad, addLearning, addDecision } from '@/features/notepad-wisdom';
import { runDirectoryDiagnostics } from '@/tools/diagnostics';
import { getCategoryForTask } from '@/features/delegation-categories';

async function executeTaskWithContext(planName: string, taskPrompt: string) {
  // Initialize notepad
  initPlanNotepad(planName);

  // Determine delegation category
  const category = getCategoryForTask({ taskPrompt });
  console.log(`Using category: ${category.category} (${category.tier})`);

  // Record decision
  addDecision(planName, `Using ${category.category} category for task delegation`);

  // Execute task (delegate to appropriate agent)
  // ... task execution ...

  // Record learnings
  addLearning(planName, 'Successfully implemented feature with proper error handling');

  // Verify with diagnostics
  const diagnostics = await runDirectoryDiagnostics(process.cwd());

  if (!diagnostics.success) {
    console.error('Diagnostics failed:', diagnostics.summary);
    return false;
  }

  console.log('Task completed successfully with clean diagnostics');
  return true;
}
```

### Example 2: Dynamic orchestrator with auto-generated prompt

```typescript
import { getAgentDefinitions } from '@/agents/definitions';
import { generateOrchestratorPrompt, convertDefinitionsToConfigs } from '@/agents/prompt-generator';
import { getCategoryForTask } from '@/features/delegation-categories';

async function createSmartOrchestrator(userRequest: string) {
  // Generate orchestrator prompt
  const definitions = getAgentDefinitions();
  const agents = convertDefinitionsToConfigs(definitions);
  const orchestratorPrompt = generateOrchestratorPrompt(agents);

  // Detect task category
  const category = getCategoryForTask({ taskPrompt: userRequest });

  // Build enhanced request
  const enhancedRequest = `
${orchestratorPrompt}

## USER REQUEST
${userRequest}

## DELEGATION GUIDANCE
Detected category: ${category.category}
Recommended tier: ${category.tier}
Temperature: ${category.temperature}
  `.trim();

  return enhancedRequest;
}
```

---

## See Also

- [CHANGELOG.md](../CHANGELOG.md) - Version history and feature additions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [MIGRATION.md](./MIGRATION.md) - Migration guide from oh-my-opencode
- [Agent Definitions](../src/agents/definitions.ts) - Complete agent configuration
