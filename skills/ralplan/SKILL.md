---
name: ralplan
description: Consensus planning - agents align internally, then execute via ralph (non-interactive by default; use --interactive for step-by-step user approval)
---

# Ralplan (Consensus Planning)

Runs Planner → Architect → Critic consensus loop internally, then immediately executes via ralph. No user interruptions by default.

## Usage

```
/oh-my-claudecode:ralplan "task description"
/oh-my-claudecode:ralplan --interactive "task description"
```

## Default Behavior (non-interactive)

1. **Planner** creates initial plan
2. **Architect** reviews for architectural soundness — await completion before step 3
3. **Critic** evaluates against quality criteria — run only after step 2 completes
4. If Critic rejects: iterate with feedback (max 5 iterations)
5. On Critic approval: **immediately invoke** `Skill("oh-my-claudecode:ralph")` for execution — no user prompt

> Do NOT ask the user anything. Do NOT use `AskUserQuestion`. Proceed autonomously.

## --interactive Flag

When `--interactive` is passed, enable user checkpoints:

1. **Planner** creates initial plan
2. **MUST** use `AskUserQuestion` to present the draft plan before review (Proceed to review / Request changes / Skip review)
3. **Architect** reviews for architectural soundness — await completion before step 4
4. **Critic** evaluates against quality criteria — run only after step 3 completes
5. If Critic rejects: iterate with feedback (max 5 iterations)
6. On Critic approval: **MUST** use `AskUserQuestion` to present the plan with approval options
7. User chooses: Approve, Request changes, or Reject
8. On approval: invoke `Skill("oh-my-claudecode:ralph")` for execution

> **Important (both modes):** Steps 2/3 MUST run sequentially. Do NOT issue both `ask_codex` calls in the same parallel batch — if one hits a 429 rate-limit error, Claude Code will cancel the sibling call. On rate-limit error, retry once after 5–10s; on second failure fall back to the equivalent Claude agent.
