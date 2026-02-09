---
description: N coordinated agents on shared task list using Claude Code native teams
aliases: [team-agents, team-mode]
---

# Team Command

[TEAM MODE ACTIVATED]

Spawn N coordinated agents working on a shared task list using Claude Code's native TeamCreate, SendMessage, and TaskCreate tools. Like a dev team with real-time communication—fast, reliable, and with built-in coordination.

## User's Request

{{ARGUMENTS}}

## Usage Patterns

### Standard Mode (1-5 agents)
```
/oh-my-claudecode:team N:agent-type "task description"
```

### Parameters

- **N** - Number of agents (1-5, Claude Code background task limit)
- **agent-type** - Agent to spawn (e.g., executor, build-fixer, architect)
- **task** - High-level task to decompose and distribute

### Examples

```bash
/oh-my-claudecode:team 5:executor "fix all TypeScript errors"
/oh-my-claudecode:team 3:build-fixer "fix build errors in src/"
/oh-my-claudecode:team 4:designer "implement responsive layouts for all components"
/oh-my-claudecode:team 2:architect "analyze and document all API endpoints"
```

## Architecture

```
User: "/team 5:executor fix all TypeScript errors"
              |
              v
      [TEAM ORCHESTRATOR]
              |
     TeamCreate("fix-ts-errors")
              |
    TaskCreate × N (one per subtask)
              |
   Task(team_name) × 5
              |
   +--+--+--+--+--+
   |  |  |  |  |
   v  v  v  v  v
  T1 T2 T3 T4 T5   ← teammates
   |  |  |  |  |
   TaskList → claim → work → complete
   |  |  |  |  |
   SendMessage → team lead
```

**Key Features:**
- Native Claude Code team tools (TeamCreate/SendMessage/TaskCreate)
- Real-time inter-agent messaging (DMs and broadcasts)
- Built-in task dependencies (blocks/blockedBy)
- Graceful shutdown protocol
- Zero external dependencies (no SQLite needed)

## ENFORCEMENT (CRITICAL - HARD RULES)

### Mandatory Tool Sequence

**EVERY TEAM MODE SESSION MUST FOLLOW THIS EXACT SEQUENCE:**

1. **TeamCreate()** - MUST be called FIRST before any Task agents
2. **TaskCreate() × N** - Create all subtasks on the shared task list
3. **Task(team_name=..., name=...) × N** - Spawn teammates WITH both team_name and name parameters
4. **Monitor** - Track progress via TaskList + receive automatic SendMessage from teammates
5. **SendMessage(type="shutdown_request") × N** - Graceful shutdown each teammate
6. **TeamDelete()** - Clean up team resources

**SKIPPING ANY STEP = NOT TEAM MODE.**

### ANTI-PATTERNS (NEVER DO THIS)

❌ **Launching Task agents without calling TeamCreate first**
   - If you skip TeamCreate, you're doing ultrawork, NOT team mode

❌ **Using run_in_background without team_name parameter**
   - That's parallel ultrawork, not team coordination

❌ **Skipping TaskCreate and having agents self-organize**
   - Defeats the purpose of shared task list coordination

❌ **Skipping shutdown_request / TeamDelete cleanup**
   - Leaves zombie team state and orphaned task lists

❌ **Using Task tool without the `name` parameter**
   - Teammates need names for messaging - name identifies them in SendMessage

❌ **Spawning agents then claiming "team mode complete" without cleanup**
   - You MUST call SendMessage(shutdown_request) and TeamDelete

### Mode Distinction

```
┌─────────────────────────────────────────────────────────────┐
│ TEAM MODE = TeamCreate + TaskCreate + Task(team_name, name) │
│           + SendMessage + TeamDelete                         │
│                                                              │
│ ULTRAWORK = Task(run_in_background) without team infra      │
│                                                              │
│ If you skip TeamCreate, you are doing ULTRAWORK, NOT TEAM.  │
└─────────────────────────────────────────────────────────────┘
```

### Tool Call Requirements

**Task tool for teammates MUST include:**
- `team_name` - Links agent to team's shared task list
- `name` - Identifies agent for messaging (e.g., "agent-1", "executor-2", "fixer-a")

**Example:**
```typescript
Task(
  subagent_type="oh-my-claudecode:executor",
  team_name="fix-issues",
  name="agent-1",
  prompt="Fix TypeScript errors in src/commands/"
)
```

## Verification Gate

**Before claiming team mode is complete, verify ALL of:**

1. ✅ TeamCreate was called (team config exists at `~/.claude/teams/{team-name}/config.json`)
2. ✅ All TaskCreate tasks show `status=completed` in TaskList
3. ✅ All teammates received `shutdown_request` via SendMessage
4. ✅ TeamDelete was called to clean up team resources

**If ANY verification fails → CONTINUE WORKING until all pass.**

## Workflow Phases

Team workflow follows a structured three-phase approach: **team-plan → team-exec → team-verify**.

### Phase 1: team-plan (Hiring Plan)

Create a hiring plan before spawning teammates:

1. **Parse Input**: Extract N (agent count, validate <= 5), agent-type, task description
2. **Analyze & Decompose**: Explore codebase, break into N independent subtasks, identify file ownership
3. **Define Roles**: Determine which agent types are needed (executor, verifier, designer, etc.)
4. **Plan Dependencies**: Identify task ordering (which tasks block others)

Output: Task definitions with pre-assigned owners and dependency chains.

### Phase 2: team-exec (Execution)

Execute the hiring plan:

1. **TeamCreate** with descriptive name
2. **TaskCreate** for each subtask (with `addBlockedBy` dependencies if needed)
3. **TaskUpdate** to pre-assign owners (avoids race conditions)
4. **Spawn Teammates**: Launch N agents via Task tool with BOTH `team_name` AND `name` parameters

**Example:**
```typescript
Task(
  subagent_type="oh-my-claudecode:executor",
  team_name="fix-issues",
  name="agent-1",
  prompt="Fix TypeScript errors in src/commands/"
)
```

Each teammate follows: TaskList → claim → work → complete → SendMessage to lead

### Phase 3: team-verify (Verification)

Spawn a verifier team to validate all work:

```typescript
// After all execution tasks complete
Task(
  subagent_type="oh-my-claudecode:verifier",
  team_name="fix-issues",
  name="verifier-1",
  prompt="Verify all TypeScript fixes pass tsc --noEmit and tests pass"
)
```

Verification teammates use the same TaskList/claim protocol as execution teammates.

### 4. Monitor & Coordinate
- Track progress via TaskList
- Receive automatic messages from teammates
- Send guidance/coordination messages as needed
- Handle blocked tasks by checking dependency completion

### 5. Completion & Cleanup
- Verify all tasks completed via TaskList
- **SendMessage(shutdown_request)** to each teammate
- **TeamDelete** to clean up team resources
- Remove `.omc/state/team-state.json`

## Wrapper Modes

**Ultrawork (ulw)** and **Ralph** act as persistence/throughput wrappers around the team workflow:

- **Ultrawork**: Adds parallel execution with `run_in_background` spawning (up to 5 concurrent)
- **Ralph**: Adds self-referential persistence with verifier gate before completion

Both use the same underlying team protocol (TeamCreate → TaskCreate → Task → SendMessage → TeamDelete).

## Migration from Legacy Modes

| Legacy Mode | Team Equivalent | Migration |
|-------------|-----------------|-----------|
| `/autopilot` | `/team` with 3-phase workflow | Use team-plan → team-exec → team-verify |
| `/ultrapilot` | `/team` with parallel spawning | Use `run_in_background` on Task calls |
| `/swarm` | `/team` with native coordination | Use TaskCreate dependencies + SendMessage |

**Why migrate?** Team mode uses Claude Code's native infrastructure, requires no SQLite dependency, supports inter-agent messaging, and has built-in task dependency management.

## Cancellation

Use unified cancel command:
```
/oh-my-claudecode:cancel
```

## Output

Report when complete:
- Total tasks completed
- Tasks per agent
- Total time elapsed
- Summary of changes made
