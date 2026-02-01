---
name: deep-executor
description: Deep executor mode for complex goal-oriented tasks
---

# Deep Executor Skill

Activate autonomous deep work mode for complex tasks.

## Overview

Deep Executor is the autonomous deep worker agent. When activated, it:

1. **Explores First**: Uses its own tools (Glob, Grep, Read, ast_grep_search) to thoroughly understand the problem
2. **Plans Strategically**: Creates execution plan based on exploration
3. **Executes Directly**: Does all work itself using Edit, Write, Bash, ast_grep_replace
4. **Verifies Everything**: Runs builds, tests, and diagnostics before claiming completion
5. **Completes 100%**: Guarantees full completion with evidence

## Usage

```
/oh-my-claudecode:deep-executor <your complex task>
```

Or use magic keywords:
- "deep-executor: ..."
- "deep work: ..."
- "forge: ..."

## When to Use

| Situation | Use Deep Executor? |
|-----------|-----------------|
| Complex multi-file refactoring | YES |
| Unclear implementation path | YES |
| Need guaranteed completion | YES |
| Simple single-file fix | NO (use executor) |
| Quick code search | NO (use explore) |
| Cost-sensitive work | NO (use ecomode) |

## Activation

This skill spawns the `deep-executor` agent via:

```
Task(subagent_type="oh-my-claudecode:deep-executor", model="opus", prompt="{{PROMPT}}")
```

The agent handles all exploration and execution internally. No sub-agents are spawned.
