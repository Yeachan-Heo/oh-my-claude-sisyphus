/**
 * Event Mapping Layer
 *
 * Maps between unified hook events, Claude Code events, and Codex events.
 * Handles the asymmetry between platforms (12+ Claude Code events vs 1 Codex event).
 */

import type {
  UnifiedHookEvent,
  ClaudeCodeHookEvent,
  CodexHookEvent,
} from './types.js';

// ============================================================================
// CLAUDE CODE <-> UNIFIED MAPPING
// ============================================================================

/**
 * Map Claude Code native event -> unified event
 */
const CLAUDE_CODE_TO_UNIFIED: Record<ClaudeCodeHookEvent, UnifiedHookEvent> = {
  SessionStart: 'session:start',
  SessionEnd: 'session:end',
  UserPromptSubmit: 'prompt:submit',
  PreToolUse: 'tool:pre',
  PostToolUse: 'tool:post',
  PostToolUseFailure: 'tool:error',
  PermissionRequest: 'permission:request',
  SubagentStart: 'agent:start',
  SubagentStop: 'agent:stop',
  Stop: 'stop',
  PreCompact: 'context:pre-compact',
  Notification: 'notification',
};

/**
 * Map unified event -> Claude Code native event
 */
const UNIFIED_TO_CLAUDE_CODE: Partial<Record<UnifiedHookEvent, ClaudeCodeHookEvent>> = {
  'session:start': 'SessionStart',
  'session:end': 'SessionEnd',
  'prompt:submit': 'UserPromptSubmit',
  'tool:pre': 'PreToolUse',
  'tool:post': 'PostToolUse',
  'tool:error': 'PostToolUseFailure',
  'permission:request': 'PermissionRequest',
  'agent:start': 'SubagentStart',
  'agent:stop': 'SubagentStop',
  'stop': 'Stop',
  'context:pre-compact': 'PreCompact',
  'notification': 'Notification',
  // Note: 'turn:start' and 'turn:complete' have no direct Claude Code equivalent
};

// ============================================================================
// CODEX <-> UNIFIED MAPPING
// ============================================================================

/**
 * Map Codex native event -> unified event
 */
const CODEX_TO_UNIFIED: Record<CodexHookEvent, UnifiedHookEvent> = {
  'agent-turn-complete': 'turn:complete',
  'agent-turn-start': 'turn:start',
  'tool-before': 'tool:pre',
  'tool-after': 'tool:post',
  'session-start': 'session:start',
  'session-end': 'session:end',
};

/**
 * Map unified event -> Codex native event
 */
const UNIFIED_TO_CODEX: Partial<Record<UnifiedHookEvent, CodexHookEvent>> = {
  'turn:complete': 'agent-turn-complete',
  'turn:start': 'agent-turn-start',
  'tool:pre': 'tool-before',
  'tool:post': 'tool-after',
  'session:start': 'session-start',
  'session:end': 'session-end',
  // No Codex equivalent for: prompt:submit, tool:error, permission:request,
  // agent:start, agent:stop, stop, context:pre-compact, notification
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Convert a Claude Code event to a unified event
 */
export function fromClaudeCodeEvent(event: string): UnifiedHookEvent | null {
  return CLAUDE_CODE_TO_UNIFIED[event as ClaudeCodeHookEvent] ?? null;
}

/**
 * Convert a unified event to a Claude Code event
 */
export function toClaudeCodeEvent(event: UnifiedHookEvent): ClaudeCodeHookEvent | null {
  return UNIFIED_TO_CLAUDE_CODE[event] ?? null;
}

/**
 * Convert a Codex event to a unified event
 */
export function fromCodexEvent(event: string): UnifiedHookEvent | null {
  return CODEX_TO_UNIFIED[event as CodexHookEvent] ?? null;
}

/**
 * Convert a unified event to a Codex event
 */
export function toCodexEvent(event: UnifiedHookEvent): CodexHookEvent | null {
  return UNIFIED_TO_CODEX[event] ?? null;
}

/**
 * Get all Claude Code events that map to a set of unified events
 */
export function getClaudeCodeEvents(unifiedEvents: UnifiedHookEvent[]): ClaudeCodeHookEvent[] {
  const result: ClaudeCodeHookEvent[] = [];
  for (const event of unifiedEvents) {
    const mapped = toClaudeCodeEvent(event);
    if (mapped) {
      result.push(mapped);
    }
  }
  return result;
}

/**
 * Get all Codex events that map to a set of unified events
 */
export function getCodexEvents(unifiedEvents: UnifiedHookEvent[]): CodexHookEvent[] {
  const result: CodexHookEvent[] = [];
  for (const event of unifiedEvents) {
    const mapped = toCodexEvent(event);
    if (mapped) {
      result.push(mapped);
    }
  }
  return result;
}

/**
 * Get unified events that are NOT supported on Codex
 * Useful for warning users about unsupported features
 */
export function getUnsupportedCodexEvents(
  requestedEvents: UnifiedHookEvent[]
): UnifiedHookEvent[] {
  return requestedEvents.filter(event => !UNIFIED_TO_CODEX[event]);
}

/**
 * Check if a unified event is available on both platforms
 */
export function isCrossPlatformEvent(event: UnifiedHookEvent): boolean {
  return UNIFIED_TO_CLAUDE_CODE[event] !== undefined
    && UNIFIED_TO_CODEX[event] !== undefined;
}

/**
 * Get all cross-platform events (available on both platforms)
 */
export function getCrossPlatformEvents(): UnifiedHookEvent[] {
  const allEvents: UnifiedHookEvent[] = [
    'session:start', 'session:end', 'prompt:submit',
    'tool:pre', 'tool:post', 'tool:error',
    'permission:request', 'agent:start', 'agent:stop',
    'turn:start', 'turn:complete',
    'context:pre-compact', 'notification', 'stop',
  ];
  return allEvents.filter(isCrossPlatformEvent);
}
