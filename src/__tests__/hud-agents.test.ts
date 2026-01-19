/**
 * Sisyphus HUD - Agents Element Tests
 *
 * Tests for agent visualization with different formats.
 */

import { describe, it, expect } from 'vitest';
import {
  renderAgents,
  renderAgentsCoded,
  renderAgentsCodedWithDuration,
  renderAgentsDetailed,
  renderAgentsWithDescriptions,
  renderAgentsDescOnly,
  renderAgentsByFormat,
} from '../hud/elements/agents.js';
import type { ActiveAgent } from '../hud/types.js';

// ANSI color codes for verification
const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';

// Helper to create mock agents
function createAgent(
  type: string,
  model?: string,
  startTime?: Date
): ActiveAgent {
  return {
    id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    model,
    status: 'running',
    startTime: startTime || new Date(),
  };
}

describe('Agents Element', () => {
  describe('renderAgents (count format)', () => {
    it('should return null for empty array', () => {
      expect(renderAgents([])).toBeNull();
    });

    it('should return null when no agents are running', () => {
      const agents: ActiveAgent[] = [
        { ...createAgent('oracle'), status: 'completed' },
      ];
      expect(renderAgents(agents)).toBeNull();
    });

    it('should show count of running agents', () => {
      const agents: ActiveAgent[] = [
        createAgent('oracle'),
        createAgent('explore'),
      ];
      const result = renderAgents(agents);
      expect(result).toBe(`agents:${CYAN}2${RESET}`);
    });
  });

  describe('renderAgentsCoded (codes format)', () => {
    it('should return null for empty array', () => {
      expect(renderAgentsCoded([])).toBeNull();
    });

    it('should show single-character codes for known agents', () => {
      const agents: ActiveAgent[] = [
        createAgent('oh-my-claude-sisyphus:oracle', 'opus'),
      ];
      const result = renderAgentsCoded(agents);
      // Oracle with opus should be uppercase O in magenta
      expect(result).toContain('agents:');
      expect(result).toContain('O');
    });

    it('should use lowercase for sonnet/haiku tiers', () => {
      const agents: ActiveAgent[] = [
        createAgent('oh-my-claude-sisyphus:explore', 'haiku'),
      ];
      const result = renderAgentsCoded(agents);
      expect(result).toContain('e');
    });

    it('should handle multiple agents', () => {
      const agents: ActiveAgent[] = [
        createAgent('oh-my-claude-sisyphus:oracle', 'opus'),
        createAgent('oh-my-claude-sisyphus:explore', 'haiku'),
        createAgent('oh-my-claude-sisyphus:sisyphus-junior', 'sonnet'),
      ];
      const result = renderAgentsCoded(agents);
      expect(result).toBeDefined();
      // Should contain codes for all three
      expect(result!.replace(/\x1b\[[0-9;]*m/g, '')).toBe('agents:Oes');
    });

    it('should handle agents without model info', () => {
      const agents: ActiveAgent[] = [createAgent('oh-my-claude-sisyphus:oracle')];
      const result = renderAgentsCoded(agents);
      expect(result).toContain('O');
    });

    it('should use first letter for unknown agent types', () => {
      const agents: ActiveAgent[] = [
        createAgent('oh-my-claude-sisyphus:unknown-agent', 'sonnet'),
      ];
      const result = renderAgentsCoded(agents);
      expect(result!.replace(/\x1b\[[0-9;]*m/g, '')).toBe('agents:u');
    });
  });

  describe('renderAgentsCodedWithDuration (codes-duration format)', () => {
    it('should return null for empty array', () => {
      expect(renderAgentsCodedWithDuration([])).toBeNull();
    });

    it('should not show duration for very recent agents', () => {
      const agents: ActiveAgent[] = [
        createAgent('oh-my-claude-sisyphus:oracle', 'opus', new Date()),
      ];
      const result = renderAgentsCodedWithDuration(agents);
      // No duration suffix for <10s
      expect(result!.replace(/\x1b\[[0-9;]*m/g, '')).toBe('agents:O');
    });

    it('should show seconds for agents running 10-59s', () => {
      const agents: ActiveAgent[] = [
        createAgent(
          'oh-my-claude-sisyphus:oracle',
          'opus',
          new Date(Date.now() - 30000)
        ), // 30 seconds ago
      ];
      const result = renderAgentsCodedWithDuration(agents);
      const stripped = result!.replace(/\x1b\[[0-9;]*m/g, '');
      expect(stripped).toMatch(/agents:O\(30s\)/);
    });

    it('should show minutes for agents running 1-9 min', () => {
      const agents: ActiveAgent[] = [
        createAgent(
          'oh-my-claude-sisyphus:oracle',
          'opus',
          new Date(Date.now() - 180000)
        ), // 3 minutes ago
      ];
      const result = renderAgentsCodedWithDuration(agents);
      const stripped = result!.replace(/\x1b\[[0-9;]*m/g, '');
      expect(stripped).toMatch(/agents:O\(3m\)/);
    });

    it('should show alert for agents running 10+ min', () => {
      const agents: ActiveAgent[] = [
        createAgent(
          'oh-my-claude-sisyphus:oracle',
          'opus',
          new Date(Date.now() - 600000)
        ), // 10 minutes ago
      ];
      const result = renderAgentsCodedWithDuration(agents);
      const stripped = result!.replace(/\x1b\[[0-9;]*m/g, '');
      expect(stripped).toMatch(/agents:O!/);
    });
  });

  describe('renderAgentsDetailed (detailed format)', () => {
    it('should return null for empty array', () => {
      expect(renderAgentsDetailed([])).toBeNull();
    });

    it('should show full agent names', () => {
      const agents: ActiveAgent[] = [createAgent('oh-my-claude-sisyphus:oracle')];
      const result = renderAgentsDetailed(agents);
      expect(result).toContain('oracle');
    });

    it('should abbreviate common long names', () => {
      const agents: ActiveAgent[] = [
        createAgent('oh-my-claude-sisyphus:sisyphus-junior', 'sonnet'),
      ];
      const result = renderAgentsDetailed(agents);
      expect(result).toContain('sj');
    });

    it('should include duration for long-running agents', () => {
      const agents: ActiveAgent[] = [
        createAgent(
          'oh-my-claude-sisyphus:oracle',
          'opus',
          new Date(Date.now() - 120000)
        ), // 2 minutes
      ];
      const result = renderAgentsDetailed(agents);
      expect(result).toContain('(2m)');
    });
  });

  describe('renderAgentsByFormat (format router)', () => {
    const agents: ActiveAgent[] = [
      createAgent('oh-my-claude-sisyphus:oracle', 'opus'),
      createAgent('oh-my-claude-sisyphus:explore', 'haiku'),
    ];

    it('should route to count format', () => {
      const result = renderAgentsByFormat(agents, 'count');
      expect(result).toBe(`agents:${CYAN}2${RESET}`);
    });

    it('should route to codes format', () => {
      const result = renderAgentsByFormat(agents, 'codes');
      expect(result).toContain('agents:');
      expect(result!.replace(/\x1b\[[0-9;]*m/g, '')).toBe('agents:Oe');
    });

    it('should route to codes-duration format', () => {
      const result = renderAgentsByFormat(agents, 'codes-duration');
      expect(result).toContain('agents:');
    });

    it('should route to detailed format', () => {
      const result = renderAgentsByFormat(agents, 'detailed');
      expect(result).toContain('oracle');
    });

    it('should route to descriptions format', () => {
      const agentsWithDesc: ActiveAgent[] = [
        {
          ...createAgent('oh-my-claude-sisyphus:oracle', 'opus'),
          description: 'Analyzing code',
        },
      ];
      const result = renderAgentsByFormat(agentsWithDesc, 'descriptions');
      expect(result).toContain('O');
      expect(result).toContain('Analyzing code');
    });

    it('should route to tasks format', () => {
      const agentsWithDesc: ActiveAgent[] = [
        {
          ...createAgent('oh-my-claude-sisyphus:oracle', 'opus'),
          description: 'Analyzing code',
        },
      ];
      const result = renderAgentsByFormat(agentsWithDesc, 'tasks');
      expect(result).toContain('[');
      expect(result).toContain('Analyzing code');
      expect(result).not.toContain('O:'); // tasks format doesn't show codes
    });

    it('should default to codes for unknown format', () => {
      const result = renderAgentsByFormat(agents, 'unknown' as any);
      // Should fall back to codes format
      expect(result).toContain('agents:');
      expect(result!.replace(/\x1b\[[0-9;]*m/g, '')).toBe('agents:Oe');
    });
  });

  describe('Agent type codes', () => {
    const testCases = [
      { type: 'oracle', model: 'opus', expected: 'O' },
      { type: 'oracle-low', model: 'haiku', expected: 'o' },
      { type: 'oracle-medium', model: 'sonnet', expected: 'o' },
      { type: 'explore', model: 'haiku', expected: 'e' },
      { type: 'explore-medium', model: 'sonnet', expected: 'e' },
      { type: 'sisyphus-junior', model: 'sonnet', expected: 's' },
      { type: 'sisyphus-junior-low', model: 'haiku', expected: 's' },
      { type: 'sisyphus-junior-high', model: 'opus', expected: 'S' },
      { type: 'frontend-engineer', model: 'sonnet', expected: 'f' },
      { type: 'frontend-engineer-high', model: 'opus', expected: 'F' },
      { type: 'librarian', model: 'sonnet', expected: 'l' },
      { type: 'document-writer', model: 'haiku', expected: 'd' },
      { type: 'prometheus', model: 'opus', expected: 'P' },
      { type: 'momus', model: 'opus', expected: 'M' },
      { type: 'metis', model: 'opus', expected: 'T' },
      { type: 'qa-tester', model: 'sonnet', expected: 'q' },
      { type: 'multimodal-looker', model: 'sonnet', expected: 'v' },
    ];

    testCases.forEach(({ type, model, expected }) => {
      it(`should render ${type} (${model}) as '${expected}'`, () => {
        const agents: ActiveAgent[] = [
          createAgent(`oh-my-claude-sisyphus:${type}`, model),
        ];
        const result = renderAgentsCoded(agents);
        const stripped = result!.replace(/\x1b\[[0-9;]*m/g, '');
        expect(stripped).toBe(`agents:${expected}`);
      });
    });
  });

  describe('Model tier color coding', () => {
    it('should use magenta for opus tier', () => {
      const agents: ActiveAgent[] = [
        createAgent('oh-my-claude-sisyphus:oracle', 'opus'),
      ];
      const result = renderAgentsCoded(agents);
      expect(result).toContain(MAGENTA);
    });

    it('should use yellow for sonnet tier', () => {
      const agents: ActiveAgent[] = [
        createAgent('oh-my-claude-sisyphus:sisyphus-junior', 'sonnet'),
      ];
      const result = renderAgentsCoded(agents);
      expect(result).toContain(YELLOW);
    });

    it('should use green for haiku tier', () => {
      const agents: ActiveAgent[] = [
        createAgent('oh-my-claude-sisyphus:explore', 'haiku'),
      ];
      const result = renderAgentsCoded(agents);
      expect(result).toContain(GREEN);
    });

    it('should use cyan for unknown model', () => {
      const agents: ActiveAgent[] = [
        createAgent('oh-my-claude-sisyphus:oracle'),
      ];
      const result = renderAgentsCoded(agents);
      expect(result).toContain(CYAN);
    });
  });
});
