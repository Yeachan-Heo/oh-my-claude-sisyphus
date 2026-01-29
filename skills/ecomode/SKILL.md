---
name: ecomode
aliases: [eco, efficient, save-tokens, budget]
description: Token-efficient parallel execution mode using Haiku and Sonnet agents
---

# Ecomode Skill

Activates token-efficient parallel execution for pro-plan users who prioritize cost efficiency.

## When Activated

This skill enhances Claude's capabilities by:

1. **Parallel Execution**: Running multiple agents simultaneously for independent tasks
2. **Token-Conscious Routing**: Preferring Haiku and Sonnet agents, avoiding Opus
3. **Background Operations**: Using `run_in_background: true` for long operations
4. **Persistence Enforcement**: Never stopping until all tasks are verified complete
5. **Cost Optimization**: Minimizing token usage while maintaining quality

## Ecomode Routing Rules (CRITICAL)

**ALWAYS prefer lower tiers. Only escalate when task genuinely requires it.**

| Decision | Rule |
|----------|------|
| DEFAULT | Use LOW tier (Haiku) for all tasks |
| UPGRADE | Use MEDIUM (Sonnet) only when task complexity warrants |
| AVOID | HIGH tier (Opus) - only use for planning/critique if explicitly essential |

## Smart Model Routing (PREFER LOW TIER)

**Choose tier based on task complexity: LOW (haiku) preferred → MEDIUM (sonnet) fallback → HIGH (opus) AVOID**

### Agent Routing Table

| Domain | PREFERRED (Haiku) | FALLBACK (Sonnet) | AVOID (Opus) |
|--------|-------------------|-------------------|--------------|
| **Analysis** | `architect-low` | `architect-medium` | ~~`architect`~~ |
| **Execution** | `executor-low` | `executor` | ~~`executor-high`~~ |
| **Search** | `explore` | `explore-medium` | ~~`explore-high`~~ |
| **Research** | `researcher-low` | `researcher` | - |
| **Frontend** | `designer-low` | `designer` | ~~`designer-high`~~ |
| **Docs** | `writer` | - | - |
| **Visual** | - | `vision` | - |
| **Planning** | - | - | `planner` (if essential) |
| **Critique** | - | - | `critic` (if essential) |
| **Testing** | - | `qa-tester` | ~~`qa-tester-high`~~ |
| **Security** | `security-reviewer-low` | - | ~~`security-reviewer`~~ |
| **Build** | `build-fixer-low` | `build-fixer` | - |
| **TDD** | `tdd-guide-low` | `tdd-guide` | - |
| **Code Review** | `code-reviewer-low` | - | ~~`code-reviewer`~~ |
| **Data Science** | `scientist-low` | `scientist` | ~~`scientist-high`~~ |

### Tier Selection Guide (Token-Conscious)

| Task Complexity | Tier | Examples |
|-----------------|------|----------|
| Simple lookups | LOW | "What does this function return?", "Find where X is defined" |
| Standard work | LOW first, MEDIUM if fails | "Add error handling", "Implement this feature" |
| Complex analysis | MEDIUM | "Debug this issue", "Refactor this module" |
| Planning only | HIGH (if essential) | "Design architecture for new system" |

### Routing Examples

**CRITICAL: Always pass `model` parameter explicitly - Claude Code does NOT auto-apply models from agent definitions!**

```
// Simple question → LOW tier (DEFAULT)
Task(subagent_type="oh-my-claudecode:architect-low", model="haiku", prompt="What does this function return?")

// Standard implementation → TRY LOW first
Task(subagent_type="oh-my-claudecode:executor-low", model="haiku", prompt="Add validation to login form")

// If LOW fails, escalate to MEDIUM
Task(subagent_type="oh-my-claudecode:executor", model="sonnet", prompt="Add error handling to login")

// File lookup → ALWAYS LOW
Task(subagent_type="oh-my-claudecode:explore", model="haiku", prompt="Find where UserService is defined")

// Only use MEDIUM for complex patterns
Task(subagent_type="oh-my-claudecode:explore-medium", model="sonnet", prompt="Find all authentication patterns in the codebase")
```

## DELEGATION ENFORCEMENT (CRITICAL)

**YOU ARE AN ORCHESTRATOR, NOT AN IMPLEMENTER.**

| Action | YOU Do | DELEGATE |
|--------|--------|----------|
| Read files for context | ✓ | |
| Track progress (TODO) | ✓ | |
| Spawn parallel agents | ✓ | |
| **ANY code change** | ✗ NEVER | executor-low/executor |
| **UI work** | ✗ NEVER | designer-low/designer |
| **Docs** | ✗ NEVER | writer |

**Path Exception**: Only write to `.omc/`, `.claude/`, `CLAUDE.md`, `AGENTS.md`

## Background Execution Rules

**Run in Background** (set `run_in_background: true`):
- Package installation: npm install, pip install, cargo build
- Build processes: npm run build, make, tsc
- Test suites: npm test, pytest, cargo test
- Docker operations: docker build, docker pull

**Run Blocking** (foreground):
- Quick status checks: git status, ls, pwd
- File reads (NOT edits - delegate edits to executor-low)
- Simple commands

## Verification Checklist

Before stopping, verify:
- [ ] TODO LIST: Zero pending/in_progress tasks
- [ ] FUNCTIONALITY: All requested features work
- [ ] TESTS: All tests pass (if applicable)
- [ ] ERRORS: Zero unaddressed errors

**If ANY checkbox is unchecked, CONTINUE WORKING.**

## Token Savings Tips

1. **Batch similar tasks** to one agent instead of spawning many
2. **Use explore (haiku)** for file discovery, not architect
3. **Prefer executor-low** for simple changes - only upgrade if it fails
4. **Avoid opus agents** unless the task genuinely requires deep reasoning
5. **Use writer (haiku)** for all documentation tasks

## STATE CLEANUP ON COMPLETION

**IMPORTANT: Delete state files on completion - do NOT just set `active: false`**

When ecomode completes (all verification passes):

```bash
# Delete ecomode state files
rm -f .omc/state/ecomode-state.json
rm -f ~/.claude/ecomode-state.json
```

This ensures clean state for future sessions. Stale state files with `active: false` should not be left behind.
