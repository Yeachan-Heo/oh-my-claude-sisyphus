/**
 * Comprehensive test for background task management
 * Run with: npx tsx test-background-tasks.ts
 */

import {
  createOmcSession,
  shouldRunInBackground,
  DEFAULT_MAX_BACKGROUND_TASKS,
  LONG_RUNNING_PATTERNS,
  BLOCKING_PATTERNS,
} from './dist/index.js';

// Test colors for output
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const blue = (s: string) => `\x1b[34m${s}\x1b[0m`;

let testsPassed = 0;
let testsFailed = 0;

function test(name: string, fn: () => boolean | void) {
  try {
    const result = fn();
    if (result === false) {
      console.log(red(`✗ ${name}`));
      testsFailed++;
    } else {
      console.log(green(`✓ ${name}`));
      testsPassed++;
    }
  } catch (e) {
    console.log(red(`✗ ${name}`));
    console.log(red(`  Error: ${e}`));
    testsFailed++;
  }
}

function assertEqual<T>(actual: T, expected: T, msg?: string): boolean {
  if (actual !== expected) {
    console.log(red(`  Expected: ${expected}, Got: ${actual}${msg ? ` (${msg})` : ''}`));
    return false;
  }
  return true;
}

console.log(blue('\n═══════════════════════════════════════════════════════════'));
console.log(blue('  Background Task Management Tests'));
console.log(blue('═══════════════════════════════════════════════════════════\n'));

// ============================================
// Test 1: Pattern Detection - Long Running Commands
// ============================================
console.log(yellow('\n▸ Testing Long-Running Pattern Detection\n'));

const longRunningCommands = [
  'npm install',
  'npm ci',
  'yarn install',
  'pnpm install',
  'pip install requests',
  'cargo build',
  'cargo test',
  'go build ./...',
  'npm run build',
  'npm run test',
  'make all',
  'docker build -t myapp .',
  'docker pull nginx',
  'git clone https://github.com/example/repo.git',
  'pytest tests/',
  'jest --coverage',
  'vitest',
  'prisma migrate deploy',
  'webpack --mode production',
];

for (const cmd of longRunningCommands) {
  test(`Long-running: "${cmd}" should run in background`, () => {
    const decision = shouldRunInBackground(cmd);
    return assertEqual(decision.runInBackground, true, cmd);
  });
}

// ============================================
// Test 2: Pattern Detection - Quick/Blocking Commands
// ============================================
console.log(yellow('\n▸ Testing Blocking Pattern Detection\n'));

const blockingCommands = [
  'ls -la',
  'pwd',
  'cat file.txt',
  'echo "hello"',
  'git status',
  'git diff',
  'git log --oneline -5',
  'head -10 file.txt',
  'tail -20 log.txt',
  'which node',
  'env',
  'cp src dest',
  'mv old new',
  'mkdir newdir',
];

for (const cmd of blockingCommands) {
  test(`Blocking: "${cmd}" should NOT run in background`, () => {
    const decision = shouldRunInBackground(cmd);
    return assertEqual(decision.runInBackground, false, cmd);
  });
}

// ============================================
// Test 3: Concurrency Limit Enforcement
// ============================================
console.log(yellow('\n▸ Testing Concurrency Limits\n'));

test('At capacity: should NOT allow background even for long command', () => {
  const decision = shouldRunInBackground('npm install', 5, 5); // at limit
  return assertEqual(decision.runInBackground, false) &&
         decision.reason.includes('limit');
});

test('Under capacity: should allow background for long command', () => {
  const decision = shouldRunInBackground('npm install', 2, 5); // under limit
  return assertEqual(decision.runInBackground, true);
});

test('Default max tasks is 5', () => {
  return assertEqual(DEFAULT_MAX_BACKGROUND_TASKS, 5);
});

// ============================================
// Test 4: TaskExecutionDecision Metadata
// ============================================
console.log(yellow('\n▸ Testing Decision Metadata\n'));

test('Long-running command has high confidence', () => {
  const decision = shouldRunInBackground('npm install');
  return assertEqual(decision.confidence, 'high') &&
         assertEqual(decision.estimatedDuration, 'long');
});

test('Quick command has high confidence', () => {
  const decision = shouldRunInBackground('ls -la');
  return assertEqual(decision.confidence, 'high') &&
         assertEqual(decision.estimatedDuration, 'quick');
});

test('Unknown command has low confidence', () => {
  const decision = shouldRunInBackground('some-unknown-command --flag');
  return assertEqual(decision.confidence, 'low') &&
         assertEqual(decision.estimatedDuration, 'unknown');
});

// ============================================
// Test 5: BackgroundTaskManager
// ============================================
console.log(yellow('\n▸ Testing BackgroundTaskManager\n'));

test('Session includes BackgroundTaskManager', () => {
  const session = createOmcSession({ skipConfigLoad: true });
  return session.backgroundTasks !== undefined &&
         typeof session.backgroundTasks.registerTask === 'function' &&
         typeof session.backgroundTasks.getTasks === 'function' &&
         typeof session.backgroundTasks.canStartNewTask === 'function';
});

test('Session includes shouldRunInBackground method', () => {
  const session = createOmcSession({ skipConfigLoad: true });
  return typeof session.shouldRunInBackground === 'function';
});

test('Manager tracks registered tasks', () => {
  const session = createOmcSession({ skipConfigLoad: true });
  const task = session.backgroundTasks.registerTask('test-agent', 'test prompt');
  return task.id !== undefined &&
         task.status === 'pending' &&
         session.backgroundTasks.getTasks().length === 1;
});

test('Manager enforces capacity limits', () => {
  const session = createOmcSession({
    skipConfigLoad: true,
    config: { permissions: { maxBackgroundTasks: 2 } }
  });

  // Register 2 tasks
  session.backgroundTasks.registerTask('agent1', 'prompt1');
  session.backgroundTasks.registerTask('agent2', 'prompt2');

  // Should be at capacity
  return assertEqual(session.backgroundTasks.canStartNewTask(), false);
});

test('Manager updates task status', () => {
  const session = createOmcSession({ skipConfigLoad: true });
  const task = session.backgroundTasks.registerTask('test-agent', 'test prompt');

  session.backgroundTasks.completeTask(task.id, 'success result');

  const tasks = session.backgroundTasks.getTasks();
  return tasks[0].status === 'completed' && tasks[0].result === 'success result';
});

test('Manager prunes completed tasks', () => {
  const session = createOmcSession({ skipConfigLoad: true });

  const task1 = session.backgroundTasks.registerTask('agent1', 'prompt1');
  session.backgroundTasks.registerTask('agent2', 'prompt2');

  session.backgroundTasks.completeTask(task1.id, 'done');

  const pruned = session.backgroundTasks.pruneCompletedTasks();

  return pruned === 1 && session.backgroundTasks.getTasks().length === 1;
});

// ============================================
// Test 6: System Prompt Integration
// ============================================
console.log(yellow('\n▸ Testing System Prompt Integration\n'));

test('System prompt includes background task guidance', () => {
  const session = createOmcSession({ skipConfigLoad: true });
  const systemPrompt = session.queryOptions.options.systemPrompt;

  return systemPrompt.includes('Background Task Execution') &&
         systemPrompt.includes('run_in_background') &&
         systemPrompt.includes('TaskOutput');
});

test('System prompt includes concurrency limit info', () => {
  const session = createOmcSession({ skipConfigLoad: true });
  const systemPrompt = session.queryOptions.options.systemPrompt;

  return systemPrompt.includes('Maximum') &&
         systemPrompt.includes('concurrent background tasks');
});

// ============================================
// Test 7: Pattern Coverage
// ============================================
console.log(yellow('\n▸ Testing Pattern Coverage\n'));

test('LONG_RUNNING_PATTERNS array is populated', () => {
  return LONG_RUNNING_PATTERNS.length > 10;
});

test('BLOCKING_PATTERNS array is populated', () => {
  return BLOCKING_PATTERNS.length > 5;
});

// Complex command chain detection
test('Complex piped commands without blocking start suggest background', () => {
  // Note: commands starting with blocking patterns (cat, ls, etc.) will be detected as blocking
  // Only chains that don't start with blocking patterns will be detected as potentially long
  const decision = shouldRunInBackground('find . -name "*.ts" | xargs grep "import" | sort | uniq -c');
  // Has >2 pipes, might be long
  return decision.estimatedDuration === 'medium' || decision.runInBackground === true;
});

test('Commands starting with blocking patterns stay blocking even if piped', () => {
  // cat is a blocking pattern, so this should be blocking
  const decision = shouldRunInBackground('cat log.txt | grep error');
  return decision.runInBackground === false;
});

// ============================================
// Summary
// ============================================
console.log(blue('\n═══════════════════════════════════════════════════════════'));
console.log(blue('  Test Summary'));
console.log(blue('═══════════════════════════════════════════════════════════\n'));

console.log(`${green(`Passed: ${testsPassed}`)}`);
console.log(`${testsFailed > 0 ? red(`Failed: ${testsFailed}`) : green(`Failed: ${testsFailed}`)}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
  console.log(red('\n✗ Some tests failed!\n'));
  process.exit(1);
} else {
  console.log(green('\n✓ All tests passed!\n'));
  process.exit(0);
}
