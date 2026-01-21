---
name: cancel-autopilot
description: Cancel active autopilot session
user-invocable: true
---

# Cancel Autopilot Skill

Cancel an active autopilot session gracefully.

## What It Does

- Stops the active autopilot workflow
- Cleans up any active Ralph or UltraQA state
- Preserves progress for potential resume

## Usage

```
/cancel-autopilot
```

Or say: "stop autopilot", "cancel autopilot", "abort autopilot"

## What Gets Cleaned Up

1. **Autopilot state** - Marked as inactive (preserved for resume)
2. **Ralph state** - Cleared if active
3. **Ultrawork state** - Cleared if linked to Ralph
4. **UltraQA state** - Cleared if active

## Progress Preservation

When cancelled, autopilot preserves:
- Current phase
- Files created/modified
- Spec and plan files
- Validation verdicts

Run `/autopilot` to resume from where you left off.

## Force Clear

To completely clear all state (no resume):

```
/cancel-autopilot --clear
```

This removes all autopilot files including:
- `.omc/autopilot-state.json`
- `.omc/autopilot/` directory
- `.omc/plans/autopilot-impl.md`
