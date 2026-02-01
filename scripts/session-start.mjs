#!/usr/bin/env node

/**
 * Sisyphus Session Start Hook (Node.js)
 * Restores persistent mode states when session starts
 * Cross-platform: Windows, macOS, Linux
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

// Read all stdin
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// Read JSON file safely
function readJsonFile(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

// Count incomplete todos
function countIncompleteTodos(todosDir) {
  let count = 0;
  if (existsSync(todosDir)) {
    try {
      const files = readdirSync(todosDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const todos = readJsonFile(join(todosDir, file));
        if (Array.isArray(todos)) {
          count += todos.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
        }
      }
    } catch {}
  }
  return count;
}

// Get git worktrees for current repo
function getWorktrees(directory) {
  try {
    const output = execSync('git worktree list --porcelain', {
      cwd: directory,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();

    if (!output) return [];

    const worktrees = [];
    let currentPath = '';
    let currentBranch = '';

    for (const line of output.split('\n')) {
      if (line.startsWith('worktree ')) {
        currentPath = line.substring('worktree '.length);
      } else if (line.startsWith('branch ')) {
        currentBranch = line.substring('branch '.length).replace('refs/heads/', '');
      } else if (line === '') {
        if (currentPath) {
          worktrees.push({ path: currentPath, branch: currentBranch });
        }
        currentPath = '';
        currentBranch = '';
      }
    }
    if (currentPath) {
      worktrees.push({ path: currentPath, branch: currentBranch });
    }
    return worktrees;
  } catch {
    return [];
  }
}

// Check if HUD is properly installed
function checkHudInstallation() {
  const hudScript = join(homedir(), '.claude', 'hud', 'omc-hud.mjs');
  const settingsFile = join(homedir(), '.claude', 'settings.json');

  // Check if HUD script exists
  if (!existsSync(hudScript)) {
    return { installed: false, reason: 'HUD script missing' };
  }

  // Check if statusLine is configured
  try {
    if (existsSync(settingsFile)) {
      const settings = JSON.parse(readFileSync(settingsFile, 'utf-8'));
      if (!settings.statusLine) {
        return { installed: false, reason: 'statusLine not configured' };
      }
    } else {
      return { installed: false, reason: 'settings.json missing' };
    }
  } catch {
    return { installed: false, reason: 'Could not read settings' };
  }

  return { installed: true };
}

// Main
async function main() {
  try {
    const input = await readStdin();
    let data = {};
    try { data = JSON.parse(input); } catch {}

    const directory = data.directory || process.cwd();
    const messages = [];

    // Check HUD installation (one-time setup guidance)
    const hudCheck = checkHudInstallation();
    if (!hudCheck.installed) {
      messages.push(`<system-reminder>
[Sisyphus] HUD not configured (${hudCheck.reason}). Run /hud setup then restart Claude Code.
</system-reminder>`);
    }

    // Worktree isolation awareness
    const worktrees = getWorktrees(directory);
    if (worktrees.length > 1) {
      const currentWorktree = worktrees.find(wt => wt.path === directory);
      const siblingWorktrees = worktrees.filter(wt => wt.path !== directory);

      messages.push(`<system-reminder>
[WORKTREE ISOLATION ACTIVE]

Current worktree: ${directory} (${currentWorktree?.branch || 'unknown'})

Other worktrees detected (DO NOT MODIFY):
${siblingWorktrees.map(wt => `- ${wt.path} (${wt.branch})`).join('\n')}

RULE: Only modify files within your current worktree. Other worktrees are managed by separate terminal sessions.
</system-reminder>`);
    }

    // Check for ultrawork state
    const ultraworkState = readJsonFile(join(directory, '.omc', 'state', 'ultrawork-state.json'))
      || readJsonFile(join(homedir(), '.omc', 'state', 'ultrawork-state.json'));

    if (ultraworkState?.active) {
      messages.push(`<session-restore>

[ULTRAWORK MODE RESTORED]

You have an active ultrawork session from ${ultraworkState.started_at}.
Original task: ${ultraworkState.original_prompt}

Continue working in ultrawork mode until all tasks are complete.

</session-restore>

---
`);
    }

    // Check for ralph loop state
    const ralphState = readJsonFile(join(directory, '.omc', 'state', 'ralph-state.json'));
    if (ralphState?.active) {
      messages.push(`<session-restore>

[RALPH LOOP RESTORED]

You have an active ralph-loop session.
Original task: ${ralphState.prompt || 'Task in progress'}
Iteration: ${ralphState.iteration || 1}/${ralphState.max_iterations || 10}

Continue working until the task is verified complete.

</session-restore>

---
`);
    }

    // Check for incomplete todos
    const todosDir = join(homedir(), '.claude', 'todos');
    const incompleteCount = countIncompleteTodos(todosDir);

    if (incompleteCount > 0) {
      messages.push(`<session-restore>

[PENDING TASKS DETECTED]

You have ${incompleteCount} incomplete tasks from a previous session.
Please continue working on these tasks.

</session-restore>

---
`);
    }

    // Check for notepad Priority Context
    const notepadPath = join(directory, '.omc', 'notepad.md');
    if (existsSync(notepadPath)) {
      try {
        const notepadContent = readFileSync(notepadPath, 'utf-8');
        const priorityMatch = notepadContent.match(/## Priority Context\n([\s\S]*?)(?=## |$)/);
        if (priorityMatch && priorityMatch[1].trim()) {
          const priorityContext = priorityMatch[1].trim();
          // Only inject if there's actual content (not just the placeholder comment)
          const cleanContent = priorityContext.replace(/<!--[\s\S]*?-->/g, '').trim();
          if (cleanContent) {
            messages.push(`<notepad-context>
[NOTEPAD - Priority Context]
${cleanContent}
</notepad-context>`);
          }
        }
      } catch (err) {
        // Silently ignore notepad read errors
      }
    }

    if (messages.length > 0) {
      console.log(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: messages.join('\n')
        }
      }));
    } else {
      console.log(JSON.stringify({ continue: true }));
    }
  } catch (error) {
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
