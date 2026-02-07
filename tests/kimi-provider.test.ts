
import { describe, it, expect, vi } from 'vitest';
import { createSisyphusSession } from '../src/index';

// Mock the kimi-core module
vi.mock('../src/mcp/kimi-core.js', () => ({
  detectKimiCli: () => '/home/user/.uv/bin/kimi',
  runKimiPrompt: async () => ({ success: true, result: 'Kimi response' }),
}));

describe('Kimi Provider Integration', () => {
  it('should include kimiMcpServer when creating a session', () => {
    const session = createSisyphusSession();
    const mcpServers = session.queryOptions.options.mcpServers;

    expect(mcpServers).toHaveProperty('ki');
  });

  it('should include mcp__ki__* in the allowedTools list', () => {
    const session = createSisyphusSession();
    const allowedTools = session.queryOptions.options.allowedTools;

    expect(allowedTools).toContain('mcp__ki__*');
  });
});
