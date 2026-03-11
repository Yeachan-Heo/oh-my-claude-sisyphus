import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';

import { getConfigDir } from '../utils/config-dir.js';

export interface UnifiedMcpRegistryEntry {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  timeout?: number;
}

export type UnifiedMcpRegistry = Record<string, UnifiedMcpRegistryEntry>;

export interface UnifiedMcpRegistrySyncResult {
  registryPath: string;
  codexConfigPath: string;
  registryExists: boolean;
  bootstrappedFromClaude: boolean;
  serverNames: string[];
  claudeChanged: boolean;
  codexChanged: boolean;
}

export interface UnifiedMcpRegistryStatus {
  registryPath: string;
  codexConfigPath: string;
  registryExists: boolean;
  serverNames: string[];
  claudeMissing: string[];
  claudeMismatched: string[];
  codexMissing: string[];
  codexMismatched: string[];
}

const MANAGED_START = '# BEGIN OMC MANAGED MCP REGISTRY';
const MANAGED_END = '# END OMC MANAGED MCP REGISTRY';

function getOmcHomeDir(): string {
  return process.env.OMC_HOME?.trim() || join(homedir(), '.omc');
}

export function getUnifiedMcpRegistryPath(): string {
  return process.env.OMC_MCP_REGISTRY_PATH?.trim() || join(getOmcHomeDir(), 'mcp-registry.json');
}

function getUnifiedMcpRegistryStatePath(): string {
  return join(getOmcHomeDir(), 'mcp-registry-state.json');
}

export function getCodexConfigPath(): string {
  const codexHome = process.env.CODEX_HOME?.trim() || join(homedir(), '.codex');
  return join(codexHome, 'config.toml');
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return !!value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.values(value).every(item => typeof item === 'string');
}

function normalizeRegistryEntry(value: unknown): UnifiedMcpRegistryEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const command = typeof raw.command === 'string' && raw.command.trim().length > 0
    ? raw.command.trim()
    : undefined;
  const url = typeof raw.url === 'string' && raw.url.trim().length > 0
    ? raw.url.trim()
    : undefined;

  if (!command && !url) {
    return null;
  }

  const args = Array.isArray(raw.args) && raw.args.every(item => typeof item === 'string')
    ? [...raw.args]
    : undefined;
  const env = isStringRecord(raw.env) ? { ...raw.env } : undefined;
  const timeout = typeof raw.timeout === 'number' && Number.isFinite(raw.timeout) && raw.timeout > 0
    ? raw.timeout
    : undefined;

  return {
    ...(command ? { command } : {}),
    ...(args && args.length > 0 ? { args } : {}),
    ...(env && Object.keys(env).length > 0 ? { env } : {}),
    ...(url ? { url } : {}),
    ...(timeout ? { timeout } : {}),
  };
}

function normalizeRegistry(value: unknown): UnifiedMcpRegistry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const entries: UnifiedMcpRegistry = {};
  for (const [name, entry] of Object.entries(value)) {
    const trimmedName = name.trim();
    if (!trimmedName) continue;
    const normalized = normalizeRegistryEntry(entry);
    if (normalized) {
      entries[trimmedName] = normalized;
    }
  }

  return Object.fromEntries(
    Object.entries(entries).sort(([left], [right]) => left.localeCompare(right))
  );
}

export function extractClaudeMcpRegistry(settings: Record<string, unknown>): UnifiedMcpRegistry {
  return normalizeRegistry(settings.mcpServers);
}

function loadRegistryFromDisk(path: string): UnifiedMcpRegistry {
  try {
    return normalizeRegistry(JSON.parse(readFileSync(path, 'utf-8')));
  } catch {
    return {};
  }
}

function ensureParentDir(path: string): void {
  const parent = dirname(path);
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }
}

function readManagedServerNames(): string[] {
  const statePath = getUnifiedMcpRegistryStatePath();
  if (!existsSync(statePath)) {
    return [];
  }

  try {
    const state = JSON.parse(readFileSync(statePath, 'utf-8')) as { managedServers?: unknown };
    return Array.isArray(state.managedServers)
      ? state.managedServers.filter((item): item is string => typeof item === 'string').sort((a, b) => a.localeCompare(b))
      : [];
  } catch {
    return [];
  }
}

function writeManagedServerNames(serverNames: string[]): void {
  const statePath = getUnifiedMcpRegistryStatePath();
  ensureParentDir(statePath);
  writeFileSync(statePath, JSON.stringify({ managedServers: [...serverNames].sort((a, b) => a.localeCompare(b)) }, null, 2));
}

function bootstrapRegistryFromClaude(settings: Record<string, unknown>, registryPath: string): UnifiedMcpRegistry {
  const registry = extractClaudeMcpRegistry(settings);
  if (Object.keys(registry).length === 0) {
    return {};
  }

  ensureParentDir(registryPath);
  writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  return registry;
}

function loadOrBootstrapRegistry(settings: Record<string, unknown>): {
  registry: UnifiedMcpRegistry;
  registryExists: boolean;
  bootstrappedFromClaude: boolean;
} {
  const registryPath = getUnifiedMcpRegistryPath();
  if (existsSync(registryPath)) {
    return {
      registry: loadRegistryFromDisk(registryPath),
      registryExists: true,
      bootstrappedFromClaude: false,
    };
  }

  const registry = bootstrapRegistryFromClaude(settings, registryPath);
  return {
    registry,
    registryExists: Object.keys(registry).length > 0,
    bootstrappedFromClaude: Object.keys(registry).length > 0,
  };
}

function entriesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function applyRegistryToClaudeSettings(
  settings: Record<string, unknown>,
  registry: UnifiedMcpRegistry,
  managedServerNames: string[] = [],
): { settings: Record<string, unknown>; changed: boolean } {
  const existingServers = extractClaudeMcpRegistry(settings);
  const nextServers: UnifiedMcpRegistry = { ...existingServers };

  for (const managedName of managedServerNames) {
    delete nextServers[managedName];
  }

  for (const [name, entry] of Object.entries(registry)) {
    nextServers[name] = entry;
  }

  if (entriesEqual(existingServers, nextServers)) {
    return { settings, changed: false };
  }

  const nextSettings = { ...settings };
  if (Object.keys(nextServers).length === 0) {
    delete nextSettings.mcpServers;
  } else {
    nextSettings.mcpServers = nextServers;
  }

  return {
    settings: nextSettings,
    changed: true,
  };
}

function escapeTomlString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function unescapeTomlString(value: string): string {
  return value
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function renderTomlString(value: string): string {
  return `"${escapeTomlString(value)}"`;
}

function parseTomlQuotedString(value: string): string | undefined {
  const match = value.trim().match(/^"((?:\\.|[^"\\])*)"$/);
  return match ? unescapeTomlString(match[1]) : undefined;
}

function renderTomlStringArray(values: string[]): string {
  return `[${values.map(renderTomlString).join(', ')}]`;
}

function parseTomlStringArray(value: string): string[] | undefined {
  try {
    const parsed = JSON.parse(value.trim()) as unknown;
    return Array.isArray(parsed) && parsed.every(item => typeof item === 'string')
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

function renderTomlEnvTable(env: Record<string, string>): string {
  const entries = Object.entries(env)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key} = ${renderTomlString(value)}`);

  return `{ ${entries.join(', ')} }`;
}

function parseTomlEnvTable(value: string): Record<string, string> | undefined {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return undefined;
  }

  const env: Record<string, string> = {};
  const inner = trimmed.slice(1, -1);
  const entryPattern = /([A-Za-z0-9_-]+)\s*=\s*"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;

  while ((match = entryPattern.exec(inner)) !== null) {
    env[match[1]] = unescapeTomlString(match[2]);
  }

  return Object.keys(env).length > 0 ? env : undefined;
}

function renderCodexServerBlock(name: string, entry: UnifiedMcpRegistryEntry): string {
  const lines = [`[mcp_servers.${name}]`];

  if (entry.command) {
    lines.push(`command = ${renderTomlString(entry.command)}`);
  }
  if (entry.args && entry.args.length > 0) {
    lines.push(`args = ${renderTomlStringArray(entry.args)}`);
  }
  if (entry.url) {
    lines.push(`url = ${renderTomlString(entry.url)}`);
  }
  if (entry.env && Object.keys(entry.env).length > 0) {
    lines.push(`env = ${renderTomlEnvTable(entry.env)}`);
  }
  if (entry.timeout) {
    lines.push(`startup_timeout_sec = ${entry.timeout}`);
  }

  return lines.join('\n');
}

function stripManagedCodexBlock(content: string): string {
  const managedBlockPattern = new RegExp(
    `${MANAGED_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${MANAGED_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`,
    'g',
  );

  return content.replace(managedBlockPattern, '').trimEnd();
}

export function renderManagedCodexMcpBlock(registry: UnifiedMcpRegistry): string {
  const names = Object.keys(registry);
  if (names.length === 0) {
    return '';
  }

  const blocks = names.map(name => renderCodexServerBlock(name, registry[name]));
  return [MANAGED_START, '', ...blocks.flatMap((block, index) => index === 0 ? [block] : ['', block]), '', MANAGED_END].join('\n');
}

export function syncCodexConfigToml(existingContent: string, registry: UnifiedMcpRegistry): { content: string; changed: boolean } {
  const base = stripManagedCodexBlock(existingContent);
  const managedBlock = renderManagedCodexMcpBlock(registry);
  const nextContent = managedBlock
    ? `${base ? `${base}\n\n` : ''}${managedBlock}\n`
    : (base ? `${base}\n` : '');

  return {
    content: nextContent,
    changed: nextContent !== existingContent,
  };
}

function parseCodexMcpRegistryEntries(content: string): UnifiedMcpRegistry {
  const entries: UnifiedMcpRegistry = {};
  const lines = content.split(/\r?\n/);
  let currentName: string | null = null;
  let currentEntry: UnifiedMcpRegistryEntry = {};

  const flushCurrent = () => {
    if (!currentName) return;
    const normalized = normalizeRegistryEntry(currentEntry);
    if (normalized) {
      entries[currentName] = normalized;
    }
    currentName = null;
    currentEntry = {};
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const sectionMatch = line.match(/^\[mcp_servers\.([^\]]+)\]$/);
    if (sectionMatch) {
      flushCurrent();
      currentName = sectionMatch[1].trim();
      currentEntry = {};
      continue;
    }

    if (!currentName) {
      continue;
    }

    const [rawKey, ...rawValueParts] = line.split('=');
    if (!rawKey || rawValueParts.length === 0) {
      continue;
    }

    const key = rawKey.trim();
    const value = rawValueParts.join('=').trim();

    if (key === 'command') {
      const parsed = parseTomlQuotedString(value);
      if (parsed) currentEntry.command = parsed;
    } else if (key === 'args') {
      const parsed = parseTomlStringArray(value);
      if (parsed) currentEntry.args = parsed;
    } else if (key === 'url') {
      const parsed = parseTomlQuotedString(value);
      if (parsed) currentEntry.url = parsed;
    } else if (key === 'env') {
      const parsed = parseTomlEnvTable(value);
      if (parsed) currentEntry.env = parsed;
    } else if (key === 'startup_timeout_sec') {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) currentEntry.timeout = parsed;
    }
  }

  flushCurrent();
  return Object.fromEntries(Object.entries(entries).sort(([left], [right]) => left.localeCompare(right)));
}

export function syncUnifiedMcpRegistryTargets(
  settings: Record<string, unknown>,
): { settings: Record<string, unknown>; result: UnifiedMcpRegistrySyncResult } {
  const registryPath = getUnifiedMcpRegistryPath();
  const codexConfigPath = getCodexConfigPath();
  const managedServerNames = readManagedServerNames();
  const registryState = loadOrBootstrapRegistry(settings);
  const registry = registryState.registry;
  const serverNames = Object.keys(registry);

  const claude = applyRegistryToClaudeSettings(settings, registry, managedServerNames);

  let codexChanged = false;
  const currentCodexConfig = existsSync(codexConfigPath) ? readFileSync(codexConfigPath, 'utf-8') : '';
  const nextCodexConfig = syncCodexConfigToml(currentCodexConfig, registry);
  if (nextCodexConfig.changed) {
    ensureParentDir(codexConfigPath);
    writeFileSync(codexConfigPath, nextCodexConfig.content);
    codexChanged = true;
  }

  if (registryState.registryExists) {
    writeManagedServerNames(serverNames);
  }

  return {
    settings: claude.settings,
    result: {
      registryPath,
      codexConfigPath,
      registryExists: registryState.registryExists,
      bootstrappedFromClaude: registryState.bootstrappedFromClaude,
      serverNames,
      claudeChanged: claude.changed,
      codexChanged,
    },
  };
}

function readJsonObject(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8'));
    return raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export function inspectUnifiedMcpRegistrySync(): UnifiedMcpRegistryStatus {
  const registryPath = getUnifiedMcpRegistryPath();
  const codexConfigPath = getCodexConfigPath();

  if (!existsSync(registryPath)) {
    return {
      registryPath,
      codexConfigPath,
      registryExists: false,
      serverNames: [],
      claudeMissing: [],
      claudeMismatched: [],
      codexMissing: [],
      codexMismatched: [],
    };
  }

  const registry = loadRegistryFromDisk(registryPath);
  const serverNames = Object.keys(registry);
  const claudeSettings = readJsonObject(join(getConfigDir(), 'settings.json'));
  const claudeEntries = extractClaudeMcpRegistry(claudeSettings);
  const codexEntries = existsSync(codexConfigPath)
    ? parseCodexMcpRegistryEntries(readFileSync(codexConfigPath, 'utf-8'))
    : {};

  const claudeMissing: string[] = [];
  const claudeMismatched: string[] = [];
  const codexMissing: string[] = [];
  const codexMismatched: string[] = [];

  for (const [name, entry] of Object.entries(registry)) {
    if (!claudeEntries[name]) {
      claudeMissing.push(name);
    } else if (!entriesEqual(claudeEntries[name], entry)) {
      claudeMismatched.push(name);
    }

    if (!codexEntries[name]) {
      codexMissing.push(name);
    } else if (!entriesEqual(codexEntries[name], entry)) {
      codexMismatched.push(name);
    }
  }

  return {
    registryPath,
    codexConfigPath,
    registryExists: true,
    serverNames,
    claudeMissing,
    claudeMismatched,
    codexMissing,
    codexMismatched,
  };
}
