---
name: autopilot
description: Full autonomous execution from idea to working code
user-invocable: true
---

# Autopilot Skill

Full autonomous execution from idea to working code.

## Overview

Autopilot is the ultimate hands-off mode. Give it a brief product idea (2-3 lines) and it handles everything:

1. **Understands** your requirements (Analyst)
2. **Designs** the technical approach (Architect)
3. **Plans** the implementation (Critic-validated)
4. **Builds** with parallel agents (Ralph + Ultrawork)
5. **Tests** until everything passes (UltraQA)
6. **Validates** quality and security (Multi-architect review)

## Usage

```
/autopilot <your idea>
/ap "A CLI tool that tracks daily habits"
/autopilot Add dark mode to the app
```

## Magic Keywords

These phrases auto-activate autopilot:
- "autopilot", "auto pilot", "autonomous"
- "build me", "create me", "make me"
- "full auto", "handle it all"
- "I want a/an..."

## Phases

### Phase 0: Expansion

**Goal:** Turn vague idea into detailed spec

**Agents:**
- Analyst (Opus) - Extract requirements
- Architect (Opus) - Technical specification

**Output:** `.omc/autopilot/spec.md`

### Phase 1: Planning

**Goal:** Create implementation plan from spec

**Agents:**
- Architect (Opus) - Create plan (direct mode, no interview)
- Critic (Opus) - Validate plan

**Output:** `.omc/plans/autopilot-impl.md`

### Phase 2: Execution

**Goal:** Implement the plan

**Mode:** Ralph + Ultrawork (persistence + parallelism)

**Agents:**
- Executor-low (Haiku) - Simple tasks
- Executor (Sonnet) - Standard tasks
- Executor-high (Opus) - Complex tasks

### Phase 3: QA

**Goal:** All tests pass

**Mode:** UltraQA

**Cycle:**
1. Build
2. Lint
3. Test
4. Fix failures
5. Repeat (max 5 cycles)

### Phase 4: Validation

**Goal:** Multi-perspective approval

**Agents (parallel):**
- Architect - Functional completeness
- Security-reviewer - Vulnerability check
- Code-reviewer - Quality review

**Rule:** All must APPROVE or issues get fixed and re-validated.

## Configuration

Optional settings in `.claude/settings.json`:

```json
{
  "omc": {
    "autopilot": {
      "maxIterations": 10,
      "maxQaCycles": 5,
      "maxValidationRounds": 3,
      "pauseAfterExpansion": false,
      "pauseAfterPlanning": false,
      "skipQa": false,
      "skipValidation": false
    }
  }
}
```

## Cancellation

```
/cancel-autopilot
```

Or say: "stop", "cancel", "abort"

Progress is preserved for resume.

## Resume

If autopilot was cancelled or failed, just run `/autopilot` again to resume from where it stopped.

## Examples

**New Project:**
```
/autopilot A REST API for a bookstore inventory with CRUD operations
```

**Feature Addition:**
```
/autopilot Add user authentication with JWT tokens
```

**Enhancement:**
```
/ap Add dark mode support with system preference detection
```

## Best Practices

1. **Be specific about the domain** - "bookstore" not "store"
2. **Mention key features** - "with CRUD", "with authentication"
3. **Specify constraints** - "using TypeScript", "with PostgreSQL"
4. **Let it run** - Don't interrupt unless truly needed

## Troubleshooting

**Stuck in a phase?**
- Check TODO list for blocked tasks
- Review `.omc/autopilot-state.json` for state
- Cancel and resume if needed

**Validation keeps failing?**
- Review the specific issues
- Consider if requirements were too vague
- Cancel and provide more detail

**QA cycles exhausted?**
- Same error 3 times = fundamental issue
- Review the error pattern
- May need manual intervention
