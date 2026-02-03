/**
 * Tests for Unified Hook Dispatcher
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  registerHook,
  unregisterHook,
  getHook,
  getAllHooks,
  clearHooks,
  getAdapter,
  dispatch,
  on,
  onTool,
  onSession,
  onTurn,
} from '../dispatcher.js';
import { resetPlatformCache } from '../platform-detect.js';
import type { UnifiedHookInput, UnifiedHookOutput } from '../types.js';

describe('dispatcher', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    clearHooks();
    resetPlatformCache();
    process.env.OMC_PLATFORM = 'claude-code';
  });

  afterEach(() => {
    clearHooks();
    process.env = { ...originalEnv };
    resetPlatformCache();
  });

  describe('hook registration', () => {
    it('should register a hook', () => {
      registerHook({
        id: 'test-hook',
        events: ['tool:pre'],
        handler: async () => ({ continue: true }),
      });

      expect(getHook('test-hook')).toBeDefined();
      expect(getHook('test-hook')!.id).toBe('test-hook');
    });

    it('should unregister a hook', () => {
      registerHook({
        id: 'test-hook',
        events: ['tool:pre'],
        handler: async () => ({ continue: true }),
      });

      expect(unregisterHook('test-hook')).toBe(true);
      expect(getHook('test-hook')).toBeUndefined();
    });

    it('should return false when unregistering non-existent hook', () => {
      expect(unregisterHook('non-existent')).toBe(false);
    });

    it('should list all hooks', () => {
      registerHook({
        id: 'hook-1',
        events: ['tool:pre'],
        handler: async () => ({ continue: true }),
      });
      registerHook({
        id: 'hook-2',
        events: ['tool:post'],
        handler: async () => ({ continue: true }),
      });

      const hooks = getAllHooks();
      expect(hooks).toHaveLength(2);
    });

    it('should clear all hooks', () => {
      registerHook({
        id: 'hook-1',
        events: ['tool:pre'],
        handler: async () => ({ continue: true }),
      });

      clearHooks();
      expect(getAllHooks()).toHaveLength(0);
    });
  });

  describe('convenience registration', () => {
    it('should register with on()', () => {
      on('test', 'tool:pre', () => ({ continue: true }));
      expect(getHook('test')).toBeDefined();
      expect(getHook('test')!.events).toContain('tool:pre');
    });

    it('should register with on() for multiple events', () => {
      on('test', ['tool:pre', 'tool:post'], () => ({ continue: true }));
      expect(getHook('test')!.events).toHaveLength(2);
    });

    it('should register with onTool()', () => {
      onTool('test', 'pre', () => ({ continue: true }));
      expect(getHook('test')!.events).toContain('tool:pre');
    });

    it('should register with onTool() for post', () => {
      onTool('test', 'post', () => ({ continue: true }));
      expect(getHook('test')!.events).toContain('tool:post');
    });

    it('should register with onSession()', () => {
      onSession('test', 'start', () => ({ continue: true }));
      expect(getHook('test')!.events).toContain('session:start');
    });

    it('should register with onTurn()', () => {
      onTurn('test', 'complete', () => ({ continue: true }));
      expect(getHook('test')!.events).toContain('turn:complete');
    });
  });

  describe('adapter selection', () => {
    it('should return Claude Code adapter by default', () => {
      const adapter = getAdapter();
      expect(adapter.platform).toBe('claude-code');
    });

    it('should return Codex adapter when specified', () => {
      const adapter = getAdapter('codex');
      expect(adapter.platform).toBe('codex');
    });
  });

  describe('dispatch', () => {
    it('should dispatch to matching hooks', async () => {
      let called = false;
      on('test', 'tool:pre', () => {
        called = true;
        return { continue: true, message: 'Hook ran!' };
      });

      const result = await dispatch('PreToolUse', {
        toolName: 'Write',
        directory: '/test',
      }, 'claude-code');

      expect(called).toBe(true);
      expect(result.message).toBe('Hook ran!');
    });

    it('should not dispatch to non-matching hooks', async () => {
      let called = false;
      on('test', 'tool:post', () => {
        called = true;
        return { continue: true };
      });

      await dispatch('PreToolUse', {
        toolName: 'Write',
        directory: '/test',
      }, 'claude-code');

      expect(called).toBe(false);
    });

    it('should combine messages from multiple hooks', async () => {
      on('hook-1', 'tool:pre', () => ({
        continue: true,
        message: 'Message 1',
      }));
      on('hook-2', 'tool:pre', () => ({
        continue: true,
        message: 'Message 2',
      }));

      const result = await dispatch('PreToolUse', {
        toolName: 'Write',
        directory: '/test',
      }, 'claude-code');

      expect(result.message).toContain('Message 1');
      expect(result.message).toContain('Message 2');
    });

    it('should respect priority order', async () => {
      const order: string[] = [];

      registerHook({
        id: 'low-priority',
        events: ['tool:pre'],
        handler: () => { order.push('low'); return { continue: true }; },
        priority: 1,
      });
      registerHook({
        id: 'high-priority',
        events: ['tool:pre'],
        handler: () => { order.push('high'); return { continue: true }; },
        priority: 10,
      });

      await dispatch('PreToolUse', {
        toolName: 'Write',
        directory: '/test',
      }, 'claude-code');

      expect(order).toEqual(['high', 'low']);
    });

    it('should stop on blocking output (Claude Code)', async () => {
      const order: string[] = [];

      registerHook({
        id: 'blocker',
        events: ['tool:pre'],
        handler: () => {
          order.push('blocker');
          return { continue: false, reason: 'Blocked!' };
        },
        priority: 10,
      });
      registerHook({
        id: 'after-blocker',
        events: ['tool:pre'],
        handler: () => {
          order.push('after');
          return { continue: true };
        },
        priority: 1,
      });

      const result = await dispatch('PreToolUse', {
        toolName: 'Write',
        directory: '/test',
      }, 'claude-code');

      expect(result.continue).toBe(false);
      expect(result.reason).toBe('Blocked!');
      expect(order).toEqual(['blocker']); // Second hook should not run
    });

    it('should filter by tool matcher', async () => {
      let called = false;
      registerHook({
        id: 'write-only',
        events: ['tool:pre'],
        handler: () => {
          called = true;
          return { continue: true };
        },
        toolMatcher: /^Write$/,
      });

      // Should NOT trigger (wrong tool name)
      await dispatch('PreToolUse', {
        toolName: 'Read',
        directory: '/test',
      }, 'claude-code');
      expect(called).toBe(false);

      // Should trigger (matching tool name)
      await dispatch('PreToolUse', {
        toolName: 'Write',
        directory: '/test',
      }, 'claude-code');
      expect(called).toBe(true);
    });

    it('should skip disabled hooks', async () => {
      let called = false;
      registerHook({
        id: 'disabled-hook',
        events: ['tool:pre'],
        handler: () => {
          called = true;
          return { continue: true };
        },
        enabled: false,
      });

      await dispatch('PreToolUse', {
        toolName: 'Write',
        directory: '/test',
      }, 'claude-code');

      expect(called).toBe(false);
    });

    it('should handle handler errors gracefully', async () => {
      on('error-hook', 'tool:pre', () => {
        throw new Error('Handler exploded!');
      });

      // Should not throw
      const result = await dispatch('PreToolUse', {
        toolName: 'Write',
        directory: '/test',
      }, 'claude-code');

      expect(result.continue).toBe(true);
    });

    it('should return continue:true when no hooks match', async () => {
      const result = await dispatch('PreToolUse', {
        toolName: 'Write',
        directory: '/test',
      }, 'claude-code');

      expect(result.continue).toBe(true);
    });
  });

  describe('Codex dispatch', () => {
    it('should dispatch Codex events', async () => {
      let receivedInput: UnifiedHookInput | null = null;

      on('codex-hook', 'turn:complete', (input) => {
        receivedInput = input;
        return { continue: true, message: 'Turn noted!' };
      });

      const payload = {
        type: 'agent-turn-complete',
        'turn-id': 'turn-123',
        'thread-id': 'thread-456',
        'input-messages': [],
        'last-assistant-message': 'done',
        cwd: '/project',
      };

      const result = await dispatch('agent-turn-complete', payload, 'codex');

      expect(receivedInput).not.toBeNull();
      expect(receivedInput!.event).toBe('turn:complete');
      expect(receivedInput!.turnId).toBe('turn-123');
      expect(receivedInput!.platform).toBe('codex');
      expect(result.message).toBe('Turn noted!');
    });

    it('should gracefully degrade blocking on Codex', async () => {
      on('blocker', 'turn:complete', () => ({
        continue: false,
        reason: 'Blocked',
      }));

      const result = await dispatch('agent-turn-complete', {
        type: 'agent-turn-complete',
        cwd: '/test',
        'turn-id': '1',
        'thread-id': '1',
        'input-messages': [],
        'last-assistant-message': '',
      }, 'codex');

      // Codex can't block, so should be overridden
      expect(result.continue).toBe(true);
    });

    it('should warn for unsupported events on Codex', async () => {
      const result = await dispatch('FakeCodexEvent', {}, 'codex');
      expect(result.continue).toBe(true);
    });
  });
});
