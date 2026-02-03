/**
 * Codex Hooks Adapter - Type Definitions
 *
 * Defines types for the unified hooks interface that supports both
 * Claude Code and Codex CLI platforms.
 *
 * Key concepts:
 * - Platform: 'claude-code' or 'codex' (runtime detection)
 * - HookEvent: Unified event type that maps to both platforms
 * - Capabilities: Feature detection for graceful degradation
 */

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

/**
 * Supported CLI platforms
 */
export type Platform = 'claude-code' | 'codex' | 'unknown';

/**
 * Platform capabilities - what features are available
 */
export interface PlatformCapabilities {
  /** Platform identifier */
  platform: Platform;

  /** Platform version (if detectable) */
  version?: string;

  /** Supported hook events */
  supportedEvents: UnifiedHookEvent[];

  /** Can hooks block/prevent operations? */
  canBlock: boolean;

  /** Can hooks modify tool inputs? */
  canModifyInput: boolean;

  /** Are pre-execution hooks available? */
  hasPreExecutionHooks: boolean;

  /** Are post-execution hooks available? */
  hasPostExecutionHooks: boolean;

  /** Is there tool-level granularity? */
  hasToolLevelHooks: boolean;

  /** Session lifecycle hooks available? */
  hasSessionHooks: boolean;

  /** Agent/subagent control hooks available? */
  hasAgentHooks: boolean;
}

// ============================================================================
// UNIFIED HOOK EVENTS
// ============================================================================

/**
 * Unified hook event types that work across both platforms
 *
 * Maps to:
 * - Claude Code: 12+ native events
 * - Codex CLI: 1 event (agent-turn-complete) + future PR #9691 events
 */
export type UnifiedHookEvent =
  // Session lifecycle
  | 'session:start'
  | 'session:end'

  // User input
  | 'prompt:submit'          // Before user prompt is processed

  // Tool execution (Claude Code native, Codex future)
  | 'tool:pre'               // Before tool execution
  | 'tool:post'              // After successful tool execution
  | 'tool:error'             // After failed tool execution

  // Permission/approval
  | 'permission:request'     // When permission is needed

  // Agent control
  | 'agent:start'            // Subagent spawned
  | 'agent:stop'             // Subagent terminated

  // Turn lifecycle (Codex primary event)
  | 'turn:start'             // Agent turn begins (Codex future)
  | 'turn:complete'          // Agent turn completes (Codex: agent-turn-complete)

  // Context management
  | 'context:pre-compact'    // Before context compaction

  // Notifications
  | 'notification'           // General notifications
  | 'stop';                  // Agent stop requested

// ============================================================================
// CLAUDE CODE EVENT MAPPING
// ============================================================================

/**
 * Claude Code native hook events
 */
export type ClaudeCodeHookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'UserPromptSubmit'
  | 'PermissionRequest'
  | 'SessionStart'
  | 'SessionEnd'
  | 'Stop'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'Notification'
  | 'PreCompact';

/**
 * Claude Code hook input (from stdin)
 */
export interface ClaudeCodeHookInput {
  sessionId?: string;
  prompt?: string;
  message?: { content?: string };
  parts?: Array<{ type: string; text?: string }>;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
  directory?: string;
  stop_reason?: string;
  stopReason?: string;
  user_requested?: boolean;
  userRequested?: boolean;
}

/**
 * Claude Code hook output (to stdout)
 */
export interface ClaudeCodeHookOutput {
  continue: boolean;
  message?: string;
  reason?: string;
  modifiedInput?: unknown;
  permissionDecision?: 'allow' | 'deny' | 'ask';
  updatedInput?: unknown;
}

// ============================================================================
// CODEX EVENT MAPPING
// ============================================================================

/**
 * Codex CLI native hook events (current + PR #9691)
 */
export type CodexHookEvent =
  | 'agent-turn-complete'     // Current: only supported event
  | 'agent-turn-start'        // Future: PR #9691
  | 'tool-before'             // Future: PR #9691
  | 'tool-after'              // Future: PR #9691
  | 'session-start'           // Future: PR #9691
  | 'session-end';            // Future: PR #9691

/**
 * Codex notify payload (current implementation)
 */
export interface CodexNotifyPayload {
  type: 'agent-turn-complete';
  'turn-id': string;
  'thread-id': string;
  'input-messages': unknown[];
  'last-assistant-message': string;
  cwd: string;
}

/**
 * Codex hooks.json configuration format (PR #9691 proposed)
 */
export interface CodexHooksConfig {
  version?: number;
  hooks?: CodexHookDefinition[];
  /** Compatibility mode with Claude Code event names */
  claude_code_compat?: {
    enabled: boolean;
    unsupported_events?: string[];
  };
}

/**
 * Codex hook definition in hooks.json
 */
export interface CodexHookDefinition {
  /** Event type to listen for */
  event: CodexHookEvent | string;
  /** Command to execute */
  command: string[];
  /** Whether the hook is enabled */
  enabled?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Regex matcher for filtering (e.g., tool names) */
  matcher?: string;
}

/**
 * Codex config.toml notify configuration
 */
export interface CodexNotifyConfig {
  /** Notify command array */
  notify?: string[];
  /** Notify events (future) */
  notify_events?: string[];
}

/**
 * Codex status line configuration (PR #10170)
 */
export interface CodexStatusLineConfig {
  status_line?: string[];
  status_line_timeout_ms?: number;
}

// ============================================================================
// UNIFIED HOOK INTERFACE
// ============================================================================

/**
 * Unified hook input that normalizes both platforms
 */
export interface UnifiedHookInput {
  /** Event type */
  event: UnifiedHookEvent;

  /** Session identifier */
  sessionId?: string;

  /** Working directory */
  cwd: string;

  /** User prompt text (for prompt events) */
  prompt?: string;

  /** Tool name (for tool events) */
  toolName?: string;

  /** Tool input (for tool events) */
  toolInput?: unknown;

  /** Tool output (for post-tool events) */
  toolOutput?: unknown;

  /** Tool error (for error events) */
  toolError?: unknown;

  /** Turn ID (Codex) */
  turnId?: string;

  /** Thread ID (Codex) */
  threadId?: string;

  /** Agent ID (for agent events) */
  agentId?: string;

  /** Agent type (for agent events) */
  agentType?: string;

  /** Stop reason (for stop events) */
  stopReason?: string;

  /** Whether stop was user-requested */
  userRequested?: boolean;

  /** Raw platform-specific payload */
  rawPayload?: unknown;

  /** Source platform */
  platform: Platform;
}

/**
 * Unified hook output
 */
export interface UnifiedHookOutput {
  /** Whether to continue with the operation */
  continue: boolean;

  /** Message to inject into context */
  message?: string;

  /** Reason for blocking (when continue=false) */
  reason?: string;

  /** Modified tool input (for pre-tool hooks) */
  modifiedInput?: unknown;

  /** Permission decision (for permission events) */
  permissionDecision?: 'allow' | 'deny' | 'ask';

  /** Additional context to inject */
  additionalContext?: string;
}

/**
 * Hook handler function signature
 */
export type UnifiedHookHandler = (
  input: UnifiedHookInput
) => Promise<UnifiedHookOutput> | UnifiedHookOutput;

/**
 * Hook registration
 */
export interface HookRegistration {
  /** Unique identifier */
  id: string;

  /** Events to listen for */
  events: UnifiedHookEvent[];

  /** Handler function */
  handler: UnifiedHookHandler;

  /** Optional matcher for tool names */
  toolMatcher?: RegExp;

  /** Priority (higher = runs first) */
  priority?: number;

  /** Whether hook is enabled */
  enabled?: boolean;
}

// ============================================================================
// ADAPTER INTERFACE
// ============================================================================

/**
 * Platform adapter interface
 *
 * Implementations:
 * - ClaudeCodeAdapter: Full-featured, direct integration
 * - CodexAdapter: Limited features, works with notify + future hooks
 */
export interface PlatformAdapter {
  /** Platform identifier */
  readonly platform: Platform;

  /** Platform capabilities */
  readonly capabilities: PlatformCapabilities;

  /**
   * Parse platform-specific input to unified format
   */
  parseInput(rawInput: unknown, event: string): UnifiedHookInput;

  /**
   * Convert unified output to platform-specific format
   */
  formatOutput(output: UnifiedHookOutput): unknown;

  /**
   * Check if an event is supported on this platform
   */
  isEventSupported(event: UnifiedHookEvent): boolean;

  /**
   * Map unified event to platform-specific event name
   */
  mapToPlatformEvent(event: UnifiedHookEvent): string | null;

  /**
   * Map platform-specific event to unified event
   */
  mapFromPlatformEvent(platformEvent: string): UnifiedHookEvent | null;

  /**
   * Read platform configuration
   */
  readConfig(cwd: string): Promise<CodexHooksConfig | null>;
}

// ============================================================================
// CONFIG FILE PATHS
// ============================================================================

/**
 * Known Codex configuration file paths
 */
export const CODEX_CONFIG_PATHS = {
  /** Global config.toml */
  globalConfig: '~/.codex/config.toml',
  /** Project hooks.json */
  projectHooks: '.codex/hooks.json',
  /** Global hooks.json (future) */
  globalHooks: '~/.codex/hooks.json',
} as const;

/**
 * Known Claude Code configuration file paths
 */
export const CLAUDE_CODE_CONFIG_PATHS = {
  /** Global settings.json */
  globalSettings: '~/.claude/settings.json',
  /** Project settings.json */
  projectSettings: '.claude/settings.json',
} as const;
