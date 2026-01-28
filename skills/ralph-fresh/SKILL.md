---
name: ralph-fresh
description: Fresh-context self-referential loop - spawns new subagent each iteration for unlimited context
---

# Ralph Fresh Skill

[RALPH-FRESH - ITERATION {{ITERATION}}/{{MAX}}]

Ralph-Fresh is a fresh-context variant of ralph that spawns a new subagent each iteration with complete context handoff. This eliminates memory compaction and token limits, enabling unlimited-length task execution.

## Key Differences from Standard Ralph

| Feature | Standard Ralph | Ralph-Fresh |
|---------|----------------|-------------|
| Context | Same-context accumulation | Fresh context each iteration |
| Memory | Conversation persists, compacts | No conversation memory |
| Handoff | Minimal state passing | Complete state snapshot |
| Token Limits | Eventually hits limits | No limit (fresh each time) |
| Best For | Short to medium tasks | Long-running complex tasks |

## How It Works

1. **Orchestrator** spawns fresh subagent with complete handoff object
2. **Subagent** works on task, updates handoff state
3. **Subagent** terminates, passes updated handoff back
4. **Orchestrator** spawns NEW fresh subagent with updated handoff
5. Repeat until task complete or max iterations

## PRD MODE (OPTIONAL)

When you provide the `--prd` flag, ralph-fresh initializes a PRD (Product Requirements Document) workflow BEFORE starting the loop.

### Detecting PRD Mode

Check if the prompt contains: `--prd` or `--PRD`

### PRD Initialization Workflow

When `--prd` flag detected:

1. **Create PRD File Structure** (`.omc/prd.json` and `.omc/progress.txt`)
2. **Parse the task** (everything after `--prd` flag)
3. **Break down into user stories** with this structure:

```json
{
  "project": "[Project Name]",
  "branchName": "ralph-fresh/[feature-name]",
  "description": "[Feature description]",
  "userStories": [
    {
      "id": "US-001",
      "title": "[Short title]",
      "description": "As a [user], I want to [action] so that [benefit].",
      "acceptanceCriteria": ["Criterion 1", "Typecheck passes"],
      "priority": 1,
      "passes": false
    }
  ]
}
```

4. **Create progress.txt**:

```
# Ralph-Fresh Progress Log
Started: [ISO timestamp]

## Codebase Patterns
(No patterns discovered yet)

---
```

5. **Guidelines for PRD creation**:
   - Right-sized stories: Each completable in one focused session
   - Verifiable criteria: Include "Typecheck passes", "Tests pass"
   - Independent stories: Minimize dependencies
   - Priority order: Foundational work (DB, types) before UI

6. **After PRD created**: Proceed to normal ralph-fresh loop execution using the user stories as your task list

### Example Usage

```
omc ralph-fresh --prd "build a todo app with React and TypeScript"
```

Workflow:
1. Detect `--prd` flag
2. Extract task: "build a todo app with React and TypeScript"
3. Create `.omc/prd.json` with user stories
4. Create `.omc/progress.txt`
5. Begin ralph-fresh loop using user stories as task breakdown

## Handoff Object Structure

Each iteration receives a complete handoff object containing:

```typescript
{
  // Metadata
  version: '1.0',
  created_at: string,
  iteration: number,
  max_iterations: number,

  // Original task
  original_prompt: string,
  completion_promise: string,

  // Completion state
  completed: boolean,
  completion_message?: string,

  // PRD state (if PRD mode)
  prd?: {
    project: string,
    branchName: string,
    description: string,
    storiesTotal: number,
    storiesCompleted: number,
    nextStoryId: string | null,
    incompleteIds: string[]
  },

  // Progress tracking
  progress: {
    patterns: string[],
    recentLearnings: string[],
    lastCompletedStory?: string
  },

  // Git state
  git: {
    recentCommits: Array<{hash: string, message: string}>,
    branch: string,
    hasUncommittedChanges: boolean
  },

  // Stuck detection
  stuckDetection: {
    lastPrdStatus: string[],
    iterationsOnSameStory: number,
    lastActionAttempted?: string
  },

  // Error tracking
  lastError?: {
    iteration: number,
    message: string,
    recoveryAttempt?: string
  }
}
```

## Completion Requirements

Before signaling completion, you MUST:

1. Verify ALL requirements from the original task are met
2. Ensure no partial implementations
3. Check that code compiles/runs without errors
4. Verify tests pass (if applicable)
5. TODO LIST: Zero pending/in_progress tasks

## Verification Before Completion (Iron Law)

**NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE**

### Steps (MANDATORY)

1. **IDENTIFY**: What command proves the task is complete?
2. **RUN**: Execute verification (test, build, lint)
3. **READ**: Check output - did it actually pass?
4. **ONLY THEN**: Update handoff with completion

### Red Flags (STOP and verify)

- Using "should", "probably", "seems to"
- About to signal completion without fresh evidence
- Expressing satisfaction before verification

### Evidence Chain

1. Fresh test run output showing pass
2. Fresh build output showing success
3. lsp_diagnostics showing 0 errors
4. THEN update handoff with `completed: true`

**Skipping verification = Task NOT complete**

## Stuck Detection

The orchestrator tracks progress and detects when stuck:

- **Threshold**: 3 iterations on same story without progress
- **Action**: Intervention by requesting user guidance or strategic pivot
- **Recovery**: Attempt different approach, simplify scope, or request help

## State Cleanup on Completion

When the task is complete and verified:

```bash
# Delete ralph-fresh state file
rm -f .omc/state/ralph-fresh-state.json
```

This ensures clean state for future sessions.

## Usage Examples

### Basic Usage (CLI)

```bash
# Start ralph-fresh from command line
omc ralph-fresh "implement user authentication with JWT"
```

### PRD Mode (CLI)

```bash
# Initialize with PRD workflow
omc ralph-fresh --prd "build a React dashboard with charts and filters"
```

### Via Skill (in conversation)

User: "I want to build a complete REST API with authentication"

You: "I'm activating **ralph-fresh** for unlimited-context execution. This uses fresh subagents each iteration to avoid token limits."

Then invoke: `/oh-my-claudecode:ralph-fresh`

## When to Use Ralph-Fresh vs Standard Ralph

### Use Ralph-Fresh When:

- Task is very complex with many files
- Expecting many iterations (>10)
- Need to maintain extensive context
- Working with large codebases
- PRD-style story breakdown beneficial

### Use Standard Ralph When:

- Task is short to medium complexity
- Expecting few iterations (<10)
- Minimal context needed
- Quick bug fixes or features

## Zero Tolerance

- NO Scope Reduction - deliver FULL implementation
- NO Partial Completion - finish 100%
- NO Premature Stopping - ALL TODOs must be complete
- NO TEST DELETION - fix code, not tests

## Instructions

You are a fresh subagent for iteration {{ITERATION}} of {{MAX}}.

Your handoff contains:
- Original task
- Current PRD state (if PRD mode)
- Progress and learnings
- Git state
- Stuck detection info

Your job:
1. Review the handoff object completely
2. Continue from where the previous iteration left off
3. Update progress and learnings as you work
4. When complete OR max turns reached:
   - Set `completed: true` and `completion_message` in handoff
   - Output the handoff object for orchestrator
5. If NOT complete:
   - Update handoff with progress
   - Output the handoff object for next iteration

**DO NOT** spawn subagents yourself - you are already a subagent. Work directly on the task.

Original task:
{{PROMPT}}
