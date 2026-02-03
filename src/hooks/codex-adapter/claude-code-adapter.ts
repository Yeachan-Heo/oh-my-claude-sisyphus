/**
 * Claude Code Platform Adapter
 *
 * Full-featured adapter for Claude Code's native hook system.
 * Provides complete bidirectional mapping and all hook capabilities.
 */

import type {
  PlatformAdapter,
  Platform,
  PlatformCapabilities,
  UnifiedHookEvent,
  UnifiedHookInput,
  UnifiedHookOutput,
  ClaudeCodeHookInput,
  ClaudeCodeHookOutput,
  ClaudeCodeHookEvent,
  CodexHooksConfig,
} from './types.js';
import { getPlatformCapabilities } from './platform-detect.js';
import { fromClaudeCodeEvent, toClaudeCodeEvent } from './event-map.js';

// ============================================================================
// CLAUDE CODE ADAPTER IMPLEMENTATION
// ============================================================================

/**
 * Claude Code Platform Adapter
 *
 * Provides full hook capabilities:
 * - 12+ event types
 * - Blocking/approval flows
 * - Input modification
 * - Tool-level granularity
 * - Session lifecycle
 * - Agent control
 */
export class ClaudeCodeAdapter implements PlatformAdapter {
  readonly platform: Platform = 'claude-code';
  private _capabilities: PlatformCapabilities | null = null;

  get capabilities(): PlatformCapabilities {
    if (!this._capabilities) {
      this._capabilities = getPlatformCapabilities('claude-code');
    }
    return this._capabilities;
  }

  /**
   * Parse Claude Code hook input to unified format
   */
  parseInput(rawInput: unknown, event: string): UnifiedHookInput {
    const input = rawInput as ClaudeCodeHookInput;
    const unifiedEvent = fromClaudeCodeEvent(event);

    if (!unifiedEvent) {
      throw new Error(`Unknown Claude Code event: ${event}`);
    }

    // Extract prompt text from various formats
    let prompt: string | undefined;
    if (input.prompt) {
      prompt = input.prompt;
    } else if (input.message?.content) {
      prompt = input.message.content;
    } else if (input.parts) {
      prompt = input.parts
        .filter(p => p.type === 'text' && p.text)
        .map(p => p.text)
        .join(' ');
    }

    return {
      event: unifiedEvent,
      sessionId: input.sessionId,
      cwd: input.directory ?? process.cwd(),
      prompt,
      toolName: input.toolName,
      toolInput: input.toolInput,
      toolOutput: input.toolOutput,
      stopReason: input.stop_reason ?? input.stopReason,
      userRequested: input.user_requested ?? input.userRequested,
      rawPayload: input,
      platform: this.platform,
    };
  }

  /**
   * Convert unified output to Claude Code format
   */
  formatOutput(output: UnifiedHookOutput): ClaudeCodeHookOutput {
    const result: ClaudeCodeHookOutput = {
      continue: output.continue,
    };

    if (output.message) {
      result.message = output.message;
    }

    if (output.reason) {
      result.reason = output.reason;
    }

    if (output.modifiedInput !== undefined) {
      result.modifiedInput = output.modifiedInput;
      result.updatedInput = output.modifiedInput;
    }

    if (output.permissionDecision) {
      result.permissionDecision = output.permissionDecision;
    }

    return result;
  }

  /**
   * Check if an event is supported
   */
  isEventSupported(event: UnifiedHookEvent): boolean {
    return this.capabilities.supportedEvents.includes(event);
  }

  /**
   * Map unified event to Claude Code event
   */
  mapToPlatformEvent(event: UnifiedHookEvent): string | null {
    return toClaudeCodeEvent(event);
  }

  /**
   * Map Claude Code event to unified event
   */
  mapFromPlatformEvent(platformEvent: string): UnifiedHookEvent | null {
    return fromClaudeCodeEvent(platformEvent);
  }

  /**
   * Read Claude Code configuration (for compatibility info)
   * Returns null as Claude Code doesn't use hooks.json format
   */
  async readConfig(_cwd: string): Promise<CodexHooksConfig | null> {
    // Claude Code uses settings.json, not hooks.json
    // Return null - caller should use Claude Code's native config
    return null;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all Claude Code events supported by the adapter
 */
export function getSupportedClaudeCodeEvents(): ClaudeCodeHookEvent[] {
  return [
    'PreToolUse',
    'PostToolUse',
    'PostToolUseFailure',
    'UserPromptSubmit',
    'PermissionRequest',
    'SessionStart',
    'SessionEnd',
    'Stop',
    'SubagentStart',
    'SubagentStop',
    'Notification',
    'PreCompact',
  ];
}

/**
 * Create a Claude Code hook configuration entry
 */
export function createClaudeCodeHookConfig(
  event: ClaudeCodeHookEvent,
  command: string[],
  options?: {
    matcher?: string;
    timeout?: number;
  }
): {
  type: 'command';
  command: string[];
  matcher?: string;
  timeout?: number;
} {
  return {
    type: 'command',
    command,
    matcher: options?.matcher,
    timeout: options?.timeout ?? 5000,
  };
}

/**
 * Singleton instance
 */
let _instance: ClaudeCodeAdapter | null = null;

export function getClaudeCodeAdapter(): ClaudeCodeAdapter {
  if (!_instance) {
    _instance = new ClaudeCodeAdapter();
  }
  return _instance;
}
