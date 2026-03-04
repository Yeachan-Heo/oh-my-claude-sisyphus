#!/usr/bin/env node
/**
 * omc-schedule daemon
 *
 * Polls .omc/state/scheduled-tasks.json every 30 seconds.
 * When a task is due, runs:
 *   claude -p "<prompt>" --dangerously-skip-permissions
 * in the task's working directory, then saves the output to
 * .omc/logs/scheduled/<task-id>.log and fires OMC notifications.
 *
 * Start via tmux:
 *   tmux new-session -d -s omc-sched-daemon "node schedule-daemon.mjs --watch-dir /path/to/project"
 */

import { spawnSync, spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, createWriteStream } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

// ─── Config ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000;  // 30 seconds
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';

// Working directory: prefer --watch-dir arg, then cwd
const watchDirArg = process.argv.indexOf('--watch-dir');
if (watchDirArg !== -1 && !process.argv[watchDirArg + 1]) {
  console.error('Error: --watch-dir requires a path argument');
  process.exit(1);
}
const PROJECT_DIR = resolve(
  watchDirArg !== -1 ? process.argv[watchDirArg + 1] : process.cwd()
);

const OMC_STATE_DIR = join(PROJECT_DIR, '.omc', 'state');
const TASKS_FILE    = join(OMC_STATE_DIR, 'scheduled-tasks.json');
const LOG_DIR       = join(PROJECT_DIR, '.omc', 'logs', 'scheduled');
const OMC_CONFIG    = join(homedir(), '.claude', '.omc-config.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[omc-sched ${ts}] ${msg}`);
}

function readTasks() {
  if (!existsSync(TASKS_FILE)) return [];
  try {
    const raw = readFileSync(TASKS_FILE, 'utf8');
    return JSON.parse(raw).tasks ?? [];
  } catch {
    return [];
  }
}

// Serialized write queue — prevents concurrent read-modify-write races
let writeLock = Promise.resolve();
function writeTasks(tasks) {
  writeLock = writeLock.then(() => {
    mkdirSync(OMC_STATE_DIR, { recursive: true });
    writeFileSync(TASKS_FILE, JSON.stringify({ tasks }, null, 2), 'utf8');
  });
  return writeLock;
}

function sendNotification(title, body) {
  // Try OMC notification config (~/.claude/.omc-config.json)
  try {
    if (existsSync(OMC_CONFIG)) {
      const cfg = JSON.parse(readFileSync(OMC_CONFIG, 'utf8'));
      const n = cfg.notifications ?? {};
      if (n.telegram?.enabled && n.telegram?.botToken && n.telegram?.chatId) {
        // Telegram: plain HTTP, no shell involved
        const payload = JSON.stringify({ chat_id: n.telegram.chatId, text: `${title}\n${body}` });
        spawnSync('curl', [
          '-s', '-X', 'POST',
          `https://api.telegram.org/bot${n.telegram.botToken}/sendMessage`,
          '-H', 'Content-Type: application/json',
          '-d', payload,
        ], { timeout: 10_000 });
        return;
      }
      if (n.discord?.enabled && n.discord?.webhookUrl) {
        const payload = JSON.stringify({ content: `**${title}**\n${body}` });
        spawnSync('curl', [
          '-s', '-X', 'POST', n.discord.webhookUrl,
          '-H', 'Content-Type: application/json',
          '-d', payload,
        ], { timeout: 10_000 });
        return;
      }
    }
  } catch { /* ignore — fall through to system notifications */ }

  // macOS fallback — use spawnSync to avoid shell injection
  try {
    spawnSync('osascript', [
      '-e', `display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)}`,
    ], { timeout: 5_000 });
  } catch { /* non-critical */ }

  // Linux fallback — use spawnSync argument array, no shell involved
  try {
    spawnSync('notify-send', [title, body], { timeout: 5_000 });
  } catch { /* non-critical */ }
}

// ─── Task runner ──────────────────────────────────────────────────────────────

function runTask(task) {
  mkdirSync(LOG_DIR, { recursive: true });
  const logFile = join(LOG_DIR, `${task.id}.log`);
  const startedAt = new Date().toISOString();

  log(`Running task ${task.id}: "${task.prompt.slice(0, 60)}..."`);

  // Validate working directory exists before spawning
  if (!existsSync(task.workingDirectory)) {
    return Promise.reject(
      new Error(`workingDirectory not found: ${task.workingDirectory}`)
    );
  }

  return new Promise((resolve, reject) => {
    // Open log stream first, write header through it
    const logStream = createWriteStream(logFile, { flags: 'w' });
    logStream.write([
      `# omc-schedule task: ${task.id}`,
      `# Prompt: ${task.prompt}`,
      `# Directory: ${task.workingDirectory}`,
      `# Started: ${startedAt}`,
      '',
    ].join('\n'));

    const child = spawn(
      CLAUDE_BIN,
      ['-p', task.prompt, '--dangerously-skip-permissions'],
      {
        cwd: task.workingDirectory,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    child.on('error', (err) => {
      logStream.end(`\n# Spawn error: ${err.message}\n`);
      reject(new Error(`Failed to spawn ${CLAUDE_BIN}: ${err.message}`));
    });

    child.stdout.pipe(logStream, { end: false });
    child.stderr.pipe(logStream, { end: false });
    child.stdout.on('data', (d) => process.stdout.write(d));
    child.stderr.on('data', (d) => process.stderr.write(d));

    child.on('close', (code) => {
      const finishedAt = new Date().toISOString();
      logStream.end(`\n\n# Finished: ${finishedAt} — exit code: ${code}\n`);

      if (code === 0) {
        log(`Task ${task.id} completed successfully`);
        sendNotification(
          'omc-schedule: Task complete ✅',
          `"${task.prompt.slice(0, 80)}" finished. Log: ${logFile}`
        );
      } else {
        log(`Task ${task.id} failed (exit ${code})`);
        sendNotification(
          'omc-schedule: Task failed ❌',
          `"${task.prompt.slice(0, 80)}" exited ${code}. Log: ${logFile}`
        );
      }
      resolve({ code, logFile });
    });
  });
}

// ─── Startup recovery ─────────────────────────────────────────────────────────

function recoverOrphanedTasks() {
  const tasks = readTasks();
  const orphans = tasks.filter(t => t.status === 'running');
  if (orphans.length === 0) return;

  log(`Recovering ${orphans.length} orphaned task(s) left in 'running' state from previous daemon`);
  const recovered = tasks.map(t =>
    t.status === 'running'
      ? { ...t, status: 'failed', error: 'daemon restarted while running', finishedAt: new Date().toISOString() }
      : t
  );
  writeTasks(recovered);
}

// ─── Poll loop ────────────────────────────────────────────────────────────────

const running = new Set(); // task IDs currently executing

async function poll() {
  const now = Math.floor(Date.now() / 1000);
  const tasks = readTasks();
  const pending = tasks.filter(t => t.status === 'pending');

  for (const task of pending) {
    if (task.scheduledAt > now) continue;         // not yet due
    if (running.has(task.id)) continue;           // already running

    // Mark as running in the JSON immediately (prevents double-execution)
    const updated = tasks.map(t =>
      t.id === task.id ? { ...t, status: 'running', startedAt: new Date().toISOString() } : t
    );
    await writeTasks(updated);
    running.add(task.id);

    // Run asynchronously (don't block the poll loop)
    runTask(task).then(async ({ code }) => {
      running.delete(task.id);
      const afterRun = readTasks();
      const final = afterRun.map(t =>
        t.id === task.id
          ? { ...t, status: code === 0 ? 'completed' : 'failed', finishedAt: new Date().toISOString() }
          : t
      );
      await writeTasks(final);
    }).catch(async (err) => {
      running.delete(task.id);
      log(`Task ${task.id} threw: ${err.message}`);
      const afterRun = readTasks();
      const final = afterRun.map(t =>
        t.id === task.id ? { ...t, status: 'failed', error: err.message, finishedAt: new Date().toISOString() } : t
      );
      await writeTasks(final);
    });
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

log(`omc-schedule daemon started`);
log(`Watching: ${TASKS_FILE}`);
log(`Log dir:  ${LOG_DIR}`);
log(`Poll interval: ${POLL_INTERVAL_MS / 1000}s`);

// Recover tasks left in 'running' state from a previous daemon crash
recoverOrphanedTasks();

// Run immediately, then on interval
poll();
setInterval(poll, POLL_INTERVAL_MS);

// Graceful shutdown — wait for in-flight tasks
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`Shutting down (${signal})`);
  if (running.size > 0) {
    log(`Waiting for ${running.size} in-flight task(s)...`);
    const deadline = Date.now() + 30_000;
    while (running.size > 0 && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 500));
    }
    if (running.size > 0) {
      log(`Timeout reached — ${running.size} task(s) still running (will be recovered on next start)`);
    }
  }
  process.exit(0);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
