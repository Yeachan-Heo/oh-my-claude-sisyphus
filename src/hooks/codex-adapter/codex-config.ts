/**
 * Codex Configuration Reader
 *
 * Reads and parses Codex CLI configuration files:
 * - ~/.codex/config.toml (notify configuration)
 * - .codex/hooks.json (hooks configuration - PR #9691)
 * - ~/.codex/hooks.json (global hooks configuration)
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type {
  CodexHooksConfig,
  CodexHookDefinition,
  CodexNotifyConfig,
  CodexStatusLineConfig,
} from './types.js';

// ============================================================================
// PATH HELPERS
// ============================================================================

/**
 * Expand ~ to home directory
 */
function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

/**
 * Get the global Codex config directory
 */
export function getCodexConfigDir(): string {
  return join(homedir(), '.codex');
}

/**
 * Get the project Codex config directory
 */
export function getProjectCodexDir(cwd: string): string {
  return join(cwd, '.codex');
}

// ============================================================================
// CONFIG.TOML PARSING (MINIMAL TOML PARSER)
// ============================================================================

/**
 * Parse a simple TOML file (supports basic key-value pairs and arrays)
 *
 * Note: This is a minimal parser for Codex config.toml.
 * For full TOML support, consider using a library like 'toml' or '@iarna/toml'.
 */
export function parseSimpleToml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentSection = '';

  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Section header: [section] or [section.subsection]
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    // Key-value pair: key = value
    const kvMatch = trimmed.match(/^([^=]+)\s*=\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const rawValue = kvMatch[2].trim();
      const value = parseTomlValue(rawValue);

      if (currentSection) {
        // Nested section
        setNestedValue(result, currentSection, key, value);
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Parse a TOML value (string, number, boolean, array)
 */
function parseTomlValue(raw: string): unknown {
  // String (quoted)
  if ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }

  // Array
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];

    // Simple array parsing (doesn't handle nested arrays)
    const items: unknown[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';

    for (const char of inner) {
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (inString && char === stringChar) {
        inString = false;
        current += char;
      } else if (!inString && char === ',') {
        items.push(parseTomlValue(current.trim()));
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      items.push(parseTomlValue(current.trim()));
    }

    return items;
  }

  // Boolean
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  // Number
  const num = Number(raw);
  if (!isNaN(num)) return num;

  // Fallback: return as string
  return raw;
}

/**
 * Set a nested value in an object
 */
function setNestedValue(
  obj: Record<string, unknown>,
  section: string,
  key: string,
  value: unknown
): void {
  const parts = section.split('.');
  let current: Record<string, unknown> = obj;

  for (const part of parts) {
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[key] = value;
}

// ============================================================================
// CODEX CONFIG READERS
// ============================================================================

/**
 * Read Codex config.toml
 */
export function readCodexConfigToml(): Record<string, unknown> | null {
  const configPath = join(getCodexConfigDir(), 'config.toml');

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return parseSimpleToml(content);
  } catch (error) {
    console.warn('[codex-config] Failed to parse config.toml:', error);
    return null;
  }
}

/**
 * Read notify configuration from config.toml
 */
export function readNotifyConfig(): CodexNotifyConfig | null {
  const config = readCodexConfigToml();
  if (!config) return null;

  const notify = config.notify as string[] | undefined;
  const notifyEvents = config.notify_events as string[] | undefined;

  if (!notify && !notifyEvents) {
    return null;
  }

  return {
    notify,
    notify_events: notifyEvents,
  };
}

/**
 * Read status line configuration from config.toml
 */
export function readStatusLineConfig(): CodexStatusLineConfig | null {
  const config = readCodexConfigToml();
  if (!config) return null;

  const tui = config.tui as Record<string, unknown> | undefined;
  if (!tui) return null;

  const statusLine = tui.status_line as string[] | undefined;
  const timeout = tui.status_line_timeout_ms as number | undefined;

  if (!statusLine) return null;

  return {
    status_line: statusLine,
    status_line_timeout_ms: timeout,
  };
}

/**
 * Read hooks.json configuration
 */
export function readHooksJson(cwd: string): CodexHooksConfig | null {
  // Check project-level hooks first
  const projectPath = join(getProjectCodexDir(cwd), 'hooks.json');
  if (existsSync(projectPath)) {
    try {
      const content = readFileSync(projectPath, 'utf-8');
      return JSON.parse(content) as CodexHooksConfig;
    } catch (error) {
      console.warn('[codex-config] Failed to parse project hooks.json:', error);
    }
  }

  // Fall back to global hooks
  const globalPath = join(getCodexConfigDir(), 'hooks.json');
  if (existsSync(globalPath)) {
    try {
      const content = readFileSync(globalPath, 'utf-8');
      return JSON.parse(content) as CodexHooksConfig;
    } catch (error) {
      console.warn('[codex-config] Failed to parse global hooks.json:', error);
    }
  }

  return null;
}

/**
 * Read combined Codex hooks configuration
 * Merges notify config with hooks.json
 */
export function readCodexHooksConfig(cwd: string): CodexHooksConfig {
  const hooksJson = readHooksJson(cwd);
  const notifyConfig = readNotifyConfig();

  // Start with hooks.json if present
  const config: CodexHooksConfig = hooksJson ?? {
    version: 1,
    hooks: [],
  };

  // If we have notify config but no hooks, create a hook for it
  if (notifyConfig?.notify && (!config.hooks || config.hooks.length === 0)) {
    config.hooks = [{
      event: 'agent-turn-complete',
      command: notifyConfig.notify,
      enabled: true,
    }];
  }

  return config;
}

// ============================================================================
// CODEX CONFIG WRITERS
// ============================================================================

/**
 * Ensure the Codex config directory exists
 */
export function ensureCodexConfigDir(): void {
  const dir = getCodexConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Ensure the project Codex directory exists
 */
export function ensureProjectCodexDir(cwd: string): void {
  const dir = getProjectCodexDir(cwd);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Write hooks.json configuration
 */
export function writeHooksJson(
  cwd: string,
  config: CodexHooksConfig,
  global: boolean = false
): void {
  const targetDir = global ? getCodexConfigDir() : getProjectCodexDir(cwd);

  if (global) {
    ensureCodexConfigDir();
  } else {
    ensureProjectCodexDir(cwd);
  }

  const targetPath = join(targetDir, 'hooks.json');
  writeFileSync(targetPath, JSON.stringify(config, null, 2));
}

/**
 * Add a hook definition to the configuration
 */
export function addHookToConfig(
  cwd: string,
  hook: CodexHookDefinition,
  global: boolean = false
): CodexHooksConfig {
  const config = readCodexHooksConfig(cwd);

  if (!config.hooks) {
    config.hooks = [];
  }

  // Check for duplicate
  const existing = config.hooks.find(
    h => h.event === hook.event && JSON.stringify(h.command) === JSON.stringify(hook.command)
  );

  if (!existing) {
    config.hooks.push(hook);
    writeHooksJson(cwd, config, global);
  }

  return config;
}

/**
 * Remove a hook definition from the configuration
 */
export function removeHookFromConfig(
  cwd: string,
  event: string,
  commandPrefix?: string,
  global: boolean = false
): CodexHooksConfig {
  const config = readCodexHooksConfig(cwd);

  if (!config.hooks) {
    return config;
  }

  config.hooks = config.hooks.filter(h => {
    if (h.event !== event) return true;
    if (commandPrefix && h.command[0]?.includes(commandPrefix)) return false;
    if (!commandPrefix) return false;
    return true;
  });

  writeHooksJson(cwd, config, global);
  return config;
}

// ============================================================================
// OMC DISPATCHER CONFIG
// ============================================================================

/**
 * Get the OMC dispatcher command for Codex notify hook
 */
export function getOmcDispatcherCommand(): string[] {
  // Use the installed omc CLI
  return ['omc', 'hook', '--platform=codex'];
}

/**
 * Check if OMC dispatcher is configured in Codex
 */
export function isOmcDispatcherConfigured(cwd: string): boolean {
  const config = readCodexHooksConfig(cwd);
  const omcCommand = getOmcDispatcherCommand();

  return config.hooks?.some(hook =>
    hook.command[0] === omcCommand[0] || hook.command[0]?.includes('omc')
  ) ?? false;
}

/**
 * Configure OMC as the Codex dispatcher
 */
export function configureOmcDispatcher(cwd: string, global: boolean = true): void {
  const hook: CodexHookDefinition = {
    event: 'agent-turn-complete',
    command: getOmcDispatcherCommand(),
    enabled: true,
    timeout: 5000,
  };

  addHookToConfig(cwd, hook, global);
}
