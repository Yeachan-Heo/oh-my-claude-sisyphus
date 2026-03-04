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

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

// ─── Config ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000;  // 30 seconds
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';

// Working directory: prefer --watch-dir arg, then cwd
const watchDirArg = process.argv.indexOf('--watch-dir');
const PROJECT_DIR = resolve(
  watchDirArg !== -1 ? process.argv[watchDirArg + 1] : process.cwd()
);

const OMC_STATE_DIR = join(PROJECT_DIR, '.omc', 'state');
const TASKS_FILE    = join(OMC_STATE_DIR, 'scheduled-tasks.json');
const LOG_DIR       = join(PROJECT_DIR, '.omc', 'logs', 'scheduled');

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

function writeTasks(tasks) {
  mkdirSync(OMC_STATE_DIR, { recursive: true });
  writeFileSync(TASKS_FILE, JSON.stringify({ tasks }, null, 2), 'utf8');
}

function sendNotification(title, body) {
  // Try OMC notification hook if available (Discord/Telegram/Slack).
  // Falls back to macOS/Linux system notification.
  try {
    const hook = join(PROJECT_DIR, '.omc', 'state', 'notification-config.json');
    if (existsSync(hook)) {
      // OMC notification infrastructure — best-effort
      execSync(
        `node "${resolve(import.meta.dirname, 'send-notification.mjs')}" ` +
        `--title "${title.replace(/"/g, '\\"')}" ` +
        `--body "${body.replace(/"/g, '\\"')}"`,
        { stdio: 'ignore', timeout: 10_000 }
      );
      return;
    }
  } catch { /* ignore */ }

  // macOS fallback
  try {
    execSync(
      `osascript -e 'display notification "${body.replace(/'/g, '')}" with title "${title.replace(/'/g, '')}"'`,
      { stdio: 'ignore', timeout: 5_000 }
    );
  } catch { /* non-critical */ }

  // Linux fallback
  try {
    execSync(`notify-send "${title}" "${body}"`, { stdio: 'ignore', timeout: 5_000 });
  } catch { /* non-critical */ }
}

// ─── Task runner ──────────────────────────────────────────────────────────────

function runTask(task) {
  mkdirSync(LOG_DIR, { recursive: true });
  const logFile = join(LOG_DIR, `${task.id}.log`);
  const startedAt = new Date().toISOString();

  log(`Running task ${task.id}: "${task.prompt.slice(0, 60)}..."`);

  const header = [
    `# omc-schedule task: ${task.id}`,
    `# Prompt: ${task.prompt}`,
    `# Directory: ${task.workingDirectory}`,
    `# Started: ${startedAt}`,
    '',
  ].join('\n');
  writeFileSync(logFile, header, 'utf8');

  return new Promise((resolve) => {
    const child = spawn(
      CLAUDE_BIN,
      ['-p', task.prompt, '--dangerously-skip-permissions'],
      {
        cwd: task.workingDirectory,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    const logStream = require('fs').createWriteStream(logFile, { flags: 'a' });

    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);
    child.stdout.on('data', (d) => process.stdout.write(d));
    child.stderr.on('data', (d) => process.stderr.write(d));

    child.on('close', (code) => {
      const finishedAt = new Date().toISOString();
      const footer = `\n\n# Finished: ${finishedAt} — exit code: ${code}\n`;
      writeFileSync(logFile, footer, { flag: 'a' });

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
    writeTasks(updated);
    running.add(task.id);

    // Run asynchronously (don't block the poll loop)
    runTask(task).then(({ code }) => {
      running.delete(task.id);
      const afterRun = readTasks();
      const final = afterRun.map(t =>
        t.id === task.id
          ? { ...t, status: code === 0 ? 'completed' : 'failed', finishedAt: new Date().toISOString() }
          : t
      );
      writeTasks(final);
    }).catch((err) => {
      running.delete(task.id);
      log(`Task ${task.id} threw: ${err.message}`);
      const afterRun = readTasks();
      const final = afterRun.map(t =>
        t.id === task.id ? { ...t, status: 'failed', error: err.message } : t
      );
      writeTasks(final);
    });
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

log(`omc-schedule daemon started`);
log(`Watching: ${TASKS_FILE}`);
log(`Log dir:  ${LOG_DIR}`);
log(`Poll interval: ${POLL_INTERVAL_MS / 1000}s`);

// Run immediately, then on interval
poll();
setInterval(poll, POLL_INTERVAL_MS);

// Graceful shutdown
process.on('SIGINT',  () => { log('Shutting down (SIGINT)');  process.exit(0); });
process.on('SIGTERM', () => { log('Shutting down (SIGTERM)'); process.exit(0); });
