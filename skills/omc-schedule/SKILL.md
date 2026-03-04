---
name: omc-schedule
description: Schedule a Claude Code task to run automatically at a future time — enables unattended resumption after rate limit resets
---

# omc-schedule

Schedule a task to execute automatically at a specified future time, with zero human intervention required. Designed for the common case of Claude Code hitting a 5-hour rate limit mid-work: schedule the continuation, close your laptop, and find results waiting when you return.

## Usage

```
/oh-my-claudecode:omc-schedule <when> "<prompt>"
/oh-my-claudecode:omc-schedule --list
/oh-my-claudecode:omc-schedule --cancel <task-id>
/oh-my-claudecode:omc-schedule --status
```

### Time Formats

| Format | Example | Meaning |
|--------|---------|---------|
| Relative | `5h`, `30m`, `2h30m` | From now |
| Rate limit | `rate-limit` | 5 hours from now (standard reset) |
| Absolute | `09:00`, `14:30` | Today at that time (tomorrow if past) |
| Tomorrow | `tomorrow 09:00` | Next day at that time |

### Examples

```
# Resume after rate limit reset
/oh-my-claudecode:omc-schedule rate-limit "Continue Insights UI P0-P4 from notepad"

# 2 hours from now
/oh-my-claudecode:omc-schedule 2h "Run daily rate intelligence briefing"

# Specific time
/oh-my-claudecode:omc-schedule 09:00 "Generate morning summary report"

# Check scheduled tasks
/oh-my-claudecode:omc-schedule --list

# Cancel a task
/oh-my-claudecode:omc-schedule --cancel abc123
```

## How It Works

1. **Queue**: Task saved to `.omc/state/scheduled-tasks.json` with ID, prompt, working directory, and scheduled time
2. **Daemon**: A tmux session (`omc-sched-daemon`) runs `schedule-daemon.mjs` which polls every 30 seconds for due tasks
3. **Execute**: When the time arrives, runs `claude -p "<prompt>" --dangerously-skip-permissions` in the original working directory
4. **Log**: Output saved to `.omc/logs/scheduled/<task-id>.log`
5. **Notify**: Sends completion notification via configured OMC notification hooks (Discord/Telegram/Slack)

## Implementation Steps

When the user invokes this skill:

### Argument: `--list`
1. Read `.omc/state/scheduled-tasks.json`
2. Display all pending tasks in a table: ID, prompt (truncated), scheduled time, status
3. If file doesn't exist or is empty: "No scheduled tasks."

### Argument: `--cancel <id>`
1. Read `.omc/state/scheduled-tasks.json`
2. Remove the task with matching ID (prefix match is fine)
3. Write back the file
4. Report: "Cancelled task <id>: <prompt>"

### Argument: `--status`
1. Check if tmux session `omc-sched-daemon` is running: `tmux has-session -t omc-sched-daemon 2>/dev/null`
2. Report daemon status (running/stopped)
3. Show count of pending tasks

### Argument: `<when> "<prompt>"` (main scheduling flow)

**Step 1: Parse the time argument**

```
rate-limit → now + 5h
Nh          → now + N hours
Nm          → now + N minutes
NhMm        → now + N hours M minutes
HH:MM       → today at HH:MM (if past: tomorrow at HH:MM)
tomorrow HH:MM → tomorrow at HH:MM
```

Convert to Unix timestamp (seconds since epoch).

**Step 2: Generate task ID**
```
<random 8-char hex>
```
Use `Math.random().toString(16).slice(2, 10)` or similar.

**Step 3: Save to scheduled-tasks.json**
```json
{
  "tasks": [
    {
      "id": "a1b2c3d4",
      "prompt": "Continue Insights UI P0-P4 from notepad",
      "workingDirectory": "/path/to/project",
      "scheduledAt": 1709876543,
      "createdAt": 1709869343,
      "status": "pending"
    }
  ]
}
```

Use `Bash` tool:
```bash
# Read existing tasks (create if missing)
TASKS_FILE=".omc/state/scheduled-tasks.json"
mkdir -p .omc/state
# Append new task using node -e or jq
```

**Step 4: Ensure daemon is running**

Check if `omc-sched-daemon` tmux session exists:
```bash
tmux has-session -t omc-sched-daemon 2>/dev/null
```

If not running, start it:
```bash
# Find the daemon script path
DAEMON_SCRIPT="$(npm root -g)/oh-my-claudecode/scripts/schedule-daemon.mjs 2>/dev/null || \
  ~/.claude/plugins/cache/omc/oh-my-claudecode/*/scripts/schedule-daemon.mjs | head -1"

tmux new-session -d -s omc-sched-daemon \
  "node $DAEMON_SCRIPT --watch-dir $(pwd) 2>&1 | tee .omc/logs/schedule-daemon.log"
```

**Step 5: Confirm to user**

```
✅ Scheduled task a1b2c3d4
   Prompt:    "Continue Insights UI P0-P4 from notepad"
   Runs at:   2026-03-05 07:47:00 (in 5h 0m)
   Directory: /path/to/project
   Log:       .omc/logs/scheduled/a1b2c3d4.log

Daemon: running (omc-sched-daemon tmux session)

To cancel: /oh-my-claudecode:omc-schedule --cancel a1b2c3d4
To monitor: tmux attach -t omc-sched-daemon
```

## Notes

- **Permissions**: `--dangerously-skip-permissions` is required for unattended runs. The user explicitly opted in by using this skill.
- **Auth**: Works with API key auth. If using OAuth, ensure the token doesn't expire before the scheduled time.
- **Multiple tasks**: Multiple tasks can be queued; the daemon processes them in scheduled order.
- **Context handoff**: Use `/oh-my-claudecode:note --priority` before scheduling to save context that the resumed session will load automatically.
- **tmux required**: The daemon runs in a tmux session. If tmux is not installed, fall back to a background `nohup` process with a warning.
