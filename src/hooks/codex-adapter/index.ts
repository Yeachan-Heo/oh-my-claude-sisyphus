/**
 * Codex Hooks Adapter Module
 *
 * Provides a unified hooks interface that works across both
 * Claude Code and Codex CLI platforms.
 *
 * ## Features
 *
 * - **Platform Detection**: Automatically detects Claude Code vs Codex CLI
 * - **Event Mapping**: Maps unified events to platform-specific events
 * - **Graceful Degradation**: Falls back gracefully when features unavailable
 * - **Config Reading**: Reads both Claude Code and Codex configuration formats
 * - **Unified Dispatcher**: Single dispatch interface for all hooks
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   detectPlatform,
 *   getPlatformCapabilities,
 *   on,
 *   dispatch,
 * } from './codex-adapter';
 *
 * // Check platform
 * const platform = detectPlatform();
 * const caps = getPlatformCapabilities();
 *
 * // Register a hook
 * on('my-hook', 'turn:complete', async (input) => {
 *   console.log('Turn completed:', input.turnId);
 *   return { continue: true, message: 'Processed!' };
 * });
 *
 * // Dispatch an event
 * const output = await dispatch('agent-turn-complete', payload);
 * ```
 *
 * ## Platform Compatibility
 *
 * | Feature | Claude Code | Codex CLI (Current) | Codex CLI (Future) |
 * |---------|-------------|---------------------|-------------------|
 * | Events | 12+ | 1 | 6+ |
 * | Blocking | Yes | No | Maybe |
 * | Input Mod | Yes | No | Maybe |
 * | Pre-exec | Yes | No | Yes |
 * | Post-exec | Yes | Yes | Yes |
 *
 * @module codex-adapter
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // Platform types
  Platform,
  PlatformCapabilities,

  // Event types
  UnifiedHookEvent,
  ClaudeCodeHookEvent,
  CodexHookEvent,

  // Input/Output types
  UnifiedHookInput,
  UnifiedHookOutput,
  ClaudeCodeHookInput,
  ClaudeCodeHookOutput,
  CodexNotifyPayload,

  // Config types
  CodexHooksConfig,
  CodexHookDefinition,
  CodexNotifyConfig,
  CodexStatusLineConfig,

  // Registration types
  HookRegistration,
  UnifiedHookHandler,
  PlatformAdapter,
} from './types.js';

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

export {
  detectPlatform,
  isCodex,
  isClaudeCode,
  getPlatformCapabilities,
  formatCapabilities,
  resetPlatformCache,
} from './platform-detect.js';

// ============================================================================
// EVENT MAPPING
// ============================================================================

export {
  fromClaudeCodeEvent,
  toClaudeCodeEvent,
  fromCodexEvent,
  toCodexEvent,
  getClaudeCodeEvents,
  getCodexEvents,
  getUnsupportedCodexEvents,
  isCrossPlatformEvent,
  getCrossPlatformEvents,
} from './event-map.js';

// ============================================================================
// CODEX CONFIG
// ============================================================================

export {
  // Path helpers
  getCodexConfigDir,
  getProjectCodexDir,

  // TOML parsing
  parseSimpleToml,

  // Config readers
  readCodexConfigToml,
  readNotifyConfig,
  readStatusLineConfig,
  readHooksJson,
  readCodexHooksConfig,

  // Config writers
  ensureCodexConfigDir,
  ensureProjectCodexDir,
  writeHooksJson,
  addHookToConfig,
  removeHookFromConfig,

  // OMC dispatcher
  getOmcDispatcherCommand,
  isOmcDispatcherConfigured,
  configureOmcDispatcher,
} from './codex-config.js';

// ============================================================================
// ADAPTERS
// ============================================================================

export {
  ClaudeCodeAdapter,
  getClaudeCodeAdapter,
  getSupportedClaudeCodeEvents,
  createClaudeCodeHookConfig,
} from './claude-code-adapter.js';

export {
  CodexAdapter,
  getCodexAdapter,
  parseCodexNotifyStdin,
  createCodexNotifyResponse,
  extractCodexTurnContext,
  wrapWithCodexDegradation,
} from './codex-adapter.js';

// ============================================================================
// DISPATCHER
// ============================================================================

export {
  // Registry
  registerHook,
  unregisterHook,
  getHook,
  getAllHooks,
  clearHooks,

  // Adapter management
  getAdapter,

  // Dispatch
  dispatch,
  dispatchAndFormat,

  // Convenience functions
  on,
  onTool,
  onSession,
  onTurn,

  // CLI
  processCliHook,
} from './dispatcher.js';

// ============================================================================
// CONSTANTS
// ============================================================================

export {
  CODEX_CONFIG_PATHS,
  CLAUDE_CODE_CONFIG_PATHS,
} from './types.js';
