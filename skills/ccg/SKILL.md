---
name: ccg
description: Claude-Codex-Gemini tri-model orchestration - fans out backend tasks to Codex and frontend/UI tasks to Gemini in parallel, then Claude synthesizes results
---

# CCG - Claude-Codex-Gemini Tri-Model Orchestration

CCG spawns a tmux team with Codex and Gemini CLI workers running in parallel panes, then Claude synthesizes the results. Use this for tasks that benefit from multiple AI perspectives simultaneously.

## When to Use

- Backend/analysis + frontend/UI work that can run truly in parallel
- Code review from multiple perspectives (architecture + style simultaneously)
- Research tasks where different models have complementary strengths
- Any task you want to split across Codex (analytical) and Gemini (design/creative) workers

## Requirements

- **Codex CLI**: `npm install -g @openai/codex` (or `@openai/codex`)
- **Gemini CLI**: `npm install -g @google/gemini-cli`
- **tmux**: Must be running inside a tmux session
- If either CLI is unavailable, CCG falls back to Claude-only execution

## How It Works

```
1. Claude decomposes the request into:
   - Backend/analytical tasks → Codex worker
   - Frontend/UI/design tasks → Gemini worker

2. startTeam() creates a tmux session with 2 workers:
   omc-team-{name}
   ├── Leader pane (Claude orchestrates)
   ├── Worker pane 1: codex CLI (analytical tasks)
   └── Worker pane 2: gemini CLI (design tasks)

3. Tasks assigned to workers via inbox files + tmux triggers

4. Workers claim tasks, execute, write results to task files

5. Claude reads results and synthesizes into final output

6. Team shut down cleanly
```

## Execution Protocol

When invoked, Claude MUST follow this workflow:

### 1. Check CLI Availability
```typescript
import { isCliAvailable } from './src/team/model-contract.js';
const hasCodex = isCliAvailable('codex');
const hasGemini = isCliAvailable('gemini');
```

If neither is available: fall back to Claude Task agents directly (no tmux team needed).

### 2. Decompose Request
Split the user's request into:
- **Codex tasks**: code analysis, architecture review, backend logic, security review, test strategy
- **Gemini tasks**: UI/UX design, documentation, visual analysis, large-context file review
- **Synthesis task**: Claude combines results (always done by Claude, not delegated)

### 3. Start Team
```typescript
import { startTeam } from './src/team/runtime.js';

const runtime = await startTeam({
  teamName: 'ccg-' + Date.now(),
  workerCount: 2,
  agentTypes: ['codex', 'gemini'],
  tasks: [...codexTasks, ...geminiTasks],
  cwd: process.cwd(),
});
```

### 4. Assign Tasks
```typescript
import { assignTask } from './src/team/runtime.js';

// Assign codex tasks to worker-1, gemini tasks to worker-2
for (const task of codexTasks) {
  await assignTask(runtime.teamName, task.id, 'worker-1',
    runtime.workerPaneIds[0], runtime.sessionName, runtime.cwd);
}
for (const task of geminiTasks) {
  await assignTask(runtime.teamName, task.id, 'worker-2',
    runtime.workerPaneIds[1], runtime.sessionName, runtime.cwd);
}
```

### 5. Monitor Until Complete
```typescript
import { monitorTeam } from './src/team/runtime.js';

let phase = 'executing';
while (phase !== 'completed' && phase !== 'failed') {
  await new Promise(r => setTimeout(r, 5000)); // poll every 5s
  const snapshot = await monitorTeam(runtime.teamName, runtime.cwd, runtime.workerPaneIds);
  phase = snapshot.phase;
}
```

### 6. Read Results & Synthesize
Read task files from `.omc/state/team/{teamName}/tasks/` and synthesize.

### 7. Shutdown
```typescript
import { shutdownTeam } from './src/team/runtime.js';
await shutdownTeam(runtime.teamName, runtime.sessionName, runtime.cwd);
```

## Fallback (CLIs Not Available)

When Codex or Gemini CLI is not installed:

```
[CCG] Codex/Gemini CLI not found. Falling back to Claude-only execution.
```

Use standard Claude Task agents instead:
- `Task(subagent_type="oh-my-claudecode:executor", model="sonnet", ...)` for analytical tasks
- `Task(subagent_type="oh-my-claudecode:designer", model="sonnet", ...)` for design tasks

## Invocation

```
/oh-my-claudecode:ccg [task description]
```

Example:
```
/oh-my-claudecode:ccg Review this PR - check architecture and code quality (Codex) and UI components (Gemini)
```
