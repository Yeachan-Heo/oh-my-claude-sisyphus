/**
 * Tests for Claude Code and Codex Adapters
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeCodeAdapter, getClaudeCodeAdapter } from '../claude-code-adapter.js';
import {
  CodexAdapter,
  getCodexAdapter,
  parseCodexNotifyStdin,
  extractCodexTurnContext,
  wrapWithCodexDegradation,
} from '../codex-adapter.js';
import type { CodexNotifyPayload, UnifiedHookInput } from '../types.js';

describe('ClaudeCodeAdapter', () => {
  let adapter: ClaudeCodeAdapter;

  beforeEach(() => {
    adapter = new ClaudeCodeAdapter();
  });

  describe('platform', () => {
    it('should identify as claude-code', () => {
      expect(adapter.platform).toBe('claude-code');
    });
  });

  describe('capabilities', () => {
    it('should have full capabilities', () => {
      expect(adapter.capabilities.canBlock).toBe(true);
      expect(adapter.capabilities.canModifyInput).toBe(true);
      expect(adapter.capabilities.hasPreExecutionHooks).toBe(true);
    });
  });

  describe('parseInput', () => {
    it('should parse PreToolUse event', () => {
      const raw = {
        sessionId: 'session-1',
        toolName: 'Write',
        toolInput: { file_path: '/test.ts' },
        directory: '/project',
      };

      const result = adapter.parseInput(raw, 'PreToolUse');
      expect(result.event).toBe('tool:pre');
      expect(result.sessionId).toBe('session-1');
      expect(result.toolName).toBe('Write');
      expect(result.cwd).toBe('/project');
      expect(result.platform).toBe('claude-code');
    });

    it('should parse UserPromptSubmit with prompt field', () => {
      const raw = {
        prompt: 'Hello world',
        sessionId: 'session-1',
        directory: '/project',
      };

      const result = adapter.parseInput(raw, 'UserPromptSubmit');
      expect(result.event).toBe('prompt:submit');
      expect(result.prompt).toBe('Hello world');
    });

    it('should parse UserPromptSubmit with message.content', () => {
      const raw = {
        message: { content: 'Hello from message' },
        sessionId: 'session-1',
        directory: '/project',
      };

      const result = adapter.parseInput(raw, 'UserPromptSubmit');
      expect(result.prompt).toBe('Hello from message');
    });

    it('should parse UserPromptSubmit with parts', () => {
      const raw = {
        parts: [
          { type: 'text', text: 'Part 1' },
          { type: 'text', text: 'Part 2' },
        ],
        sessionId: 'session-1',
        directory: '/project',
      };

      const result = adapter.parseInput(raw, 'UserPromptSubmit');
      expect(result.prompt).toBe('Part 1 Part 2');
    });

    it('should parse Stop event with stop reason', () => {
      const raw = {
        sessionId: 'session-1',
        stop_reason: 'context_limit',
        user_requested: false,
        directory: '/project',
      };

      const result = adapter.parseInput(raw, 'Stop');
      expect(result.event).toBe('stop');
      expect(result.stopReason).toBe('context_limit');
      expect(result.userRequested).toBe(false);
    });

    it('should throw for unknown event', () => {
      expect(() => adapter.parseInput({}, 'FakeEvent')).toThrow('Unknown Claude Code event');
    });
  });

  describe('formatOutput', () => {
    it('should format basic continue output', () => {
      const output = adapter.formatOutput({ continue: true });
      expect(output).toEqual({ continue: true });
    });

    it('should format output with message', () => {
      const output = adapter.formatOutput({
        continue: true,
        message: 'Hello',
      });
      expect(output).toEqual({ continue: true, message: 'Hello' });
    });

    it('should format blocking output', () => {
      const output = adapter.formatOutput({
        continue: false,
        reason: 'Not allowed',
      });
      expect(output).toEqual({ continue: false, reason: 'Not allowed' });
    });

    it('should format output with modified input', () => {
      const output = adapter.formatOutput({
        continue: true,
        modifiedInput: { file_path: '/new.ts' },
      });
      expect(output.modifiedInput).toEqual({ file_path: '/new.ts' });
      expect(output.updatedInput).toEqual({ file_path: '/new.ts' });
    });

    it('should format output with permission decision', () => {
      const output = adapter.formatOutput({
        continue: true,
        permissionDecision: 'allow',
      });
      expect(output.permissionDecision).toBe('allow');
    });
  });

  describe('isEventSupported', () => {
    it('should support all standard events', () => {
      expect(adapter.isEventSupported('tool:pre')).toBe(true);
      expect(adapter.isEventSupported('tool:post')).toBe(true);
      expect(adapter.isEventSupported('session:start')).toBe(true);
      expect(adapter.isEventSupported('stop')).toBe(true);
    });
  });

  describe('mapToPlatformEvent', () => {
    it('should map unified events to Claude Code events', () => {
      expect(adapter.mapToPlatformEvent('tool:pre')).toBe('PreToolUse');
      expect(adapter.mapToPlatformEvent('tool:post')).toBe('PostToolUse');
      expect(adapter.mapToPlatformEvent('session:start')).toBe('SessionStart');
    });
  });

  describe('mapFromPlatformEvent', () => {
    it('should map Claude Code events to unified events', () => {
      expect(adapter.mapFromPlatformEvent('PreToolUse')).toBe('tool:pre');
      expect(adapter.mapFromPlatformEvent('PostToolUse')).toBe('tool:post');
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const a = getClaudeCodeAdapter();
      const b = getClaudeCodeAdapter();
      expect(a).toBe(b);
    });
  });
});

describe('CodexAdapter', () => {
  let adapter: CodexAdapter;

  beforeEach(() => {
    adapter = new CodexAdapter();
  });

  describe('platform', () => {
    it('should identify as codex', () => {
      expect(adapter.platform).toBe('codex');
    });
  });

  describe('capabilities', () => {
    it('should have limited capabilities', () => {
      expect(adapter.capabilities.canBlock).toBe(false);
      expect(adapter.capabilities.canModifyInput).toBe(false);
      expect(adapter.capabilities.hasAgentHooks).toBe(false);
    });
  });

  describe('parseInput', () => {
    it('should parse agent-turn-complete notify payload', () => {
      const payload: CodexNotifyPayload = {
        type: 'agent-turn-complete',
        'turn-id': 'turn-123',
        'thread-id': 'thread-456',
        'input-messages': [{ role: 'user', content: 'test' }],
        'last-assistant-message': 'Done!',
        cwd: '/project',
      };

      const result = adapter.parseInput(payload, 'agent-turn-complete');
      expect(result.event).toBe('turn:complete');
      expect(result.turnId).toBe('turn-123');
      expect(result.threadId).toBe('thread-456');
      expect(result.cwd).toBe('/project');
      expect(result.platform).toBe('codex');
    });

    it('should handle future event formats', () => {
      const raw = {
        session_id: 'session-1',
        cwd: '/project',
        tool_name: 'bash',
        tool_input: { command: 'ls' },
      };

      const result = adapter.parseInput(raw, 'tool-before');
      expect(result.event).toBe('tool:pre');
      expect(result.toolName).toBe('bash');
    });
  });

  describe('formatOutput', () => {
    it('should format basic output', () => {
      const output = adapter.formatOutput({ continue: true });
      expect(output).toEqual({ continue: true });
    });

    it('should include message in output', () => {
      const output = adapter.formatOutput({
        continue: true,
        message: 'Turn processed',
      }) as Record<string, unknown>;
      expect(output.message).toBe('Turn processed');
    });

    it('should use snake_case for modified_input (Codex convention)', () => {
      const output = adapter.formatOutput({
        continue: true,
        modifiedInput: { command: 'echo test' },
      }) as Record<string, unknown>;
      expect(output.modified_input).toEqual({ command: 'echo test' });
    });
  });

  describe('isEventSupported', () => {
    it('should support turn:complete', () => {
      expect(adapter.isEventSupported('turn:complete')).toBe(true);
    });

    it('should not support agent hooks', () => {
      expect(adapter.isEventSupported('agent:start')).toBe(false);
      expect(adapter.isEventSupported('agent:stop')).toBe(false);
    });
  });

  describe('mapToPlatformEvent', () => {
    it('should map turn:complete to agent-turn-complete', () => {
      expect(adapter.mapToPlatformEvent('turn:complete')).toBe('agent-turn-complete');
    });

    it('should return null for unsupported events', () => {
      expect(adapter.mapToPlatformEvent('prompt:submit')).toBeNull();
    });
  });

  describe('canBlock / canModifyInput', () => {
    it('should report blocking not available', () => {
      expect(adapter.canBlock()).toBe(false);
    });

    it('should report input modification not available', () => {
      expect(adapter.canModifyInput()).toBe(false);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const a = getCodexAdapter();
      const b = getCodexAdapter();
      expect(a).toBe(b);
    });
  });
});

describe('Codex helpers', () => {
  describe('parseCodexNotifyStdin', () => {
    it('should parse valid JSON', () => {
      const json = JSON.stringify({
        type: 'agent-turn-complete',
        'turn-id': '123',
        'thread-id': '456',
        'input-messages': [],
        'last-assistant-message': 'done',
        cwd: '/test',
      });
      const result = parseCodexNotifyStdin(json);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('agent-turn-complete');
    });

    it('should return null for invalid JSON', () => {
      expect(parseCodexNotifyStdin('not json')).toBeNull();
    });
  });

  describe('extractCodexTurnContext', () => {
    it('should extract context from payload', () => {
      const payload: CodexNotifyPayload = {
        type: 'agent-turn-complete',
        'turn-id': 'turn-123',
        'thread-id': 'thread-456',
        'input-messages': [1, 2, 3] as unknown[],
        'last-assistant-message': 'Finished work',
        cwd: '/project',
      };

      const ctx = extractCodexTurnContext(payload);
      expect(ctx.turnId).toBe('turn-123');
      expect(ctx.threadId).toBe('thread-456');
      expect(ctx.cwd).toBe('/project');
      expect(ctx.lastMessage).toBe('Finished work');
      expect(ctx.messageCount).toBe(3);
    });
  });

  describe('wrapWithCodexDegradation', () => {
    it('should allow non-blocking output through', async () => {
      const handler = async () => ({
        continue: true,
        message: 'OK',
      });

      const wrapped = wrapWithCodexDegradation(handler);
      const input: UnifiedHookInput = {
        event: 'turn:complete',
        cwd: '/test',
        platform: 'codex',
      };

      const result = await wrapped(input);
      expect(result.continue).toBe(true);
      expect(result.message).toBe('OK');
    });

    it('should override blocking on Codex', async () => {
      const handler = async () => ({
        continue: false,
        reason: 'Blocked!',
      });

      const wrapped = wrapWithCodexDegradation(handler);
      const input: UnifiedHookInput = {
        event: 'turn:complete',
        cwd: '/test',
        platform: 'codex',
      };

      const result = await wrapped(input);
      // Should force continue=true on Codex
      expect(result.continue).toBe(true);
    });

    it('should strip modifiedInput on Codex', async () => {
      const handler = async () => ({
        continue: true,
        modifiedInput: { changed: true },
      });

      const wrapped = wrapWithCodexDegradation(handler);
      const input: UnifiedHookInput = {
        event: 'turn:complete',
        cwd: '/test',
        platform: 'codex',
      };

      const result = await wrapped(input);
      expect(result.modifiedInput).toBeUndefined();
    });

    it('should allow blocking on non-Codex platform', async () => {
      const handler = async () => ({
        continue: false,
        reason: 'Blocked!',
      });

      const wrapped = wrapWithCodexDegradation(handler);
      const input: UnifiedHookInput = {
        event: 'tool:pre',
        cwd: '/test',
        platform: 'claude-code',
      };

      const result = await wrapped(input);
      expect(result.continue).toBe(false);
    });
  });
});
