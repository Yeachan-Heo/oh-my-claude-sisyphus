---
description: Full autonomous execution from idea to working code
aliases: [ap, autonomous, fullsend]
---

# Autopilot Command

> **Consolidation Note:** `/autopilot` is being consolidated into `/team`. For new multi-agent work, prefer `/oh-my-claudecode:team` with the `team-plan → team-exec → team-verify` workflow. See `/oh-my-claudecode:team` docs for migration guidance.

[AUTOPILOT ACTIVATED - AUTONOMOUS EXECUTION MODE]

You are now in AUTOPILOT mode. This is a full autonomous execution workflow that takes a brief product idea and delivers working, tested, documented code.

## User's Idea

{{ARGUMENTS}}

## Your Mission

Transform this idea into working code through 5 phases:

1. **Expansion** - Turn the idea into detailed spec
2. **Planning** - Create implementation plan
3. **Execution** - Build with parallel agents
4. **QA** - Test until everything passes
5. **Validation** - Multi-architect review

## Phase 0: Expansion

First, expand the user's idea into a detailed specification.

### Step 1: Requirements Analysis

Spawn the Analyst agent:

```
Task(
  subagent_type="oh-my-claudecode:analyst",
  model="opus",
  prompt="REQUIREMENTS ANALYSIS

Analyze this product idea: {{ARGUMENTS}}

Extract:
1. Functional requirements - what it must do
2. Non-functional requirements - performance, UX, security
3. Implicit requirements - things the user needs but didn't say
4. Out of scope - what this is NOT

Output as structured markdown."
)
```

### Step 2: Technical Specification

After Analyst completes, spawn Architect:

```
Task(
  subagent_type="oh-my-claudecode:architect",
  model="opus",
  prompt="TECHNICAL SPECIFICATION

Based on the requirements above, create a technical specification:
1. Tech stack with rationale
2. Architecture overview
3. File structure
4. Dependencies
5. API/interfaces

Output as structured markdown."
)
```

### Step 3: Save Spec

Combine Analyst + Architect output into `.omc/autopilot/spec.md`

Then signal: **EXPANSION_COMPLETE**

## Phase 1: Planning

Create an implementation plan directly from the spec (no interview needed).

Use the Architect to create the plan, then Critic to validate.

Signal when approved: **PLANNING_COMPLETE**

## Phase 2: Execution

Activate Ralph + Ultrawork mode and execute the plan.

### CRITICAL: DELEGATION ENFORCEMENT

**YOU ARE AN ORCHESTRATOR, NOT AN IMPLEMENTER.**

During execution, you MUST follow these rules:

| Action | YOU Do | DELEGATE |
|--------|--------|----------|
| Read files for context | ✓ | |
| Track progress (TODO) | ✓ | |
| Communicate status | ✓ | |
| **ANY code change** | ✗ NEVER | executor-low/executor/executor-high |
| **Multi-file refactor** | ✗ NEVER | executor-high |
| **UI/frontend work** | ✗ NEVER | designer/designer-high |
| **Documentation** | ✗ NEVER | writer |

**Path-Based Exception**: You may ONLY use Edit/Write for:
- `.omc/**` (state files)
- `.claude/**` (config)
- `CLAUDE.md`, `AGENTS.md` (docs)

**All source code changes MUST go through executor agents.**

### Execution Protocol

1. Spawn parallel executors for independent tasks
2. Track progress via TODO list
3. Use appropriate agent tiers:
   - Simple/single-file → `executor-low` (haiku)
   - Standard feature → `executor` (sonnet)
   - Complex/multi-file → `executor-high` (opus)

```
// Example: Delegate implementation
Task(
  subagent_type="oh-my-claudecode:executor",
  model="sonnet",
  prompt="IMPLEMENT: [specific task from plan]

Files: [list target files]
Requirements: [copy from plan]
"
)
```

Signal when done: **EXECUTION_COMPLETE**

## Phase 3: QA

Run UltraQA cycles:
- Build → Lint → Test → Fix → Repeat

Signal when all pass: **QA_COMPLETE**

## Phase 4: Validation

Spawn 3 parallel architects:
1. Functional completeness
2. Security review
3. Code quality

All must APPROVE.

Signal: **AUTOPILOT_COMPLETE**

## Rules

### Delegation Rules (MANDATORY)
- **NEVER** use Edit/Write/Bash for source code changes
- **ALWAYS** delegate implementation to executor agents
- **ONLY** write directly to `.omc/`, `.claude/`, `CLAUDE.md`, `AGENTS.md`
- If you attempt direct code changes, the PreToolUse hook will warn you

### Execution Rules
- Do NOT stop between phases
- Do NOT ask for user input unless truly ambiguous
- Track progress via TODO list
- Use parallel agents aggressively
- Fix issues automatically when possible

## Completion

When all phases complete successfully, run `/oh-my-claudecode:cancel` to cleanly exit autopilot and clean up state files.

Then display the autopilot summary.
