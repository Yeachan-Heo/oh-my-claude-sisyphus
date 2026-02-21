#!/bin/bash
# PSM Tmux Session Management

# Check if tmux is available
psm_has_tmux() {
    command -v tmux &> /dev/null
}

# Create a tmux session
# Usage: psm_create_tmux_session <session_name> <working_dir>
psm_create_tmux_session() {
    local session_name="$1"
    local working_dir="$2"

    if ! psm_has_tmux; then
        echo "error|tmux not found"
        return 1
    fi

    # Check if session already exists
    if tmux has-session -t "$session_name" 2>/dev/null; then
        echo "exists|$session_name"
        return 1
    fi

    # Create detached session
    tmux new-session -d -s "$session_name" -c "$working_dir" 2>/dev/null || {
        echo "error|Failed to create tmux session"
        return 1
    }

    echo "created|$session_name"
    return 0
}

# Launch Claude Code in tmux session
# Usage: psm_launch_claude <session_name>
psm_launch_claude() {
    local session_name="$1"

    if ! tmux has-session -t "$session_name" 2>/dev/null; then
        echo "error|Session not found: $session_name"
        return 1
    fi

    # Send claude command to the session
    tmux send-keys -t "$session_name" "claude" Enter

    echo "launched|$session_name"
    return 0
}

# Kill a tmux session
# Usage: psm_kill_tmux_session <session_name>
psm_kill_tmux_session() {
    local session_name="$1"

    if ! tmux has-session -t "$session_name" 2>/dev/null; then
        echo "not_found|$session_name"
        return 0
    fi

    tmux kill-session -t "$session_name" 2>/dev/null || {
        echo "error|Failed to kill session"
        return 1
    }

    echo "killed|$session_name"
    return 0
}

# List all PSM tmux sessions
psm_list_tmux_sessions() {
    if ! psm_has_tmux; then
        return 0
    fi

    tmux list-sessions -F "#{session_name}|#{session_created}|#{session_attached}" 2>/dev/null | grep "^psm:" || true
}

# Check if a tmux session exists
# Usage: psm_tmux_session_exists <session_name>
psm_tmux_session_exists() {
    local session_name="$1"
    tmux has-session -t "$session_name" 2>/dev/null
}

# Get current tmux session name
psm_current_tmux_session() {
    if [[ -n "$TMUX" ]]; then
        tmux display-message -p "#{session_name}" 2>/dev/null
    fi
}

# Generate tmux session name
# Usage: psm_tmux_session_name <alias> <type> <id>
psm_tmux_session_name() {
    local alias="$1"
    local type="$2"
    local id="$3"

    echo "psm:${alias}:${type}-${id}"
}
