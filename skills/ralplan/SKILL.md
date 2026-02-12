---
name: ralplan
description: Alias for /plan --consensus
---

# Ralplan (Consensus Planning Alias)

Ralplan is a shorthand alias for `/oh-my-claudecode:plan --consensus`. It triggers iterative planning with Planner, Architect, and Critic agents until consensus is reached.

## Usage

```
/oh-my-claudecode:ralplan "task description"
```

## Behavior

This skill invokes the Plan skill in consensus mode:

```
/oh-my-claudecode:plan --consensus <arguments>
```

The consensus workflow:
1. **Planner** creates initial plan
2. **Architect** reviews for architectural soundness
3. **Critic** evaluates against quality criteria
4. If Critic rejects: iterate with feedback (max 5 iterations)
5. On Critic approval: present to user for final consent

Follow the Plan skill's full documentation for consensus mode details.
