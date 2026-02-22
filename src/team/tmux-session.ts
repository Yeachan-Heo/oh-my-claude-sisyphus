// src/team/tmux-session.ts

/**
 * Tmux Session Management for MCP Team Bridge
 *
 * Create, kill, list, and manage tmux sessions for MCP worker bridge daemons.
 * Sessions are named "omc-team-{teamName}-{workerName}".
 */

import { execSync, execFileSync } from 'child_process';

const TMUX_SESSION_PREFIX = 'omc-team';

export interface TeamSession {
  sessionName: string;
  leaderPaneId: string;
  workerPaneIds: string[];
}

export interface WorkerPaneConfig {
  teamName: string;
  workerName: string;
  envVars: Record<string, string>;
  launchCmd: string;
  cwd: string;
}

/** Validate tmux is available. Throws with install instructions if not. */
export function validateTmux(): void {
  try {
    execSync('tmux -V', { encoding: 'utf-8', timeout: 5000, stdio: 'pipe' });
  } catch {
    throw new Error(
      'tmux is not available. Install it:\n' +
      '  macOS: brew install tmux\n' +
      '  Ubuntu/Debian: sudo apt-get install tmux\n' +
      '  Fedora: sudo dnf install tmux\n' +
      '  Arch: sudo pacman -S tmux'
    );
  }
}

/** Sanitize name to prevent tmux command injection (alphanum + hyphen only) */
export function sanitizeName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9-]/g, '');
  if (sanitized.length === 0) {
    throw new Error(`Invalid name: "${name}" contains no valid characters (alphanumeric or hyphen)`);
  }
  if (sanitized.length < 2) {
    throw new Error(`Invalid name: "${name}" too short after sanitization (minimum 2 characters)`);
  }
  // Truncate to safe length for tmux session names
  return sanitized.slice(0, 50);
}

/** Build session name: "omc-team-{teamName}-{workerName}" */
export function sessionName(teamName: string, workerName: string): string {
  return `${TMUX_SESSION_PREFIX}-${sanitizeName(teamName)}-${sanitizeName(workerName)}`;
}

/** @deprecated Use createTeamSession() instead for split-pane topology */
/** Create a detached tmux session. Kills stale session with same name first. */
export function createSession(teamName: string, workerName: string, workingDirectory?: string): string {
  const name = sessionName(teamName, workerName);

  // Kill existing session if present (stale from previous run)
  try {
    execFileSync('tmux', ['kill-session', '-t', name], { stdio: 'pipe', timeout: 5000 });
  } catch { /* ignore — session may not exist */ }

  // Create detached session with reasonable terminal size
  const args = ['new-session', '-d', '-s', name, '-x', '200', '-y', '50'];
  if (workingDirectory) {
    args.push('-c', workingDirectory);
  }
  execFileSync('tmux', args, { stdio: 'pipe', timeout: 5000 });

  return name;
}

/** @deprecated Use killTeamSession() instead */
/** Kill a session by team/worker name. No-op if not found. */
export function killSession(teamName: string, workerName: string): void {
  const name = sessionName(teamName, workerName);
  try {
    execFileSync('tmux', ['kill-session', '-t', name], { stdio: 'pipe', timeout: 5000 });
  } catch { /* ignore — session may not exist */ }
}

/** @deprecated Use isWorkerAlive() with pane ID instead */
/** Check if a session exists */
export function isSessionAlive(teamName: string, workerName: string): boolean {
  const name = sessionName(teamName, workerName);
  try {
    execFileSync('tmux', ['has-session', '-t', name], { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/** List all active worker sessions for a team */
export function listActiveSessions(teamName: string): string[] {
  const prefix = `${TMUX_SESSION_PREFIX}-${sanitizeName(teamName)}-`;
  try {
    const output = execFileSync(
      'tmux', ['list-sessions', '-F', '#{session_name}'],
      { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return output.trim().split('\n')
      .filter(s => s.startsWith(prefix))
      .map(s => s.slice(prefix.length));
  } catch {
    return [];
  }
}

/**
 * Spawn bridge in session via config temp file.
 *
 * Instead of passing JSON via tmux send-keys (brittle quoting), the caller
 * writes config to a temp file and passes --config flag:
 *   node dist/team/bridge-entry.js --config /tmp/omc-bridge-{worker}.json
 */
export function spawnBridgeInSession(
  tmuxSession: string,
  bridgeScriptPath: string,
  configFilePath: string
): void {
  const cmd = `node "${bridgeScriptPath}" --config "${configFilePath}"`;
  execFileSync('tmux', ['send-keys', '-t', tmuxSession, cmd, 'Enter'], { stdio: 'pipe', timeout: 5000 });
}

/**
 * Create a tmux session with split-pane topology for a team.
 * One session per team (omc-team-{teamName}), with:
 * - Left pane: leader context
 * - Right panes: N worker panes stacked vertically
 *
 * IMPORTANT: Uses pane IDs (%N format) not pane indices for stable targeting.
 */
export async function createTeamSession(
  teamName: string,
  workerCount: number,
  cwd: string
): Promise<TeamSession> {
  const sessionName = `omc-team-${sanitizeName(teamName)}`;
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  // Create session with first pane (leader)
  await execFileAsync('tmux', [
    'new-session', '-d', '-s', sessionName,
    '-x', '220', '-y', '50',
    '-c', cwd,
  ]);

  // Get leader pane ID
  const leaderResult = await execFileAsync('tmux', [
    'display-message', '-t', sessionName, '-p', '#{pane_id}'
  ]);
  const leaderPaneId = leaderResult.stdout.trim();

  const workerPaneIds: string[] = [];

  // Create worker panes: first via horizontal split, rest via vertical split
  for (let i = 0; i < workerCount; i++) {
    const splitTarget = i === 0 ? sessionName : workerPaneIds[i - 1];
    const splitType = i === 0 ? '-h' : '-v';

    await execFileAsync('tmux', [
      'split-window', splitType, '-t', splitTarget, '-c', cwd
    ]);

    // Get the most recently created pane ID
    const allPanesResult = await execFileAsync('tmux', [
      'list-panes', '-t', sessionName, '-F', '#{pane_id}'
    ]);
    const allPanes = allPanesResult.stdout.trim().split('\n').filter(Boolean);
    // The new pane is the last one not already in our list
    const newPaneId = allPanes.find(p => p !== leaderPaneId && !workerPaneIds.includes(p));
    if (newPaneId) {
      workerPaneIds.push(newPaneId);
    }
  }

  // Apply main-vertical layout
  try {
    await execFileAsync('tmux', ['select-layout', '-t', sessionName, 'main-vertical']);
  } catch {
    // Layout may not apply if only 1 pane; ignore
  }

  return { sessionName, leaderPaneId, workerPaneIds };
}

/**
 * Spawn a CLI agent in a specific pane.
 * Worker startup: env OMC_TEAM_WORKER={teamName}/workerName shell -lc "exec agentCmd"
 */
export async function spawnWorkerInPane(
  sessionName: string,
  paneId: string,
  config: WorkerPaneConfig
): Promise<void> {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  // Build env prefix string
  const envString = Object.entries(config.envVars)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');

  const shell = process.env.SHELL || '/bin/bash';
  const shellName = shell.split('/').pop() || 'bash';
  const rcFile = process.env.HOME ? `${process.env.HOME}/.${shellName}rc` : '';
  // Quote rcFile to prevent shell injection if HOME contains metacharacters
  const sourceCmd = rcFile ? `[ -f "${rcFile}" ] && source "${rcFile}"; ` : '';

  const startCmd = `env ${envString} ${shell} -c "${sourceCmd}exec ${config.launchCmd}"`;

  // Use -l (literal) flag to prevent tmux key-name parsing of the command string
  await execFileAsync('tmux', [
    'send-keys', '-t', paneId, '-l', startCmd
  ]);
  await execFileAsync('tmux', ['send-keys', '-t', paneId, 'Enter']);
}

/**
 * Send a short trigger message to a worker via tmux send-keys.
 * Uses literal mode (-l) to avoid stdin buffer issues.
 * Message must be < 200 chars.
 * Returns false on error (does not throw).
 */
export async function sendToWorker(
  sessionName: string,
  paneId: string,
  message: string
): Promise<boolean> {
  if (message.length > 200) {
    console.warn(`[tmux-session] sendToWorker: message truncated to 200 chars`);
    message = message.slice(0, 200);
  }
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    await execFileAsync('tmux', ['send-keys', '-t', paneId, '-l', message]);
    await execFileAsync('tmux', ['send-keys', '-t', paneId, 'Enter']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for a worker to write its ready sentinel file.
 * Polls .omc/state/team/{teamName}/workers/{workerName}/.ready
 * Default timeout: 30s
 */
export async function waitForWorkerReady(
  teamName: string,
  workerName: string,
  cwd: string,
  timeoutMs = 30_000
): Promise<boolean> {
  const { access } = await import('fs/promises');
  const { join } = await import('path');
  const sentinelPath = join(cwd, `.omc/state/team/${teamName}/workers/${workerName}/.ready`);
  const pollInterval = 500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await access(sentinelPath);
      return true;
    } catch {
      await new Promise(r => setTimeout(r, pollInterval));
    }
  }
  return false;
}

/**
 * Check if a worker pane is still alive.
 * Uses pane ID for stable targeting (not pane index).
 */
export async function isWorkerAlive(paneId: string): Promise<boolean> {
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    const result = await execFileAsync('tmux', [
      'display-message', '-t', paneId, '-p', '#{pane_dead}'
    ]);
    return result.stdout.trim() === '0';
  } catch {
    return false;
  }
}

/**
 * Kill the entire team tmux session.
 */
export async function killTeamSession(sessionName: string): Promise<void> {
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    await execFileAsync('tmux', ['kill-session', '-t', sessionName]);
  } catch {
    // Session may already be dead
  }
}

/**
 * Respawn a worker in a new pane (when old pane died).
 * Returns the new pane ID.
 */
export async function respawnWorkerInPane(
  sessionName: string,
  config: WorkerPaneConfig
): Promise<string> {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  // Create new vertical split in the session
  await execFileAsync('tmux', [
    'split-window', '-v', '-t', sessionName, '-c', config.cwd
  ]);

  // Get the new pane ID
  const allPanesResult = await execFileAsync('tmux', [
    'list-panes', '-t', sessionName, '-F', '#{pane_id}'
  ]);
  const allPanes = allPanesResult.stdout.trim().split('\n').filter(Boolean);
  const newPaneId = allPanes[allPanes.length - 1];

  // Spawn worker in new pane
  await spawnWorkerInPane(sessionName, newPaneId, config);

  return newPaneId;
}
