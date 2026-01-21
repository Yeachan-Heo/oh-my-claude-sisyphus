---
description: Cancel active autopilot session
---

# Cancel Autopilot

[CANCELLING AUTOPILOT]

You are cancelling the active autopilot session.

## Action

1. Call the cancel function to clean up state
2. Report what was cancelled
3. Show preserved progress

## Steps

1. Check if autopilot is active
2. Clean up Ralph/UltraQA if active
3. Preserve autopilot state for resume
4. Report status

## Arguments

{{ARGUMENTS}}

If `--clear` is passed, completely clear all state instead of preserving.

## Output

Report:
- What phase was cancelled
- What modes were cleaned up
- How to resume
