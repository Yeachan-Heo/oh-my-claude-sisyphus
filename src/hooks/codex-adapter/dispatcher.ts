/**
 * Unified Hook Dispatcher
 *
 * Central dispatcher that routes hook events to registered handlers,
 * working across both Claude Code and Codex CLI platforms.
 *
 * Features:
 * - Platform-agnostic hook registration
 * - Automatic event mapping
 * - Graceful degradation for unsupported features
 * - Priority-based handler execution
 * - Tool name filtering via matchers
 */

import type {
  Platform,
  PlatformAdapter,
  UnifiedHookEvent,
  UnifiedHookInput,
  UnifiedHookOutput,
  HookRegistration,
} from './types.js';
import { detectPlatform, getPlatformCapabilities } from './platform-detect.js';
import { getClaudeCodeAdapter } from './claude-code-adapter.js';
import { getCodexAdapter, wrapWithCodexDegradation } from './codex-adapter.js';
import { getUnsupportedCodexEvents } from './event-map.js';

// ============================================================================
// HOOK REGISTRY
// ============================================================================

/** Registered hooks */
const _hooks: Map<string, HookRegistration> = new Map();

/** Hook execution order cache (invalidated on registration changes) */
let _sortedHooks: HookRegistration[] | null = null;

/**
 * Register a hook handler
 */
export function registerHook(registration: HookRegistration): void {
  _hooks.set(registration.id, registration);
  _sortedHooks = null; // Invalidate cache

  // Log warnings for unsupported events on Codex
  if (detectPlatform() === 'codex') {
    const unsupported = getUnsupportedCodexEvents(registration.events);
    if (unsupported.length > 0) {
      console.warn(
        `[Dispatcher] Hook "${registration.id}" registered for events not supported on Codex:`,
        unsupported.join(', ')
      );
    }
  }
}

/**
 * Unregister a hook handler
 */
export function unregisterHook(id: string): boolean {
  const removed = _hooks.delete(id);
  if (removed) {
    _sortedHooks = null;
  }
  return removed;
}

/**
 * Get a registered hook by ID
 */
export function getHook(id: string): HookRegistration | undefined {
  return _hooks.get(id);
}

/**
 * Get all registered hooks
 */
export function getAllHooks(): HookRegistration[] {
  return Array.from(_hooks.values());
}

/**
 * Clear all registered hooks
 */
export function clearHooks(): void {
  _hooks.clear();
  _sortedHooks = null;
}

/**
 * Get hooks sorted by priority (higher priority first)
 */
function getSortedHooks(): HookRegistration[] {
  if (_sortedHooks === null) {
    _sortedHooks = Array.from(_hooks.values())
      .filter(h => h.enabled !== false)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }
  return _sortedHooks;
}

// ============================================================================
// ADAPTER MANAGEMENT
// ============================================================================

/**
 * Get the appropriate adapter for the current platform
 */
export function getAdapter(platform?: Platform): PlatformAdapter {
  const p = platform ?? detectPlatform();

  switch (p) {
    case 'claude-code':
      return getClaudeCodeAdapter();
    case 'codex':
      return getCodexAdapter();
    default:
      // Default to Claude Code adapter
      return getClaudeCodeAdapter();
  }
}

// ============================================================================
// DISPATCHER
// ============================================================================

/**
 * Dispatch a hook event to all registered handlers
 *
 * @param platformEvent - Platform-specific event name
 * @param rawInput - Raw platform-specific input
 * @param platform - Platform override (auto-detected if not specified)
 * @returns Combined output from all handlers
 */
export async function dispatch(
  platformEvent: string,
  rawInput: unknown,
  platform?: Platform
): Promise<UnifiedHookOutput> {
  const p = platform ?? detectPlatform();
  const adapter = getAdapter(p);
  const capabilities = adapter.capabilities;

  // Parse input to unified format
  let input: UnifiedHookInput;
  try {
    input = adapter.parseInput(rawInput, platformEvent);
  } catch (error) {
    console.error('[Dispatcher] Failed to parse input:', error);
    return { continue: true };
  }

  // Check if event is supported on this platform
  if (!adapter.isEventSupported(input.event)) {
    console.warn(
      `[Dispatcher] Event "${input.event}" is not supported on ${p}. Skipping.`
    );
    return { continue: true };
  }

  // Find matching hooks
  const hooks = getSortedHooks().filter(hook => {
    // Check event match
    if (!hook.events.includes(input.event)) {
      return false;
    }

    // Check tool matcher (for tool events)
    if (hook.toolMatcher && input.toolName) {
      if (!hook.toolMatcher.test(input.toolName)) {
        return false;
      }
    }

    return true;
  });

  if (hooks.length === 0) {
    return { continue: true };
  }

  // Execute hooks in priority order
  let combinedOutput: UnifiedHookOutput = { continue: true };
  const messages: string[] = [];

  for (const hook of hooks) {
    try {
      // Wrap handler with degradation for Codex
      const asyncHandler = async (i: UnifiedHookInput) => hook.handler(i);
      const handler = p === 'codex'
        ? wrapWithCodexDegradation(asyncHandler)
        : asyncHandler;

      const output = await handler(input);

      // Aggregate messages
      if (output.message) {
        messages.push(output.message);
      }
      if (output.additionalContext) {
        messages.push(output.additionalContext);
      }

      // If any hook blocks, respect it (unless Codex can't block)
      if (!output.continue) {
        if (capabilities.canBlock) {
          combinedOutput = {
            ...combinedOutput,
            continue: false,
            reason: output.reason,
          };
          break; // Stop processing on block
        } else {
          console.warn(
            `[Dispatcher] Hook "${hook.id}" tried to block, but platform "${p}" ` +
            `doesn't support blocking. Continuing.`
          );
        }
      }

      // Capture input modifications (only if supported)
      if (output.modifiedInput !== undefined && capabilities.canModifyInput) {
        combinedOutput.modifiedInput = output.modifiedInput;
        // Update input for next handler
        input = { ...input, toolInput: output.modifiedInput };
      }

      // Capture permission decision
      if (output.permissionDecision) {
        combinedOutput.permissionDecision = output.permissionDecision;
      }
    } catch (error) {
      console.error(`[Dispatcher] Hook "${hook.id}" failed:`, error);
      // Continue to next hook on error
    }
  }

  // Combine messages
  if (messages.length > 0) {
    combinedOutput.message = messages.join('\n\n---\n\n');
  }

  return combinedOutput;
}

/**
 * Dispatch and format output for the platform
 */
export async function dispatchAndFormat(
  platformEvent: string,
  rawInput: unknown,
  platform?: Platform
): Promise<unknown> {
  const p = platform ?? detectPlatform();
  const adapter = getAdapter(p);

  const output = await dispatch(platformEvent, rawInput, p);
  return adapter.formatOutput(output);
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Register a simple hook for specific events
 */
export function on(
  id: string,
  events: UnifiedHookEvent | UnifiedHookEvent[],
  handler: (input: UnifiedHookInput) => Promise<UnifiedHookOutput> | UnifiedHookOutput,
  options?: {
    toolMatcher?: RegExp;
    priority?: number;
  }
): void {
  registerHook({
    id,
    events: Array.isArray(events) ? events : [events],
    handler,
    toolMatcher: options?.toolMatcher,
    priority: options?.priority,
  });
}

/**
 * Register a hook for tool events only
 */
export function onTool(
  id: string,
  phase: 'pre' | 'post' | 'error',
  handler: (input: UnifiedHookInput) => Promise<UnifiedHookOutput> | UnifiedHookOutput,
  toolMatcher?: RegExp
): void {
  const eventMap: Record<string, UnifiedHookEvent> = {
    pre: 'tool:pre',
    post: 'tool:post',
    error: 'tool:error',
  };

  on(id, eventMap[phase], handler, { toolMatcher });
}

/**
 * Register a hook for session lifecycle
 */
export function onSession(
  id: string,
  phase: 'start' | 'end',
  handler: (input: UnifiedHookInput) => Promise<UnifiedHookOutput> | UnifiedHookOutput
): void {
  const eventMap: Record<string, UnifiedHookEvent> = {
    start: 'session:start',
    end: 'session:end',
  };

  on(id, eventMap[phase], handler);
}

/**
 * Register a hook for turn events (Codex-compatible)
 */
export function onTurn(
  id: string,
  phase: 'start' | 'complete',
  handler: (input: UnifiedHookInput) => Promise<UnifiedHookOutput> | UnifiedHookOutput
): void {
  const eventMap: Record<string, UnifiedHookEvent> = {
    start: 'turn:start',
    complete: 'turn:complete',
  };

  on(id, eventMap[phase], handler);
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

/**
 * Process a hook from CLI stdin
 *
 * Usage: omc hook --platform=codex < payload.json
 */
export async function processCliHook(
  platformEvent: string,
  platform: Platform
): Promise<void> {
  // Read stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const inputStr = Buffer.concat(chunks).toString('utf-8');

  let rawInput: unknown;
  try {
    rawInput = JSON.parse(inputStr);
  } catch {
    rawInput = {};
  }

  // Dispatch and output
  const output = await dispatchAndFormat(platformEvent, rawInput, platform);
  console.log(JSON.stringify(output));
}
