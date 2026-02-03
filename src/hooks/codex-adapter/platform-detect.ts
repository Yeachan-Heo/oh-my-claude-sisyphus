/**
 * Platform Detection Module
 *
 * Detects whether OMC is running under Claude Code or Codex CLI.
 * Uses environment variables, process info, and config file presence.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { Platform, PlatformCapabilities, UnifiedHookEvent } from './types.js';

// ============================================================================
// DETECTION HEURISTICS
// ============================================================================

/**
 * Environment variables that indicate Claude Code
 */
const CLAUDE_CODE_ENV_VARS = [
  'CLAUDE_CODE',
  'CLAUDE_PROJECT_DIR',
  'CLAUDE_PLUGIN_ROOT',
  'CLAUDE_CODE_VERSION',
] as const;

/**
 * Environment variables that indicate Codex CLI
 */
const CODEX_ENV_VARS = [
  'CODEX_CLI',
  'CODEX_SESSION_ID',
  'CODEX_SANDBOX_NETWORK',
  'OPENAI_API_KEY',      // Codex requires OpenAI key
] as const;

/**
 * Config file paths that indicate Claude Code
 */
const CLAUDE_CODE_CONFIG_FILES = [
  () => join(homedir(), '.claude', 'settings.json'),
  () => join(homedir(), '.claude', 'CLAUDE.md'),
] as const;

/**
 * Config file paths that indicate Codex CLI
 */
const CODEX_CONFIG_FILES = [
  () => join(homedir(), '.codex', 'config.toml'),
  () => join(homedir(), '.codex', 'hooks.json'),
] as const;

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

/** Cached detection result */
let _cachedPlatform: Platform | null = null;
let _cachedCapabilities: PlatformCapabilities | null = null;

/**
 * Detect the current CLI platform
 *
 * Detection priority:
 * 1. Explicit environment variable (OMC_PLATFORM)
 * 2. Claude Code env vars
 * 3. Codex env vars
 * 4. Config file presence
 * 5. Fallback to 'claude-code' (most common)
 */
export function detectPlatform(): Platform {
  if (_cachedPlatform !== null) {
    return _cachedPlatform;
  }

  // 1. Explicit override
  const explicitPlatform = process.env.OMC_PLATFORM;
  if (explicitPlatform === 'claude-code' || explicitPlatform === 'codex') {
    _cachedPlatform = explicitPlatform;
    return _cachedPlatform;
  }

  // 2. Claude Code env vars (strong signal)
  const hasClaudeCodeEnv = CLAUDE_CODE_ENV_VARS.some(v => process.env[v] !== undefined);
  if (hasClaudeCodeEnv) {
    _cachedPlatform = 'claude-code';
    return _cachedPlatform;
  }

  // 3. Codex env vars (strong signal)
  const hasCodexEnv = CODEX_ENV_VARS.some(v => {
    // OPENAI_API_KEY alone isn't enough - check for Codex-specific vars first
    if (v === 'OPENAI_API_KEY') return false;
    return process.env[v] !== undefined;
  });
  if (hasCodexEnv) {
    _cachedPlatform = 'codex';
    return _cachedPlatform;
  }

  // 4. Config file presence
  const hasClaudeCodeConfig = CLAUDE_CODE_CONFIG_FILES.some(getPath => {
    try { return existsSync(getPath()); } catch { return false; }
  });
  const hasCodexConfig = CODEX_CONFIG_FILES.some(getPath => {
    try { return existsSync(getPath()); } catch { return false; }
  });

  if (hasCodexConfig && !hasClaudeCodeConfig) {
    _cachedPlatform = 'codex';
    return _cachedPlatform;
  }

  // 5. Default to claude-code (OMC's primary platform)
  _cachedPlatform = 'claude-code';
  return _cachedPlatform;
}

/**
 * Check if running under Codex CLI
 */
export function isCodex(): boolean {
  return detectPlatform() === 'codex';
}

/**
 * Check if running under Claude Code
 */
export function isClaudeCode(): boolean {
  return detectPlatform() === 'claude-code';
}

/**
 * Reset cached detection (for testing)
 */
export function resetPlatformCache(): void {
  _cachedPlatform = null;
  _cachedCapabilities = null;
}

// ============================================================================
// PLATFORM CAPABILITIES
// ============================================================================

/**
 * Claude Code supported events (all events available)
 */
const CLAUDE_CODE_EVENTS: UnifiedHookEvent[] = [
  'session:start',
  'session:end',
  'prompt:submit',
  'tool:pre',
  'tool:post',
  'tool:error',
  'permission:request',
  'agent:start',
  'agent:stop',
  'turn:complete',
  'context:pre-compact',
  'notification',
  'stop',
];

/**
 * Codex CLI supported events (current - only turn:complete via notify)
 */
const CODEX_CURRENT_EVENTS: UnifiedHookEvent[] = [
  'turn:complete',
];

/**
 * Codex CLI events expected after PR #9691
 */
const CODEX_FUTURE_EVENTS: UnifiedHookEvent[] = [
  'turn:start',
  'turn:complete',
  'tool:pre',
  'tool:post',
  'session:start',
  'session:end',
];

/**
 * Get capabilities for the detected platform
 */
export function getPlatformCapabilities(platform?: Platform): PlatformCapabilities {
  const p = platform ?? detectPlatform();

  if (_cachedCapabilities !== null && _cachedCapabilities.platform === p) {
    return _cachedCapabilities;
  }

  let capabilities: PlatformCapabilities;

  switch (p) {
    case 'claude-code':
      capabilities = {
        platform: 'claude-code',
        supportedEvents: CLAUDE_CODE_EVENTS,
        canBlock: true,
        canModifyInput: true,
        hasPreExecutionHooks: true,
        hasPostExecutionHooks: true,
        hasToolLevelHooks: true,
        hasSessionHooks: true,
        hasAgentHooks: true,
      };
      break;

    case 'codex': {
      // Check if PR #9691 hooks are available by checking for hooks config
      const hasAdvancedHooks = checkCodexAdvancedHooks();
      capabilities = {
        platform: 'codex',
        supportedEvents: hasAdvancedHooks ? CODEX_FUTURE_EVENTS : CODEX_CURRENT_EVENTS,
        canBlock: hasAdvancedHooks,
        canModifyInput: false,  // Codex doesn't support input modification yet
        hasPreExecutionHooks: hasAdvancedHooks,
        hasPostExecutionHooks: true,  // notify gives post-execution
        hasToolLevelHooks: hasAdvancedHooks,
        hasSessionHooks: hasAdvancedHooks,
        hasAgentHooks: false,
      };
      break;
    }

    default:
      capabilities = {
        platform: 'unknown',
        supportedEvents: [],
        canBlock: false,
        canModifyInput: false,
        hasPreExecutionHooks: false,
        hasPostExecutionHooks: false,
        hasToolLevelHooks: false,
        hasSessionHooks: false,
        hasAgentHooks: false,
      };
  }

  _cachedCapabilities = capabilities;
  return capabilities;
}

/**
 * Check if Codex has advanced hooks (PR #9691 shipped)
 *
 * Detects by looking for hooks configuration in config.toml
 * or the presence of hooks.json.
 */
function checkCodexAdvancedHooks(): boolean {
  try {
    const hooksJsonPath = join(homedir(), '.codex', 'hooks.json');
    if (existsSync(hooksJsonPath)) {
      return true;
    }
  } catch {
    // Ignore
  }

  // Check for [hooks] section in config.toml
  // Future: parse TOML when PR #9691 ships
  return false;
}

/**
 * Get a human-readable summary of platform capabilities
 */
export function formatCapabilities(capabilities: PlatformCapabilities): string {
  const lines: string[] = [
    `Platform: ${capabilities.platform}`,
    `Events: ${capabilities.supportedEvents.length} supported`,
    `Blocking: ${capabilities.canBlock ? 'Yes' : 'No'}`,
    `Input Modification: ${capabilities.canModifyInput ? 'Yes' : 'No'}`,
    `Pre-execution: ${capabilities.hasPreExecutionHooks ? 'Yes' : 'No'}`,
    `Post-execution: ${capabilities.hasPostExecutionHooks ? 'Yes' : 'No'}`,
    `Tool-level: ${capabilities.hasToolLevelHooks ? 'Yes' : 'No'}`,
    `Session hooks: ${capabilities.hasSessionHooks ? 'Yes' : 'No'}`,
    `Agent hooks: ${capabilities.hasAgentHooks ? 'Yes' : 'No'}`,
  ];

  return lines.join('\n');
}
