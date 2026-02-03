/**
 * Codex CLI Platform Adapter
 *
 * Limited adapter for Codex CLI's hook system (current and future).
 *
 * Current capabilities (Codex as of Jan 2026):
 * - Single event: agent-turn-complete via notify
 * - Post-execution only
 * - No blocking, no input modification
 *
 * Future capabilities (PR #9691):
 * - Multiple events
 * - Pre/post execution
 * - Potentially blocking
 */

import type {
  PlatformAdapter,
  Platform,
  PlatformCapabilities,
  UnifiedHookEvent,
  UnifiedHookInput,
  UnifiedHookOutput,
  CodexNotifyPayload,
  CodexHooksConfig,
} from './types.js';
import { getPlatformCapabilities } from './platform-detect.js';
import { fromCodexEvent, toCodexEvent } from './event-map.js';
import { readCodexHooksConfig } from './codex-config.js';

// ============================================================================
// CODEX ADAPTER IMPLEMENTATION
// ============================================================================

/**
 * Codex CLI Platform Adapter
 *
 * Current limitations:
 * - Only turn:complete event
 * - Cannot block operations
 * - Cannot modify inputs
 * - No tool-level hooks
 * - No session/agent hooks
 */
export class CodexAdapter implements PlatformAdapter {
  readonly platform: Platform = 'codex';
  private _capabilities: PlatformCapabilities | null = null;

  get capabilities(): PlatformCapabilities {
    if (!this._capabilities) {
      this._capabilities = getPlatformCapabilities('codex');
    }
    return this._capabilities;
  }

  /**
   * Parse Codex hook input to unified format
   *
   * Currently only handles agent-turn-complete from notify
   */
  parseInput(rawInput: unknown, event: string): UnifiedHookInput {
    const unifiedEvent = fromCodexEvent(event);

    // Handle the current notify payload format
    if (event === 'agent-turn-complete') {
      const payload = rawInput as CodexNotifyPayload;

      return {
        event: unifiedEvent ?? 'turn:complete',
        cwd: payload.cwd ?? process.cwd(),
        turnId: payload['turn-id'],
        threadId: payload['thread-id'],
        // Extract last message as potential prompt context
        prompt: payload['last-assistant-message'],
        rawPayload: payload,
        platform: this.platform,
      };
    }

    // Handle future event formats (PR #9691)
    const input = rawInput as Record<string, unknown>;

    return {
      event: unifiedEvent ?? 'turn:complete',
      sessionId: input.session_id as string | undefined,
      cwd: (input.cwd as string) ?? process.cwd(),
      prompt: input.prompt as string | undefined,
      toolName: input.tool_name as string | undefined,
      toolInput: input.tool_input,
      toolOutput: input.tool_output,
      turnId: input.turn_id as string | undefined,
      threadId: input.thread_id as string | undefined,
      rawPayload: input,
      platform: this.platform,
    };
  }

  /**
   * Convert unified output to Codex format
   *
   * Note: Codex notify is fire-and-forget, output is ignored.
   * Future hooks may support output.
   */
  formatOutput(output: UnifiedHookOutput): Record<string, unknown> {
    // Current Codex notify doesn't use output
    // Format for future PR #9691 compatibility
    const result: Record<string, unknown> = {
      continue: output.continue,
    };

    if (output.message) {
      result.message = output.message;
    }

    if (output.reason) {
      result.reason = output.reason;
    }

    // Note: Codex doesn't support input modification yet
    // Include for forward compatibility
    if (output.modifiedInput !== undefined) {
      result.modified_input = output.modifiedInput;
    }

    return result;
  }

  /**
   * Check if an event is supported on Codex
   */
  isEventSupported(event: UnifiedHookEvent): boolean {
    return this.capabilities.supportedEvents.includes(event);
  }

  /**
   * Map unified event to Codex event
   */
  mapToPlatformEvent(event: UnifiedHookEvent): string | null {
    return toCodexEvent(event);
  }

  /**
   * Map Codex event to unified event
   */
  mapFromPlatformEvent(platformEvent: string): UnifiedHookEvent | null {
    return fromCodexEvent(platformEvent);
  }

  /**
   * Read Codex hooks configuration
   */
  async readConfig(cwd: string): Promise<CodexHooksConfig | null> {
    return readCodexHooksConfig(cwd);
  }

  /**
   * Get a warning message for unsupported features
   */
  getUnsupportedFeatureWarning(feature: string): string {
    return `[Codex Adapter] Feature "${feature}" is not supported on Codex CLI. ` +
      `This feature requires Claude Code or a future Codex version with PR #9691.`;
  }

  /**
   * Check if blocking is available (it's not on current Codex)
   */
  canBlock(): boolean {
    return this.capabilities.canBlock;
  }

  /**
   * Check if input modification is available (it's not on current Codex)
   */
  canModifyInput(): boolean {
    return this.capabilities.canModifyInput;
  }
}

// ============================================================================
// CODEX-SPECIFIC HELPERS
// ============================================================================

/**
 * Parse stdin from Codex notify command
 */
export function parseCodexNotifyStdin(stdin: string): CodexNotifyPayload | null {
  try {
    return JSON.parse(stdin) as CodexNotifyPayload;
  } catch {
    return null;
  }
}

/**
 * Create a response for Codex notify (currently ignored, but format for future)
 */
export function createCodexNotifyResponse(
  success: boolean,
  message?: string
): string {
  return JSON.stringify({
    success,
    message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Extract useful context from a Codex turn payload
 */
export function extractCodexTurnContext(payload: CodexNotifyPayload): {
  turnId: string;
  threadId: string;
  cwd: string;
  lastMessage: string;
  messageCount: number;
} {
  return {
    turnId: payload['turn-id'] ?? '',
    threadId: payload['thread-id'] ?? '',
    cwd: payload.cwd ?? '',
    lastMessage: payload['last-assistant-message'] ?? '',
    messageCount: payload['input-messages']?.length ?? 0,
  };
}

/**
 * Singleton instance
 */
let _instance: CodexAdapter | null = null;

export function getCodexAdapter(): CodexAdapter {
  if (!_instance) {
    _instance = new CodexAdapter();
  }
  return _instance;
}

// ============================================================================
// GRACEFUL DEGRADATION HELPERS
// ============================================================================

/**
 * Wrap a hook handler with Codex-specific graceful degradation
 *
 * If a hook tries to use unsupported features (blocking, input modification),
 * this wrapper will log a warning and allow the operation to continue.
 */
export function wrapWithCodexDegradation(
  handler: (input: UnifiedHookInput) => Promise<UnifiedHookOutput>
): (input: UnifiedHookInput) => Promise<UnifiedHookOutput> {
  return async (input: UnifiedHookInput) => {
    const output = await handler(input);

    // Warn if handler tried to block on Codex
    if (!output.continue && input.platform === 'codex') {
      console.warn(
        '[Codex Adapter] Hook attempted to block operation, but blocking is not ' +
        'supported on Codex CLI. Operation will continue. Reason:',
        output.reason
      );
      return { ...output, continue: true };
    }

    // Warn if handler tried to modify input on Codex
    if (output.modifiedInput !== undefined && input.platform === 'codex') {
      console.warn(
        '[Codex Adapter] Hook attempted to modify input, but input modification ' +
        'is not supported on Codex CLI. Original input will be used.'
      );
      return { ...output, modifiedInput: undefined };
    }

    return output;
  };
}
