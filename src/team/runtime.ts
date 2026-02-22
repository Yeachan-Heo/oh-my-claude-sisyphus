import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { CliAgentType } from './model-contract.js';
import { buildWorkerCommand, validateCliAvailable, getWorkerEnv as getModelWorkerEnv } from './model-contract.js';
import {
  createTeamSession, spawnWorkerInPane, sendToWorker,
  waitForWorkerReady, isWorkerAlive, killTeamSession,
  type TeamSession, type WorkerPaneConfig,
} from './tmux-session.js';
import {
  generateWorkerOverlay, composeInitialInbox, ensureWorkerStateDir, writeWorkerOverlay,
} from './worker-bootstrap.js';

export interface TeamConfig {
  teamName: string;
  workerCount: number;
  agentTypes: CliAgentType[];
  tasks: Array<{ subject: string; description: string; }>;
  cwd: string;
}

export interface TeamRuntime {
  teamName: string;
  sessionName: string;
  config: TeamConfig;
  workerNames: string[];
  workerPaneIds: string[];
  cwd: string;
}

export interface WorkerStatus {
  workerName: string;
  alive: boolean;
  paneId: string;
  currentTaskId?: string;
  lastHeartbeat?: string;
  stalled: boolean;
}

export interface TeamSnapshot {
  teamName: string;
  phase: string;
  workers: WorkerStatus[];
  taskCounts: { pending: number; inProgress: number; completed: number; failed: number; };
  deadWorkers: string[];
}

function workerName(index: number): string {
  return `worker-${index + 1}`;
}

function stateRoot(cwd: string, teamName: string): string {
  return join(cwd, `.omc/state/team/${teamName}`);
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(join(filePath, '..'), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function readJsonSafe<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Start a new team: create tmux session, spawn workers, wait for ready.
 */
export async function startTeam(config: TeamConfig): Promise<TeamRuntime> {
  const { teamName, workerCount, agentTypes, tasks, cwd } = config;

  // Validate CLIs are available
  for (const agentType of [...new Set(agentTypes)]) {
    validateCliAvailable(agentType);
  }

  const root = stateRoot(cwd, teamName);
  await mkdir(join(root, 'tasks'), { recursive: true });
  await mkdir(join(root, 'mailbox'), { recursive: true });

  // Write config
  await writeJson(join(root, 'config.json'), config);

  // Create task files
  for (let i = 0; i < tasks.length; i++) {
    const taskId = String(i + 1);
    await writeJson(join(root, 'tasks', `${taskId}.json`), {
      id: taskId,
      subject: tasks[i].subject,
      description: tasks[i].description,
      status: 'pending',
      owner: null,
      result: null,
      createdAt: new Date().toISOString(),
    });
  }

  // Set up worker state dirs and overlays
  const workerNames: string[] = [];
  for (let i = 0; i < workerCount; i++) {
    const wName = workerName(i);
    workerNames.push(wName);
    const agentType = agentTypes[i] ?? agentTypes[0] ?? 'claude';
    await ensureWorkerStateDir(teamName, wName, cwd);
    await writeWorkerOverlay({
      teamName, workerName: wName, agentType,
      tasks: tasks.map((t, idx) => ({ id: String(idx + 1), subject: t.subject, description: t.description })),
      cwd,
    });
    await composeInitialInbox(teamName, wName,
      `# Welcome, ${wName}\n\nRead your AGENTS.md overlay at .omc/state/team/${teamName}/workers/${wName}/AGENTS.md\n\nWrite your ready sentinel first, then claim tasks from .omc/state/team/${teamName}/tasks/`,
      cwd,
    );
  }

  // Create tmux session with split panes
  const session: TeamSession = await createTeamSession(teamName, workerCount, cwd);

  // Spawn CLI agents in each pane
  for (let i = 0; i < workerCount; i++) {
    const wName = workerNames[i];
    const agentType = agentTypes[i] ?? agentTypes[0] ?? 'claude';
    const paneId = session.workerPaneIds[i];
    const envVars = getModelWorkerEnv(teamName, wName, agentType);
    const launchCmd = buildWorkerCommand(agentType, { teamName, workerName: wName, cwd });
    const paneConfig: WorkerPaneConfig = { teamName, workerName: wName, envVars, launchCmd, cwd };
    await spawnWorkerInPane(session.sessionName, paneId, paneConfig);
  }

  // Wait for all workers to be ready (sentinel file polling)
  const readyResults = await Promise.all(
    workerNames.map((wName) => waitForWorkerReady(teamName, wName, cwd, 30_000))
  );

  const notReady = workerNames.filter((_, i) => !readyResults[i]);
  if (notReady.length > 0) {
    console.warn(`[runtime] Workers not ready within 30s: ${notReady.join(', ')}`);
  }

  return {
    teamName,
    sessionName: session.sessionName,
    config,
    workerNames,
    workerPaneIds: session.workerPaneIds,
    cwd,
  };
}

/**
 * Monitor team: poll worker health, detect stalls, return snapshot.
 */
export async function monitorTeam(teamName: string, cwd: string, workerPaneIds: string[]): Promise<TeamSnapshot> {
  const root = stateRoot(cwd, teamName);

  // Read task counts
  const taskCounts = { pending: 0, inProgress: 0, completed: 0, failed: 0 };
  try {
    const { readdir } = await import('fs/promises');
    const taskFiles = await readdir(join(root, 'tasks'));
    for (const f of taskFiles.filter(f => f.endsWith('.json'))) {
      const task = await readJsonSafe<{ status: string }>(join(root, 'tasks', f));
      if (task?.status === 'pending') taskCounts.pending++;
      else if (task?.status === 'in_progress') taskCounts.inProgress++;
      else if (task?.status === 'completed') taskCounts.completed++;
      else if (task?.status === 'failed') taskCounts.failed++;
    }
  } catch { /* tasks dir may not exist yet */ }

  // Check worker health
  const workers: WorkerStatus[] = [];
  const deadWorkers: string[] = [];

  for (let i = 0; i < workerPaneIds.length; i++) {
    const wName = `worker-${i + 1}`;
    const paneId = workerPaneIds[i];
    const alive = await isWorkerAlive(paneId);
    const heartbeatPath = join(root, 'workers', wName, 'heartbeat.json');
    const heartbeat = await readJsonSafe<{ updatedAt: string; currentTaskId?: string }>(heartbeatPath);

    // Detect stall: no heartbeat update in 60s
    let stalled = false;
    if (heartbeat?.updatedAt) {
      const age = Date.now() - new Date(heartbeat.updatedAt).getTime();
      stalled = age > 60_000;
    }

    const status: WorkerStatus = {
      workerName: wName,
      alive,
      paneId,
      currentTaskId: heartbeat?.currentTaskId,
      lastHeartbeat: heartbeat?.updatedAt,
      stalled,
    };

    workers.push(status);
    if (!alive) deadWorkers.push(wName);
    if (stalled) console.warn(`[runtime] Worker ${wName} appears stalled (no heartbeat for 60s)`);
  }

  // Infer phase from task counts
  let phase = 'executing';
  if (taskCounts.inProgress === 0 && taskCounts.pending > 0 && taskCounts.completed === 0) {
    phase = 'planning';
  } else if (taskCounts.failed > 0 && taskCounts.pending === 0 && taskCounts.inProgress === 0) {
    phase = 'fixing';
  } else if (taskCounts.completed > 0 && taskCounts.pending === 0 && taskCounts.inProgress === 0 && taskCounts.failed === 0) {
    phase = 'completed';
  }

  return { teamName, phase, workers, taskCounts, deadWorkers };
}

/**
 * Assign a task to a specific worker via inbox + tmux trigger.
 */
export async function assignTask(
  teamName: string,
  taskId: string,
  targetWorkerName: string,
  paneId: string,
  sessionName: string,
  cwd: string
): Promise<void> {
  const root = stateRoot(cwd, teamName);
  const taskPath = join(root, 'tasks', `${taskId}.json`);

  // Update task ownership atomically (using file write — task-file-ops withTaskLock not directly applicable here)
  const task = await readJsonSafe<Record<string, unknown>>(taskPath);
  if (task) {
    task.owner = targetWorkerName;
    task.status = 'in_progress';
    task.assignedAt = new Date().toISOString();
    await writeJson(taskPath, task);
  }

  // Write to worker inbox
  const inboxPath = join(root, 'workers', targetWorkerName, 'inbox.md');
  await mkdir(join(inboxPath, '..'), { recursive: true });
  const msg = `\n\n---\n## New Task Assignment\nTask ID: ${taskId}\nClaim and execute task from: .omc/state/team/${teamName}/tasks/${taskId}.json\n`;
  const { appendFile } = await import('fs/promises');
  await appendFile(inboxPath, msg, 'utf-8');

  // Send tmux trigger
  await sendToWorker(sessionName, paneId, `new-task:${taskId}`);
}

/**
 * Gracefully shut down all workers and clean up.
 */
export async function shutdownTeam(
  teamName: string,
  sessionName: string,
  cwd: string,
  timeoutMs = 30_000
): Promise<void> {
  const root = stateRoot(cwd, teamName);

  // Write shutdown request
  await writeJson(join(root, 'shutdown.json'), {
    requestedAt: new Date().toISOString(),
    teamName,
  });

  // Poll for ACK files (timeout 30s)
  const deadline = Date.now() + timeoutMs;
  const configData = await readJsonSafe<TeamConfig>(join(root, 'config.json'));
  const workerCount = configData?.workerCount ?? 0;
  const expectedAcks = Array.from({ length: workerCount }, (_, i) => `worker-${i + 1}`);

  while (Date.now() < deadline && expectedAcks.length > 0) {
    for (const wName of [...expectedAcks]) {
      const ackPath = join(root, 'workers', wName, 'shutdown-ack.json');
      if (existsSync(ackPath)) {
        expectedAcks.splice(expectedAcks.indexOf(wName), 1);
      }
    }
    if (expectedAcks.length > 0) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Kill tmux session
  await killTeamSession(sessionName);

  // Clean up state
  try {
    await rm(root, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Resume an existing team from persisted state.
 */
export async function resumeTeam(teamName: string, cwd: string): Promise<TeamRuntime | null> {
  const root = stateRoot(cwd, teamName);
  const configData = await readJsonSafe<TeamConfig>(join(root, 'config.json'));
  if (!configData) return null;

  // Check if session is alive
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);
  const sName = `omc-team-${teamName}`;

  try {
    await execFileAsync('tmux', ['has-session', '-t', sName]);
  } catch {
    return null; // Session not alive
  }

  // Read saved pane IDs (if we save them — for now derive from session)
  const panesResult = await execFileAsync('tmux', [
    'list-panes', '-t', sName, '-F', '#{pane_id}'
  ]);
  const allPanes = panesResult.stdout.trim().split('\n').filter(Boolean);
  // First pane is leader, rest are workers
  const workerPaneIds = allPanes.slice(1);
  const workerNames = workerPaneIds.map((_, i) => `worker-${i + 1}`);

  return {
    teamName,
    sessionName: sName,
    config: configData,
    workerNames,
    workerPaneIds,
    cwd,
  };
}
