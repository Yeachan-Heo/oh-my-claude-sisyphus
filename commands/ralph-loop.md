---
name: ralph-loop
description: Start self-referential development loop until completion
argument-hint: [--max-iterations=N] [--completion-promise=TEXT] <task>
---

# /ralph-loop Command

Start a self-referential development loop that continues until the task is fully complete. The loop automatically re-invokes itself until you explicitly output the completion promise.

## Usage

```
/oh-my-claudecode:ralph-loop <task description>
/oh-my-claudecode:ralph-loop --max-iterations=50 <task>
/oh-my-claudecode:ralph-loop --prd <task>
```

## Arguments

- `<task>` - The task to complete (required)
- `--max-iterations=N` - Maximum iterations before stopping (default: 100)
- `--completion-promise=TEXT` - Custom completion signal (default: "DONE")
- `--prd` - Initialize with Product Requirements Document

## How It Works

1. **Parse Arguments**: Extract task, max iterations, and completion promise
2. **Initialize State**: Create ralph state in `.omc/state/ralph-state.json`
3. **Execute Loop**: Work on task until completion
4. **Re-Invoke**: If no completion promise detected, loop continues
5. **Verify**: Architect verifies completion before accepting
6. **Cleanup**: Cancel skill clears state files

## Loop Behavior

The loop continues until ONE of these conditions:

1. **Completion Promise**: You output `<promise>DONE</promise>` (or custom text)
2. **Max Iterations**: Configured limit reached
3. **User Cancel**: User runs `/oh-my-claudecode:cancel`

## Includes Ultrawork

Ralph automatically includes Ultrawork mode for:

- Parallel agent execution
- Background task management
- Smart model routing (haiku/sonnet/opus)

## Examples

**Basic usage:**

```
/oh-my-claudecode:ralph-loop implement user authentication with JWT tokens
```

**With PRD (structured user stories):**

```
/oh-my-claudecode:ralph-loop --prd build a task management CLI
```

**Custom iterations:**

```
/oh-my-claudecode:ralph-loop --max-iterations=25 refactor the payment module
```

## Completion Signal

When your task is FULLY complete AND verified:

```
<promise>DONE</promise>
```

Or run `/oh-my-claudecode:cancel` for clean state cleanup.

## Verification Requirements

Before claiming completion:

1. All TODOs marked complete
2. Tests passing
3. Build succeeding
4. Architect verification passed

## State Files

- `.omc/state/ralph-state.json` - Loop state
- `.omc/state/ultrawork-state.json` - Parallel execution state
- `.omc/prd.json` - PRD (if --prd flag used)
- `.omc/progress.txt` - Progress log (if --prd flag used)

## See Also

- `/oh-my-claudecode:ulw-loop` - Ultrawork-only loop
- `/oh-my-claudecode:cancel` - Cancel active loop
- `/oh-my-claudecode:autopilot` - Full autonomous execution
