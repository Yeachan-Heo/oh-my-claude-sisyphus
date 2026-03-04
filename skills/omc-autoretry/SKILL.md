---
name: omc-autoretry
description: Run a Claude Code task with automatic rate-limit recovery — detects rate limits and resumes via --continue with no human intervention
triggers:
  - "autoretry"
  - "auto retry"
  - "auto-retry"
  - "keep running"
  - "run until done"
  - "omc-autoretry"
---

# omc-autoretry

Start a Claude Code task right now and let it run to completion automatically, even across multiple rate-limit resets. Unlike `omc-schedule` (which schedules a *fresh* prompt in the future), `omc-autoretry` starts immediately, detects rate limits from live output, waits the exact required cool-down, then resumes via `--continue` so the full conversation context is preserved. No human intervention required.

## Usage

```
/oh-my-claudecode:omc-autoretry "<prompt>"
/oh-my-claudecode:omc-autoretry --status
/oh-my-claudecode:omc-autoretry --cancel
```

### Examples

```
# Start a long task that might hit rate limits
/oh-my-claudecode:omc-autoretry "Implement the full P0-P4 Insights UI from notepad context"

# Check current session status + countdown
/oh-my-claudecode:omc-autoretry --status

# Cancel the running session
/oh-my-claudecode:omc-autoretry --cancel
```

## How It Works

1. **Run** — Executes `claude -p "<prompt>" --dangerously-skip-permissions` in the current working directory
2. **Detect** — Scans live output for rate-limit signals: `rate limit`, `429`, `try again in`, `you've hit your limit`, `overloaded`, `claude is overloaded`
3. **Wait** — Parses the exact wait time from the message ("try again in 5h 0m"); defaults to 5 hours if no time is found; logs a countdown every minute
4. **Resume** — Runs `claude --continue --dangerously-skip-permissions` (no prompt needed — full context is preserved by `--continue`)
5. **Loop** — Repeats until exit code 0, or 3 consecutive non-rate-limit failures
6. **Notify** — Sends a system/Telegram/Discord notification on final success or failure

All output is streamed to the terminal (via tmux) and saved to `.omc/logs/autoretry/<session-id>.log`.

## Key Difference from omc-schedule

| | omc-schedule | omc-autoretry |
|---|---|---|
| Start time | Future (scheduled) | Immediately |
| On rate limit | User must re-schedule | Auto-detects and waits |
| Context | Fresh prompt each time | `--continue` preserves full context |
| Use case | "Run this tomorrow at 9am" | "Keep going until done" |

## Implementation Steps

### Argument: `"<prompt>"` (main invocation)

**Step 1: Find the runner script**

```bash
RUNNER="$(npm root -g 2>/dev/null)/oh-my-claudecode/scripts/autoretry-runner.mjs"
if [ ! -f "$RUNNER" ]; then
  RUNNER=$(ls ~/.claude/plugins/cache/omc/oh-my-claudecode/*/scripts/autoretry-runner.mjs 2>/dev/null | head -1)
fi
if [ -z "$RUNNER" ] || [ ! -f "$RUNNER" ]; then
  echo "Error: autoretry-runner.mjs not found. Run 'omc update' to fix." >&2
  exit 1
fi
```

**Step 2: Generate a tmux session name**

Use a 4-byte random hex suffix to avoid collisions with any existing session:
```bash
SESSION_NAME="omc-autoretry-$(node -e "const {randomBytes}=require('crypto');process.stdout.write(randomBytes(4).toString('hex'))")"
```

**Step 3: Start the tmux session**

```bash
WORK_DIR="$(pwd)"
mkdir -p "$WORK_DIR/.omc/logs"
tmux new-session -d -s "$SESSION_NAME" \
  "node \"$RUNNER\" --prompt $(printf '%q' "$PROMPT") --work-dir \"$WORK_DIR\""
```

If `tmux` is not available, fall back to `nohup` with a warning:
```bash
nohup node "$RUNNER" --prompt "$PROMPT" --work-dir "$WORK_DIR" \
  > "$WORK_DIR/.omc/logs/autoretry-nohup.log" 2>&1 &
echo "Warning: tmux not found — running via nohup (PID $!). Attach: tail -f $WORK_DIR/.omc/logs/autoretry-nohup.log"
```

**Step 4: Confirm to user**

```
Started omc-autoretry session

  Session : omc-autoretry-a1b2c3d4
  Prompt  : "Implement the full P0-P4 Insights UI..."
  Dir     : /path/to/project
  Log     : .omc/logs/autoretry/<session-id>.log
  Status  : .omc/state/autoretry-status.json

Monitor  : tmux attach -t omc-autoretry-a1b2c3d4
Cancel   : /oh-my-claudecode:omc-autoretry --cancel
Status   : /oh-my-claudecode:omc-autoretry --status

The runner will detect rate limits automatically and resume via --continue.
Notifications will fire on completion or failure.
```

### Argument: `--status`

1. Read `.omc/state/autoretry-status.json`
2. Display current status. If `status === "waiting"`, compute and show the remaining countdown from `waitUntil`
3. If the file does not exist: "No active autoretry session found."

Example output:
```
omc-autoretry status

  Session : a1b2c3d4
  Status  : waiting (rate limited)
  Attempt : 2
  Resumes : 2026-03-05T12:47:00.000Z (in 4h 32m)
  Log     : .omc/logs/autoretry/a1b2c3d4.log

To monitor: tmux attach -t omc-autoretry-a1b2c3d4
```

### Argument: `--cancel`

1. Read `.omc/state/autoretry-status.json` to get the session ID
2. Find and kill the tmux session:
   ```bash
   tmux list-sessions 2>/dev/null | grep "omc-autoretry" | cut -d: -f1 | xargs -I{} tmux kill-session -t {}
   ```
3. Update the status file: set `status` to `"cancelled"`, add `cancelledAt` timestamp
4. Confirm: "Cancelled omc-autoretry session <id>"

## Notes

- **Context preservation**: `--continue` resumes from the exact conversation state — no context is lost between rate-limit cycles. This is the key advantage over any approach that restarts with a new prompt.
- **Requires `claude` CLI in PATH**: The runner calls `claude` directly. Verify with `which claude` or set `CLAUDE_BIN` env var to an absolute path.
- **tmux recommended**: Running inside tmux means the session outlives your terminal. Without tmux the runner falls back to `nohup`.
- **Notifications**: Configure Telegram or Discord via `/oh-my-claudecode:configure-notifications`. Falls back to macOS `display notification` / Linux `notify-send`.
- **Abort condition**: 3 consecutive failures that are NOT rate-limit-related will abort the loop and fire a failure notification. A 30-second back-off is applied between non-rate-limit retries.
- **Log location**: `.omc/logs/autoretry/<session-id>.log` — full streamed output from all attempts.
- **Status file**: `.omc/state/autoretry-status.json` — machine-readable, updated on every state transition.
- **Manual stop**: `tmux kill-session -t omc-autoretry-<id>` or use `--cancel`.
