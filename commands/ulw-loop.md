---
name: ulw-loop
description: Start ultrawork loop - maximum parallelism until completion
argument-hint: [--max-iterations=N] <task>
---

# /ulw-loop Command

Start an ultrawork loop with maximum parallel execution that continues until the task is complete. Combines the persistence of ralph-loop with the parallelism of ultrawork.

## Usage

```
/oh-my-claudecode:ulw-loop <task description>
/oh-my-claudecode:ulw-loop --max-iterations=50 <task>
```

## Arguments

- `<task>` - The task to complete (required)
- `--max-iterations=N` - Maximum iterations before stopping (default: 100)

## How It Works

ULW-Loop is essentially ralph-loop with ultrawork mode pre-activated:

1. **Initialize**: Activate ultrawork state for maximum parallelism
2. **Parallel Execution**: Fire multiple agents concurrently
3. **Background Tasks**: Use background agents for long operations
4. **Smart Routing**: Route to optimal model tier (haiku/sonnet/opus)
5. **Persistence**: Loop continues until completion

## Ultrawork Rules (Enforced)

### Parallel Execution

- **PARALLEL**: Fire independent calls simultaneously - NEVER wait sequentially
- **BACKGROUND FIRST**: Use `Task(run_in_background=true)` for exploration (10+ concurrent)
- **DELEGATE**: Route to specialist agents immediately

### Smart Model Routing

| Complexity | Model  | Use For                                |
| ---------- | ------ | -------------------------------------- |
| Simple     | haiku  | Quick lookups, trivial fixes           |
| Standard   | sonnet | Feature implementation, moderate work  |
| Complex    | opus   | Architecture, debugging, complex logic |

### Agent Selection

```
Task(subagent_type="oh-my-claudecode:architect-low", model="haiku", prompt="...")
Task(subagent_type="oh-my-claudecode:executor", model="sonnet", prompt="...")
Task(subagent_type="oh-my-claudecode:architect", model="opus", prompt="...")
```

## Examples

**Basic usage:**

```
/oh-my-claudecode:ulw-loop fix all TypeScript errors in src/
```

**Parallel refactoring:**

```
/oh-my-claudecode:ulw-loop convert all callbacks to async/await
```

**Multi-file implementation:**

```
/oh-my-claudecode:ulw-loop implement REST API endpoints for user management
```

## Completion

When task is complete, output:

```
<promise>DONE</promise>
```

Or run `/oh-my-claudecode:cancel` to exit cleanly.

## Background Execution Guidelines

**Run in Background** (`run_in_background: true`):

- Package installation
- Build processes
- Test suites
- Docker operations
- Long exploration queries

**Run Foreground**:

- Quick status checks
- File edits
- Simple commands

## State Files

- `.omc/state/ultrawork-state.json` - Ultrawork state
- `.omc/state/ralph-state.json` - Loop persistence state

## Differences from ralph-loop

| Feature     | ralph-loop       | ulw-loop       |
| ----------- | ---------------- | -------------- |
| Parallelism | Included         | Maximized      |
| PRD Support | --prd flag       | No             |
| Focus       | Persistence      | Speed          |
| Best For    | Complex projects | Parallel tasks |

## See Also

- `/oh-my-claudecode:ralph-loop` - With PRD support
- `/oh-my-claudecode:ultrawork` - One-shot ultrawork
- `/oh-my-claudecode:cancel` - Cancel active loop
