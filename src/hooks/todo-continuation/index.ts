/**
 * Todo Continuation Enforcer Hook
 *
 * Prevents stopping when incomplete tasks remain in the todo list.
 * Forces the agent to continue until all tasks are marked complete.
 *
 * Ported from oh-my-opencode's todo-continuation-enforcer hook.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: string;
  id?: string;
}

/** New Claude Code Task system task */
export interface Task {
  id: string;
  subject: string;
  description?: string;
  activeForm?: string;
  status: 'pending' | 'in_progress' | 'completed';
  blocks?: string[];
  blockedBy?: string[];
}

/** Internal result for Task checking */
export interface TaskCheckResult {
  count: number;          // Incomplete tasks
  tasks: Task[];          // The incomplete tasks
  total: number;          // Total tasks found
}

export interface IncompleteTodosResult {
  count: number;
  todos: Todo[];
  total: number;
  source: 'task' | 'todo' | 'both' | 'none';
}

/**
 * Context from Stop hook event
 *
 * NOTE: Field names support both camelCase and snake_case variants
 * for compatibility with different Claude Code versions.
 *
 * IMPORTANT: The abort detection patterns below are assumed. Verify
 * actual stop_reason values from Claude Code before finalizing.
 */
export interface StopContext {
  /** Reason for stop (from Claude Code) - snake_case variant */
  stop_reason?: string;
  /** Reason for stop (from Claude Code) - camelCase variant */
  stopReason?: string;
  /** End turn reason (from API) - snake_case variant */
  end_turn_reason?: string;
  /** End turn reason (from API) - camelCase variant */
  endTurnReason?: string;
  /** Whether user explicitly requested stop - snake_case variant */
  user_requested?: boolean;
  /** Whether user explicitly requested stop - camelCase variant */
  userRequested?: boolean;
}

export interface TodoContinuationHook {
  checkIncomplete: (sessionId?: string) => Promise<IncompleteTodosResult>;
}

/**
 * Detect if stop was due to user abort (not natural completion)
 *
 * NOTE: These patterns are ASSUMED. Verify against actual Claude Code
 * API responses and update as needed.
 */
export function isUserAbort(context?: StopContext): boolean {
  if (!context) return false;

  // User explicitly requested stop (supports both camelCase and snake_case)
  if (context.user_requested || context.userRequested) return true;

  // Check stop_reason patterns indicating user abort
  // Unified patterns: includes both specific (user_cancel) and generic (cancel)
  const abortPatterns = [
    'user_cancel',
    'user_interrupt',
    'ctrl_c',
    'manual_stop',
    'aborted',
    'abort',      // generic patterns from shell/Node.js templates
    'cancel',
    'interrupt',
  ];

  // Support both snake_case and camelCase field names
  const reason = (context.stop_reason ?? context.stopReason ?? '').toLowerCase();
  return abortPatterns.some(pattern => reason.includes(pattern));
}

/**
 * Get possible todo file locations
 */
function getTodoFilePaths(sessionId?: string, directory?: string): string[] {
  const claudeDir = join(homedir(), '.claude');
  const paths: string[] = [];

  // Session-specific todos
  if (sessionId) {
    paths.push(join(claudeDir, 'sessions', sessionId, 'todos.json'));
    paths.push(join(claudeDir, 'todos', `${sessionId}.json`));
  }

  // Project-specific todos
  if (directory) {
    paths.push(join(directory, '.omc', 'todos.json'));
    paths.push(join(directory, '.claude', 'todos.json'));
  }

  // Global todos directory
  const todosDir = join(claudeDir, 'todos');
  if (existsSync(todosDir)) {
    try {
      const files = readdirSync(todosDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          paths.push(join(todosDir, file));
        }
      }
    } catch {
      // Ignore errors reading directory
    }
  }

  return paths;
}

/**
 * Parse todo file content
 */
function parseTodoFile(filePath: string): Todo[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Handle array format
    if (Array.isArray(data)) {
      return data.filter(item =>
        item &&
        typeof item.content === 'string' &&
        typeof item.status === 'string'
      );
    }

    // Handle object format with todos array
    if (data.todos && Array.isArray(data.todos)) {
      return data.todos.filter((item: unknown) => {
        const todo = item as Record<string, unknown>;
        return (
          todo &&
          typeof todo.content === 'string' &&
          typeof todo.status === 'string'
        );
      }) as Todo[];
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Check if a todo is incomplete
 */
function isIncomplete(todo: Todo): boolean {
  return todo.status !== 'completed' && todo.status !== 'cancelled';
}

/**
 * Get the Task directory for a session
 */
export function getTaskDirectory(sessionId: string): string {
  return join(homedir(), '.claude', 'tasks', sessionId);
}

/**
 * Validates that a parsed JSON object is a valid Task.
 * Required fields: id (string), subject (string), status (string).
 */
export function isValidTask(data: unknown): data is Task {
  if (data === null || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' && obj.id.length > 0 &&
    typeof obj.subject === 'string' && obj.subject.length > 0 &&
    typeof obj.status === 'string' &&
    ['pending', 'in_progress', 'completed'].includes(obj.status)
  );
}

/**
 * Read all Task files from a session's task directory
 */
export function readTaskFiles(sessionId: string): Task[] {
  const taskDir = getTaskDirectory(sessionId);
  if (!existsSync(taskDir)) return [];

  const tasks: Task[] = [];
  try {
    for (const file of readdirSync(taskDir)) {
      if (!file.endsWith('.json') || file === '.lock') continue;
      try {
        const content = readFileSync(join(taskDir, file), 'utf-8');
        const parsed = JSON.parse(content);
        if (isValidTask(parsed)) tasks.push(parsed);
      } catch { /* skip invalid files */ }
    }
  } catch { /* skip directory read errors */ }
  return tasks;
}

/**
 * Check if a Task is incomplete
 */
export function isTaskIncomplete(task: Task): boolean {
  return task.status !== 'completed';
}

/**
 * Check for incomplete tasks in the new Task system
 */
export function checkIncompleteTasks(sessionId: string): TaskCheckResult {
  const tasks = readTaskFiles(sessionId);
  const incomplete = tasks.filter(isTaskIncomplete);
  return {
    count: incomplete.length,
    tasks: incomplete,
    total: tasks.length
  };
}

/**
 * Check for incomplete todos in the legacy system
 */
export function checkLegacyTodos(sessionId?: string, directory?: string): IncompleteTodosResult {
  const paths = getTodoFilePaths(sessionId, directory);
  const seenContents = new Set<string>();
  const allTodos: Todo[] = [];
  const incompleteTodos: Todo[] = [];

  for (const p of paths) {
    if (!existsSync(p)) continue;

    const todos = parseTodoFile(p);
    for (const todo of todos) {
      const key = `${todo.content}:${todo.status}`;
      if (seenContents.has(key)) continue;
      seenContents.add(key);
      allTodos.push(todo);
      if (isIncomplete(todo)) {
        incompleteTodos.push(todo);
      }
    }
  }

  return {
    count: incompleteTodos.length,
    todos: incompleteTodos,
    total: allTodos.length,
    source: incompleteTodos.length > 0 ? 'todo' : 'none'
  };
}

/**
 * Check for incomplete todos/tasks across all possible locations.
 * Checks new Task system first, then falls back to legacy todos.
 */
export async function checkIncompleteTodos(
  sessionId?: string,
  directory?: string,
  stopContext?: StopContext
): Promise<IncompleteTodosResult> {
  // If user aborted, don't force continuation
  if (isUserAbort(stopContext)) {
    return { count: 0, todos: [], total: 0, source: 'none' };
  }

  let taskResult: TaskCheckResult | null = null;

  // Priority 1: Check new Task system (if sessionId provided)
  if (sessionId) {
    taskResult = checkIncompleteTasks(sessionId);
  }

  // Priority 2: Check legacy todo system
  const todoResult = checkLegacyTodos(sessionId, directory);

  // Combine results (prefer Tasks if available)
  if (taskResult && taskResult.count > 0) {
    return {
      count: taskResult.count,
      todos: taskResult.tasks.map(t => ({
        content: t.subject,
        status: t.status,
        id: t.id
      })),
      total: taskResult.total,
      source: todoResult.count > 0 ? 'both' : 'task'
    };
  }

  return todoResult;
}

/**
 * Create a Todo Continuation hook instance
 */
export function createTodoContinuationHook(directory: string): TodoContinuationHook {
  return {
    checkIncomplete: (sessionId?: string) =>
      checkIncompleteTodos(sessionId, directory)
  };
}

/**
 * Get formatted status string for todos
 */
export function formatTodoStatus(result: IncompleteTodosResult): string {
  if (result.count === 0) {
    return `All tasks complete (${result.total} total)`;
  }

  return `${result.total - result.count}/${result.total} completed, ${result.count} remaining`;
}

/**
 * Get the next pending todo
 */
export function getNextPendingTodo(result: IncompleteTodosResult): Todo | null {
  // First try to find one that's in_progress
  const inProgress = result.todos.find(t => t.status === 'in_progress');
  if (inProgress) {
    return inProgress;
  }

  // Otherwise return first pending
  return result.todos.find(t => t.status === 'pending') ?? null;
}
