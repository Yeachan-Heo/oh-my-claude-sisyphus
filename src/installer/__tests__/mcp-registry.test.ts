import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  applyRegistryToClaudeSettings,
  getUnifiedMcpRegistryPath,
  getCodexConfigPath,
  inspectUnifiedMcpRegistrySync,
  syncCodexConfigToml,
  syncUnifiedMcpRegistryTargets,
} from '../mcp-registry.js';

describe('unified MCP registry sync', () => {
  let testRoot: string;
  let claudeDir: string;
  let codexDir: string;
  let omcDir: string;

  beforeEach(() => {
    testRoot = mkdtempSync(join(tmpdir(), 'omc-mcp-registry-'));
    claudeDir = join(testRoot, '.claude');
    codexDir = join(testRoot, '.codex');
    omcDir = join(testRoot, '.omc');

    mkdirSync(claudeDir, { recursive: true });
    mkdirSync(codexDir, { recursive: true });
    mkdirSync(omcDir, { recursive: true });
    process.env.CLAUDE_CONFIG_DIR = claudeDir;
    process.env.CODEX_HOME = codexDir;
    process.env.OMC_HOME = omcDir;
  });

  afterEach(() => {
    delete process.env.CLAUDE_CONFIG_DIR;
    delete process.env.CODEX_HOME;
    delete process.env.OMC_HOME;

    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('bootstraps the registry from Claude settings and syncs Codex config.toml from the same snapshot', () => {
    const settings = {
      theme: 'dark',
      mcpServers: {
        gitnexus: {
          command: 'gitnexus',
          args: ['mcp'],
          timeout: 15,
        },
      },
    };

    const { settings: syncedSettings, result } = syncUnifiedMcpRegistryTargets(settings);

    expect(result.bootstrappedFromClaude).toBe(true);
    expect(result.registryExists).toBe(true);
    expect(result.serverNames).toEqual(['gitnexus']);
    expect(syncedSettings).toEqual(settings);

    const registryPath = getUnifiedMcpRegistryPath();
    expect(JSON.parse(readFileSync(registryPath, 'utf-8'))).toEqual(settings.mcpServers);

    const codexConfig = readFileSync(getCodexConfigPath(), 'utf-8');
    expect(codexConfig).toContain('# BEGIN OMC MANAGED MCP REGISTRY');
    expect(codexConfig).toContain('[mcp_servers.gitnexus]');
    expect(codexConfig).toContain('command = "gitnexus"');
    expect(codexConfig).toContain('args = ["mcp"]');
    expect(codexConfig).toContain('startup_timeout_sec = 15');
  });

  it('preserves unrelated Claude settings while replacing registry-defined MCP entries', () => {
    const existingSettings = {
      theme: 'dark',
      statusLine: {
        type: 'command',
        command: 'node hud.mjs',
      },
      mcpServers: {
        gitnexus: {
          command: 'old-gitnexus',
          args: ['legacy'],
        },
        customLocal: {
          command: 'custom-local',
          args: ['serve'],
        },
      },
    };

    const registry = {
      gitnexus: {
        command: 'gitnexus',
        args: ['mcp'],
      },
    };

    const { settings, changed } = applyRegistryToClaudeSettings(existingSettings, registry, ['gitnexus']);
    expect(changed).toBe(true);
    expect(settings.theme).toBe('dark');
    expect(settings.statusLine).toEqual(existingSettings.statusLine);
    expect((settings.mcpServers as Record<string, unknown>).customLocal).toEqual(existingSettings.mcpServers.customLocal);
    expect((settings.mcpServers as Record<string, unknown>).gitnexus).toEqual(registry.gitnexus);
  });

  it('keeps unrelated Codex TOML and is idempotent across repeated syncs', () => {
    const existingToml = [
      'model = "gpt-5"',
      '',
      '[mcp_servers.custom_local]',
      'command = "custom-local"',
      'args = ["serve"]',
      '',
      '# BEGIN OMC MANAGED MCP REGISTRY',
      '',
      '[mcp_servers.old_registry]',
      'command = "legacy"',
      '',
      '# END OMC MANAGED MCP REGISTRY',
      '',
    ].join('\n');

    const registry = {
      gitnexus: {
        command: 'gitnexus',
        args: ['mcp'],
      },
    };

    const first = syncCodexConfigToml(existingToml, registry);
    expect(first.changed).toBe(true);
    expect(first.content).toContain('model = "gpt-5"');
    expect(first.content).toContain('[mcp_servers.custom_local]');
    expect(first.content).toContain('[mcp_servers.gitnexus]');
    expect(first.content).not.toContain('[mcp_servers.old_registry]');

    const second = syncCodexConfigToml(first.content, registry);
    expect(second.changed).toBe(false);
    expect(second.content).toBe(first.content);
  });

  it('removes previously managed Claude and Codex MCP entries when the registry becomes empty', () => {
    writeFileSync(join(omcDir, 'mcp-registry-state.json'), JSON.stringify({ managedServers: ['gitnexus'] }, null, 2));
    writeFileSync(getUnifiedMcpRegistryPath(), JSON.stringify({}, null, 2));
    writeFileSync(getCodexConfigPath(), [
      'model = "gpt-5"',
      '',
      '# BEGIN OMC MANAGED MCP REGISTRY',
      '',
      '[mcp_servers.gitnexus]',
      'command = "gitnexus"',
      'args = ["mcp"]',
      '',
      '# END OMC MANAGED MCP REGISTRY',
      '',
    ].join('\n'));

    const settings = {
      mcpServers: {
        gitnexus: { command: 'gitnexus', args: ['mcp'] },
        customLocal: { command: 'custom-local', args: ['serve'] },
      },
    };

    const { settings: syncedSettings, result } = syncUnifiedMcpRegistryTargets(settings);

    expect(result.registryExists).toBe(true);
    expect(result.serverNames).toEqual([]);
    expect(result.claudeChanged).toBe(true);
    expect(result.codexChanged).toBe(true);
    expect(syncedSettings).toEqual({
      mcpServers: {
        customLocal: { command: 'custom-local', args: ['serve'] },
      },
    });
    expect(readFileSync(getCodexConfigPath(), 'utf-8')).toBe('model = "gpt-5"\n');
  });

  it('detects mismatched server definitions during doctor inspection, not just missing names', () => {
    writeFileSync(getUnifiedMcpRegistryPath(), JSON.stringify({
      gitnexus: { command: 'gitnexus', args: ['mcp'], timeout: 15 },
    }, null, 2));
    writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify({
      mcpServers: {
        gitnexus: { command: 'gitnexus', args: ['wrong'] },
      },
    }, null, 2));
    mkdirSync(codexDir, { recursive: true });
    writeFileSync(getCodexConfigPath(), [
      '# BEGIN OMC MANAGED MCP REGISTRY',
      '',
      '[mcp_servers.gitnexus]',
      'command = "gitnexus"',
      'args = ["wrong"]',
      '',
      '# END OMC MANAGED MCP REGISTRY',
      '',
    ].join('\n'));

    const status = inspectUnifiedMcpRegistrySync();

    expect(status.claudeMissing).toEqual([]);
    expect(status.codexMissing).toEqual([]);
    expect(status.claudeMismatched).toEqual(['gitnexus']);
    expect(status.codexMismatched).toEqual(['gitnexus']);
  });
});
