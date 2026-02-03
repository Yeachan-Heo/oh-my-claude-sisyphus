/**
 * Tests for Codex Configuration Reader
 */

import { describe, it, expect } from 'vitest';
import { parseSimpleToml } from '../codex-config.js';

describe('codex-config', () => {
  describe('parseSimpleToml', () => {
    it('should parse simple key-value pairs', () => {
      const toml = `
key = "value"
number = 42
boolean = true
`;
      const result = parseSimpleToml(toml);
      expect(result.key).toBe('value');
      expect(result.number).toBe(42);
      expect(result.boolean).toBe(true);
    });

    it('should parse arrays', () => {
      const toml = `
notify = ["command", "arg1", "arg2"]
numbers = [1, 2, 3]
`;
      const result = parseSimpleToml(toml);
      expect(result.notify).toEqual(['command', 'arg1', 'arg2']);
      expect(result.numbers).toEqual([1, 2, 3]);
    });

    it('should parse sections', () => {
      const toml = `
[tui]
status_line = ["omc", "status"]
status_line_timeout_ms = 500
`;
      const result = parseSimpleToml(toml);
      expect(result.tui).toBeDefined();
      const tui = result.tui as Record<string, unknown>;
      expect(tui.status_line).toEqual(['omc', 'status']);
      expect(tui.status_line_timeout_ms).toBe(500);
    });

    it('should parse nested sections', () => {
      const toml = `
[mcp-servers.my-server]
command = "/path/to/server"
args = ["--flag"]
`;
      const result = parseSimpleToml(toml);
      const mcpServers = result['mcp-servers'] as Record<string, unknown>;
      expect(mcpServers).toBeDefined();
      const myServer = mcpServers['my-server'] as Record<string, unknown>;
      expect(myServer.command).toBe('/path/to/server');
      expect(myServer.args).toEqual(['--flag']);
    });

    it('should skip comments', () => {
      const toml = `
# This is a comment
key = "value"
# Another comment
number = 42
`;
      const result = parseSimpleToml(toml);
      expect(result.key).toBe('value');
      expect(result.number).toBe(42);
    });

    it('should skip empty lines', () => {
      const toml = `
key = "value"

number = 42
`;
      const result = parseSimpleToml(toml);
      expect(result.key).toBe('value');
      expect(result.number).toBe(42);
    });

    it('should handle single-quoted strings', () => {
      const toml = `
key = 'single quoted'
`;
      const result = parseSimpleToml(toml);
      expect(result.key).toBe('single quoted');
    });

    it('should handle false boolean', () => {
      const toml = `
enabled = false
`;
      const result = parseSimpleToml(toml);
      expect(result.enabled).toBe(false);
    });

    it('should handle empty arrays', () => {
      const toml = `
empty = []
`;
      const result = parseSimpleToml(toml);
      expect(result.empty).toEqual([]);
    });

    it('should parse a realistic Codex config', () => {
      const toml = `
# Codex CLI configuration
model = "gpt-4"
approval_mode = "suggest"
sandbox_permissions = ["disk_full_read_access", "disk_repo_write_access"]

# Notify hook
notify = ["omc", "hook", "--platform=codex"]

[tui]
status_line = ["omc", "status", "--codex"]
status_line_timeout_ms = 500

[mcp-servers.context7]
command = "npx"
args = ["-y", "@context7/mcp-server"]
`;
      const result = parseSimpleToml(toml);

      expect(result.model).toBe('gpt-4');
      expect(result.approval_mode).toBe('suggest');
      expect(result.sandbox_permissions).toEqual([
        'disk_full_read_access',
        'disk_repo_write_access'
      ]);
      expect(result.notify).toEqual(['omc', 'hook', '--platform=codex']);

      const tui = result.tui as Record<string, unknown>;
      expect(tui.status_line).toEqual(['omc', 'status', '--codex']);
      expect(tui.status_line_timeout_ms).toBe(500);

      const mcpServers = result['mcp-servers'] as Record<string, unknown>;
      const context7 = mcpServers['context7'] as Record<string, unknown>;
      expect(context7.command).toBe('npx');
      expect(context7.args).toEqual(['-y', '@context7/mcp-server']);
    });
  });
});
