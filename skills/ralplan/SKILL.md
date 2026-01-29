---
name: ralplan
aliases: [rp, planloop]
description: Iterative planning with Planner, Architect, and Critic until consensus
---

# Ralplan Command

**This is an alias for `/plan --consensus`**

Ralplan orchestrates three specialized agents—Planner, Architect, and Critic—in an iterative loop until consensus is reached on a comprehensive work plan.

## Usage

```
/oh-my-claudecode:ralplan [task]
```

## What It Does

Invokes the plan skill with --consensus mode, which:
1. Creates initial plan with Planner agent
2. Consults Architect for architectural questions
3. Reviews with Critic agent
4. Iterates until Critic approves (max 5 iterations)

## Implementation

When this skill is invoked, immediately invoke the plan skill with consensus mode:

```
Invoke Skill: plan --consensus {{ARGUMENTS}}
```

Pass all arguments to the plan skill. The plan skill handles all consensus logic, state management, and iteration.

## See Also

- `/plan` - Base planning skill with all modes
- `/plan --consensus` - Direct invocation of consensus mode
- `/cancel` - Cancel active planning session
