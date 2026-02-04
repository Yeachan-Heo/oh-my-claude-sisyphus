import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getAgentDefinitions, getDefaultAgentTier } from '../agents/definitions.js';
import type { AgentTier } from '../agents/definitions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Agent Registry Validation', () => {
  test('agent count matches documentation', () => {
    const agents = getAgentDefinitions();
    expect(Object.keys(agents).length).toBe(34);
  });

  test('all agents have .md prompt files', () => {
    const agents = Object.keys(getAgentDefinitions());
    const agentsDir = path.join(__dirname, '../../agents');
    for (const name of agents) {
      const mdPath = path.join(agentsDir, `${name}.md`);
      expect(fs.existsSync(mdPath), `Missing .md file for agent: ${name}`).toBe(true);
    }
  });

  test('all registry agents are exported from index.ts', async () => {
    const registryAgents = Object.keys(getAgentDefinitions());
    const exports = await import('../agents/index.js') as Record<string, unknown>;
    for (const name of registryAgents) {
      const exportName = name.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()) + 'Agent';
      expect(exports[exportName], `Missing export for agent: ${name} (expected ${exportName})`).toBeDefined();
    }
  });

  test('no hardcoded prompts in base agent .ts files', () => {
    const baseAgents = ['architect', 'executor', 'explore', 'designer', 'researcher',
                        'writer', 'vision', 'planner', 'critic', 'analyst', 'scientist', 'qa-tester'];
    const agentsDir = path.join(__dirname, '../agents');
    for (const name of baseAgents) {
      const content = fs.readFileSync(path.join(agentsDir, `${name}.ts`), 'utf-8');
      expect(content, `Hardcoded prompt found in ${name}.ts`).not.toMatch(/const\s+\w+_PROMPT\s*=\s*`/);
    }
  });
});

/**
 * Tests for tiered agent loading (issue #405 fix)
 * @see https://github.com/Yeachan-Heo/oh-my-claudecode/issues/405
 */
describe('Agent Tier Loading', () => {
  const originalEnv = process.env.OMC_AGENT_TIERS;

  afterEach(() => {
    // Restore original env
    if (originalEnv === undefined) {
      delete process.env.OMC_AGENT_TIERS;
    } else {
      process.env.OMC_AGENT_TIERS = originalEnv;
    }
  });

  test('tier "all" loads 34 agents', () => {
    const agents = getAgentDefinitions({ tier: 'all' });
    expect(Object.keys(agents).length).toBe(34);
  });

  test('tier "standard" loads 22 agents', () => {
    const agents = getAgentDefinitions({ tier: 'standard' });
    expect(Object.keys(agents).length).toBe(22);
    // Should include base agents
    expect(agents.architect).toBeDefined();
    expect(agents.executor).toBeDefined();
    expect(agents.explore).toBeDefined();
    // Should include key tiered variants
    expect(agents['architect-low']).toBeDefined();
    expect(agents['executor-low']).toBeDefined();
    // Should include specialized agents
    expect(agents['security-reviewer']).toBeDefined();
    expect(agents['git-master']).toBeDefined();
    // Should NOT include all tiered variants
    expect(agents['architect-medium']).toBeUndefined();
    expect(agents['executor-high']).toBeUndefined();
  });

  test('tier "base" loads 13 agents', () => {
    const agents = getAgentDefinitions({ tier: 'base' });
    expect(Object.keys(agents).length).toBe(13);
    // Should include base agents
    expect(agents.architect).toBeDefined();
    expect(agents.executor).toBeDefined();
    expect(agents.explore).toBeDefined();
    expect(agents.planner).toBeDefined();
    expect(agents.critic).toBeDefined();
    // Should NOT include tiered variants
    expect(agents['architect-low']).toBeUndefined();
    expect(agents['executor-low']).toBeUndefined();
    // Should NOT include specialized agents
    expect(agents['security-reviewer']).toBeUndefined();
    expect(agents['git-master']).toBeUndefined();
  });

  test('tier "minimal" loads 6 agents', () => {
    const agents = getAgentDefinitions({ tier: 'minimal' });
    expect(Object.keys(agents).length).toBe(6);
    // Should include only essential agents
    expect(agents.architect).toBeDefined();
    expect(agents.executor).toBeDefined();
    expect(agents.explore).toBeDefined();
    expect(agents.researcher).toBeDefined();
    expect(agents.designer).toBeDefined();
    expect(agents.writer).toBeDefined();
    // Should NOT include other base agents
    expect(agents.planner).toBeUndefined();
    expect(agents.critic).toBeUndefined();
    expect(agents.scientist).toBeUndefined();
  });

  test('OMC_AGENT_TIERS env var controls default tier', () => {
    process.env.OMC_AGENT_TIERS = 'minimal';
    expect(getDefaultAgentTier()).toBe('minimal');

    process.env.OMC_AGENT_TIERS = 'base';
    expect(getDefaultAgentTier()).toBe('base');

    process.env.OMC_AGENT_TIERS = 'standard';
    expect(getDefaultAgentTier()).toBe('standard');

    process.env.OMC_AGENT_TIERS = 'all';
    expect(getDefaultAgentTier()).toBe('all');
  });

  test('invalid OMC_AGENT_TIERS defaults to "all"', () => {
    process.env.OMC_AGENT_TIERS = 'invalid';
    expect(getDefaultAgentTier()).toBe('all');

    process.env.OMC_AGENT_TIERS = '';
    expect(getDefaultAgentTier()).toBe('all');
  });

  test('backward compatible with old overrides signature', () => {
    // Old API: getAgentDefinitions(overrides)
    const agents = getAgentDefinitions({
      architect: { description: 'Custom description' }
    });
    // Should still work (defaults to 'all' tier)
    expect(Object.keys(agents).length).toBe(34);
    expect(agents.architect.description).toBe('Custom description');
  });

  test('new API with both tier and overrides', () => {
    const agents = getAgentDefinitions({
      tier: 'minimal',
      overrides: {
        architect: { description: 'Custom architect' }
      }
    });
    expect(Object.keys(agents).length).toBe(6);
    expect(agents.architect.description).toBe('Custom architect');
  });
});
