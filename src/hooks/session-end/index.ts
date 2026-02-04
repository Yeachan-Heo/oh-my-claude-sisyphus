import * as fs from 'fs';
import * as path from 'path';

export interface SessionEndInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode: string;
  hook_event_name: 'SessionEnd';
  reason: 'clear' | 'logout' | 'prompt_input_exit' | 'other';
}

export interface SessionMetrics {
  session_id: string;
  started_at?: string;
  ended_at: string;
  reason: string;
  duration_ms?: number;
  agents_spawned: number;
  agents_completed: number;
  modes_used: string[];
}

export interface HookOutput {
  continue: boolean;
}

/**
 * Read agent tracking to get spawn/completion counts
 */
function getAgentCounts(directory: string): { spawned: number; completed: number } {
  const trackingPath = path.join(directory, '.omc', 'state', 'subagent-tracking.json');

  if (!fs.existsSync(trackingPath)) {
    return { spawned: 0, completed: 0 };
  }

  try {
    const content = fs.readFileSync(trackingPath, 'utf-8');
    const tracking = JSON.parse(content);

    const spawned = tracking.agents?.length || 0;
    const completed = tracking.agents?.filter((a: any) => a.status === 'completed').length || 0;

    return { spawned, completed };
  } catch (error) {
    return { spawned: 0, completed: 0 };
  }
}

/**
 * Detect which modes were used during the session
 */
function getModesUsed(directory: string): string[] {
  const stateDir = path.join(directory, '.omc', 'state');
  const modes: string[] = [];

  if (!fs.existsSync(stateDir)) {
    return modes;
  }

  const modeStateFiles = [
    { file: 'autopilot-state.json', mode: 'autopilot' },
    { file: 'ultrapilot-state.json', mode: 'ultrapilot' },
    { file: 'ralph-state.json', mode: 'ralph' },
    { file: 'ultrawork-state.json', mode: 'ultrawork' },
    { file: 'ecomode-state.json', mode: 'ecomode' },
    { file: 'swarm-state.json', mode: 'swarm' },
    { file: 'pipeline-state.json', mode: 'pipeline' },
  ];

  for (const { file, mode } of modeStateFiles) {
    const statePath = path.join(stateDir, file);
    if (fs.existsSync(statePath)) {
      modes.push(mode);
    }
  }

  return modes;
}

/**
 * Get session start time from state files
 */
function getSessionStartTime(directory: string): string | undefined {
  const stateDir = path.join(directory, '.omc', 'state');

  if (!fs.existsSync(stateDir)) {
    return undefined;
  }

  const stateFiles = fs.readdirSync(stateDir).filter(f => f.endsWith('.json'));

  for (const file of stateFiles) {
    try {
      const statePath = path.join(stateDir, file);
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);

      if (state.started_at) {
        return state.started_at;
      }
    } catch (error) {
      continue;
    }
  }

  return undefined;
}

/**
 * Record session metrics
 */
export function recordSessionMetrics(directory: string, input: SessionEndInput): SessionMetrics {
  const endedAt = new Date().toISOString();
  const startedAt = getSessionStartTime(directory);
  const { spawned, completed } = getAgentCounts(directory);
  const modesUsed = getModesUsed(directory);

  const metrics: SessionMetrics = {
    session_id: input.session_id,
    started_at: startedAt,
    ended_at: endedAt,
    reason: input.reason,
    agents_spawned: spawned,
    agents_completed: completed,
    modes_used: modesUsed,
  };

  // Calculate duration if start time is available
  if (startedAt) {
    try {
      const startTime = new Date(startedAt).getTime();
      const endTime = new Date(endedAt).getTime();
      metrics.duration_ms = endTime - startTime;
    } catch (error) {
      // Invalid date, skip duration
    }
  }

  return metrics;
}

/**
 * Clean up transient state files
 */
export function cleanupTransientState(directory: string): number {
  let filesRemoved = 0;
  const omcDir = path.join(directory, '.omc');

  if (!fs.existsSync(omcDir)) {
    return filesRemoved;
  }

  // Remove transient agent tracking
  const trackingPath = path.join(omcDir, 'state', 'subagent-tracking.json');
  if (fs.existsSync(trackingPath)) {
    try {
      fs.unlinkSync(trackingPath);
      filesRemoved++;
    } catch (error) {
      // Ignore removal errors
    }
  }

  // Clean stale checkpoints (older than 24 hours)
  const checkpointsDir = path.join(omcDir, 'checkpoints');
  if (fs.existsSync(checkpointsDir)) {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    try {
      const files = fs.readdirSync(checkpointsDir);
      for (const file of files) {
        const filePath = path.join(checkpointsDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtimeMs < oneDayAgo) {
          fs.unlinkSync(filePath);
          filesRemoved++;
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  // Remove .tmp files in .omc/
  const removeTmpFiles = (dir: string) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          removeTmpFiles(fullPath);
        } else if (entry.name.endsWith('.tmp')) {
          fs.unlinkSync(fullPath);
          filesRemoved++;
        }
      }
    } catch (error) {
      // Ignore errors
    }
  };

  removeTmpFiles(omcDir);

  return filesRemoved;
}

/**
 * Mode state files that should be cleaned up on session end.
 * These files track active execution modes that should not persist across sessions.
 */
const MODE_STATE_FILES = [
  { file: 'autopilot-state.json', mode: 'autopilot' },
  { file: 'ultrapilot-state.json', mode: 'ultrapilot' },
  { file: 'ralph-state.json', mode: 'ralph' },
  { file: 'ultrawork-state.json', mode: 'ultrawork' },
  { file: 'ecomode-state.json', mode: 'ecomode' },
  { file: 'ultraqa-state.json', mode: 'ultraqa' },
  { file: 'pipeline-state.json', mode: 'pipeline' },
  // Swarm uses marker file + SQLite
  { file: 'swarm-active.marker', mode: 'swarm' },
  { file: 'swarm-summary.json', mode: 'swarm' },
];

/**
 * Clean up mode state files on session end.
 *
 * This prevents stale state from causing the stop hook to malfunction
 * in subsequent sessions. When a session ends normally, all mode states
 * belonging to this session should be removed - regardless of active status.
 *
 * Files with `active: false` are already completed/cancelled modes that
 * have no reason to persist. Files with `active: true` are modes that
 * were interrupted by session end and should also be cleaned up.
 *
 * @param directory - The project directory
 * @param sessionId - Optional session ID to match. Only cleans states belonging to this session.
 * @returns Object with counts of files removed and modes cleaned
 */
export function cleanupModeStates(directory: string, sessionId?: string): { filesRemoved: number; modesCleaned: string[] } {
  let filesRemoved = 0;
  const modesCleaned: string[] = [];
  const stateDir = path.join(directory, '.omc', 'state');

  if (!fs.existsSync(stateDir)) {
    return { filesRemoved, modesCleaned };
  }

  for (const { file, mode } of MODE_STATE_FILES) {
    const localPath = path.join(stateDir, file);

    if (fs.existsSync(localPath)) {
      try {
        // For JSON files, check session ownership before removing
        if (file.endsWith('.json')) {
          const content = fs.readFileSync(localPath, 'utf-8');
          const state = JSON.parse(content);

          // Session isolation: only clean states belonging to this session
          // - If sessionId is not provided, clean all states (force cleanup)
          // - If state has no session_id, it's legacy - clean it
          // - If state.session_id matches our sessionId, clean it
          // Note: We remove regardless of active status (fixes #403)
          const stateSessionId = state.session_id as string | undefined;
          if (!sessionId || !stateSessionId || stateSessionId === sessionId) {
            fs.unlinkSync(localPath);
            filesRemoved++;
            if (!modesCleaned.includes(mode)) {
              modesCleaned.push(mode);
            }
          }
        } else {
          // For marker files, always remove (they don't have session isolation)
          fs.unlinkSync(localPath);
          filesRemoved++;
          if (!modesCleaned.includes(mode)) {
            modesCleaned.push(mode);
          }
        }
      } catch {
        // Ignore errors, continue with other files
      }
    }
  }

  return { filesRemoved, modesCleaned };
}

/**
 * Export session summary to .omc/sessions/
 */
export function exportSessionSummary(directory: string, metrics: SessionMetrics): void {
  const sessionsDir = path.join(directory, '.omc', 'sessions');

  // Create sessions directory if it doesn't exist
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
  }

  // Write session summary
  const sessionFile = path.join(sessionsDir, `${metrics.session_id}.json`);

  try {
    fs.writeFileSync(sessionFile, JSON.stringify(metrics, null, 2), 'utf-8');
  } catch (error) {
    // Ignore write errors
  }
}

/**
 * Process session end
 */
export function processSessionEnd(input: SessionEndInput): HookOutput {
  // Record and export session metrics to disk
  const metrics = recordSessionMetrics(input.cwd, input);
  exportSessionSummary(input.cwd, metrics);

  // Clean up transient state files
  cleanupTransientState(input.cwd);

  // Clean up mode state files to prevent stale state issues
  // This ensures the stop hook won't malfunction in subsequent sessions
  // Pass session_id to only clean up this session's states
  cleanupModeStates(input.cwd, input.session_id);

  // Return simple response - metrics are persisted to .omc/sessions/
  return { continue: true };
}

/**
 * Stale state threshold (24 hours).
 * State files older than this from a different session are considered stale
 * and are removed on session start as a safety net for abnormal terminations.
 */
const STALE_STATE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Clean up stale mode state files from previous sessions.
 *
 * This is a safety net for cases where SessionEnd hook never fired
 * (crash, SIGINT, force quit). Called on session start to ensure
 * a clean environment.
 *
 * Only removes state files that:
 * 1. Belong to a DIFFERENT session (never cleans current session's state)
 * 2. Are older than 24 hours (avoids race conditions with concurrent sessions)
 *
 * @param directory - The project directory
 * @param currentSessionId - The current session's ID (will NOT be cleaned)
 * @returns Object with counts of files removed and modes cleaned
 */
export function cleanupStaleStates(directory: string, currentSessionId: string): { filesRemoved: number; modesCleaned: string[] } {
  let filesRemoved = 0;
  const modesCleaned: string[] = [];
  const stateDir = path.join(directory, '.omc', 'state');

  if (!fs.existsSync(stateDir)) {
    return { filesRemoved, modesCleaned };
  }

  const now = Date.now();

  for (const { file, mode } of MODE_STATE_FILES) {
    const localPath = path.join(stateDir, file);

    if (!fs.existsSync(localPath)) {
      continue;
    }

    try {
      if (file.endsWith('.json')) {
        const content = fs.readFileSync(localPath, 'utf-8');
        const state = JSON.parse(content);
        const stateSessionId = state.session_id as string | undefined;

        // Never clean current session's state
        if (stateSessionId === currentSessionId) {
          continue;
        }

        // Check file age - only remove if older than threshold
        const stats = fs.statSync(localPath);
        const ageMs = now - stats.mtimeMs;

        if (ageMs > STALE_STATE_THRESHOLD_MS) {
          fs.unlinkSync(localPath);
          filesRemoved++;
          if (!modesCleaned.includes(mode)) {
            modesCleaned.push(mode);
          }
        }
      } else {
        // Marker files: check age only
        const stats = fs.statSync(localPath);
        const ageMs = now - stats.mtimeMs;

        if (ageMs > STALE_STATE_THRESHOLD_MS) {
          fs.unlinkSync(localPath);
          filesRemoved++;
          if (!modesCleaned.includes(mode)) {
            modesCleaned.push(mode);
          }
        }
      }
    } catch {
      // Ignore errors, continue with other files
    }
  }

  return { filesRemoved, modesCleaned };
}

/**
 * Main hook entry point
 */
export async function handleSessionEnd(input: SessionEndInput): Promise<HookOutput> {
  return processSessionEnd(input);
}
