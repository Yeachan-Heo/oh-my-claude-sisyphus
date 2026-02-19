/**
 * tmux utility functions for omc native shell launch
 * Adapted from oh-my-codex patterns for omc
 */

import { execFileSync } from 'child_process';
import { basename } from 'path';

export type ClaudeLaunchPolicy = 'inside-tmux' | 'outside-tmux' | 'direct';

export interface TmuxPaneSnapshot {
  paneId: string;
  currentCommand: string;
  startCommand: string;
}

/**
 * Check if tmux is available on the system
 */
export function isTmuxAvailable(): boolean {
  try {
    execFileSync('tmux', ['-V'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if claude CLI is available on the system
 */
export function isClaudeAvailable(): boolean {
  try {
    execFileSync('claude', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve launch policy based on environment
 * - inside-tmux: Already in tmux session, split pane for HUD
 * - outside-tmux: Not in tmux, create new session
 * - direct: tmux not available, run directly
 */
export function resolveLaunchPolicy(env: NodeJS.ProcessEnv = process.env): ClaudeLaunchPolicy {
  if (!isTmuxAvailable()) {
    return 'direct';
  }
  return env.TMUX ? 'inside-tmux' : 'outside-tmux';
}

/**
 * Build tmux session name from directory and git branch
 * Format: omc-{dir}-{branch}-{session}
 */
export function buildTmuxSessionName(cwd: string, sessionId: string): string {
  const dirToken = sanitizeTmuxToken(basename(cwd));
  let branchToken = 'detached';

  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (branch) {
      branchToken = sanitizeTmuxToken(branch);
    }
  } catch {
    // Non-git directory or git unavailable
  }

  const sessionToken = sanitizeTmuxToken(sessionId.replace(/^omc-/, ''));
  const name = `omc-${dirToken}-${branchToken}-${sessionToken}`;
  return name.length > 120 ? name.slice(0, 120) : name;
}

/**
 * Sanitize string for use in tmux session/window names
 * Lowercase, alphanumeric + hyphens only
 */
export function sanitizeTmuxToken(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'unknown';
}

/**
 * Build shell command string for tmux with proper quoting
 */
export function buildTmuxShellCommand(command: string, args: string[]): string {
  return [quoteShellArg(command), ...args.map(quoteShellArg)].join(' ');
}

/**
 * Quote shell argument for safe shell execution
 * Uses single quotes with proper escaping
 */
export function quoteShellArg(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

/**
 * Parse tmux pane list output into structured data
 */
export function parseTmuxPaneSnapshot(output: string): TmuxPaneSnapshot[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [paneId = '', currentCommand = '', ...startCommandParts] = line.split('\t');
      return {
        paneId: paneId.trim(),
        currentCommand: currentCommand.trim(),
        startCommand: startCommandParts.join('\t').trim(),
      };
    })
    .filter((pane) => pane.paneId.startsWith('%'));
}

/**
 * Check if pane is running a HUD watch command
 */
export function isHudWatchPane(pane: TmuxPaneSnapshot): boolean {
  const command = `${pane.startCommand} ${pane.currentCommand}`.toLowerCase();
  return /\bhud\b/.test(command)
    && /--watch\b/.test(command)
    && (/\bomc(?:\.js)?\b/.test(command) || /\bnode\b/.test(command));
}

/**
 * Find HUD watch pane IDs in current window.
 *
 * When `currentPaneId` is undefined or empty (e.g., `TMUX_PANE` env var is not
 * set because the leader was spawned by a team worker in a new context), we must
 * NOT fall through to comparing pane IDs against `undefined` — that would make
 * every pane pass the filter and include the leader's own pane in the cleanup
 * list (issue #723).
 *
 * Guard: if `currentPaneId` is absent, skip the exclusion filter entirely so
 * that no pane is accidentally promoted to "stale HUD" status.  The caller
 * (`listHudWatchPaneIdsInCurrentWindow`) is responsible for resolving the
 * active pane ID via tmux before calling this function.
 */
export function findHudWatchPaneIds(panes: TmuxPaneSnapshot[], currentPaneId?: string): string[] {
  return panes
    .filter((pane) => {
      // Guard: only exclude when we actually know which pane is the leader.
      // An undefined/empty currentPaneId must NOT be compared — every pane ID
      // is !== undefined, so skipping the filter is the safe default.
      if (!currentPaneId) return true; // no leader ID known — keep all for HUD check only
      return pane.paneId !== currentPaneId;
    })
    .filter((pane) => isHudWatchPane(pane))
    .map((pane) => pane.paneId);
}

/**
 * Resolve the pane ID to exclude (the leader / current pane).
 *
 * Priority:
 *  1. Use `TMUX_PANE` when set (normal case).
 *  2. Fall back to `tmux display-message -p "#{pane_id}"` to detect the
 *     currently active pane (handles the case where TMUX_PANE is absent because
 *     the leader was launched by a team worker in a new shell context).
 *  3. Return `undefined` if neither source is available (e.g., outside tmux).
 */
export function resolveCurrentPaneId(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const fromEnv = env.TMUX_PANE;
  if (fromEnv) return fromEnv;

  try {
    const active = execFileSync('tmux', ['display-message', '-p', '#{pane_id}'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return active.startsWith('%') ? active : undefined;
  } catch {
    return undefined;
  }
}

/**
 * List HUD watch panes in current tmux window.
 *
 * When `currentPaneId` is not provided, we attempt to resolve the active pane
 * via `resolveCurrentPaneId()` so that the leader is always excluded from the
 * cleanup candidate list.
 */
export function listHudWatchPaneIdsInCurrentWindow(currentPaneId?: string): string[] {
  // Resolve leader pane ID with fallback (fixes issue #723)
  const leaderPaneId = currentPaneId ?? resolveCurrentPaneId();

  try {
    const output = execFileSync(
      'tmux',
      ['list-panes', '-F', '#{pane_id}\t#{pane_current_command}\t#{pane_start_command}'],
      { encoding: 'utf-8' }
    );
    return findHudWatchPaneIds(parseTmuxPaneSnapshot(output), leaderPaneId);
  } catch {
    return [];
  }
}

/**
 * Create HUD watch pane in current window
 * Returns pane ID or null on failure
 */
export function createHudWatchPane(cwd: string, hudCmd: string): string | null {
  try {
    const output = execFileSync(
      'tmux',
      ['split-window', '-v', '-l', '4', '-d', '-c', cwd, '-P', '-F', '#{pane_id}', hudCmd],
      { encoding: 'utf-8' }
    );
    const paneId = output.split('\n')[0]?.trim() || '';
    return paneId.startsWith('%') ? paneId : null;
  } catch {
    return null;
  }
}

/**
 * Kill tmux pane by ID
 */
export function killTmuxPane(paneId: string): void {
  if (!paneId.startsWith('%')) return;
  try {
    execFileSync('tmux', ['kill-pane', '-t', paneId], { stdio: 'ignore' });
  } catch {
    // Pane may already be gone; ignore
  }
}
