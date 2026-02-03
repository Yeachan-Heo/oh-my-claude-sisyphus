/**
 * Tests for Event Mapping Module
 */

import { describe, it, expect } from 'vitest';
import {
  fromClaudeCodeEvent,
  toClaudeCodeEvent,
  fromCodexEvent,
  toCodexEvent,
  getClaudeCodeEvents,
  getCodexEvents,
  getUnsupportedCodexEvents,
  isCrossPlatformEvent,
  getCrossPlatformEvents,
} from '../event-map.js';
import type { UnifiedHookEvent } from '../types.js';

describe('event-map', () => {
  describe('Claude Code event mapping', () => {
    describe('fromClaudeCodeEvent', () => {
      it('should map PreToolUse to tool:pre', () => {
        expect(fromClaudeCodeEvent('PreToolUse')).toBe('tool:pre');
      });

      it('should map PostToolUse to tool:post', () => {
        expect(fromClaudeCodeEvent('PostToolUse')).toBe('tool:post');
      });

      it('should map PostToolUseFailure to tool:error', () => {
        expect(fromClaudeCodeEvent('PostToolUseFailure')).toBe('tool:error');
      });

      it('should map UserPromptSubmit to prompt:submit', () => {
        expect(fromClaudeCodeEvent('UserPromptSubmit')).toBe('prompt:submit');
      });

      it('should map SessionStart to session:start', () => {
        expect(fromClaudeCodeEvent('SessionStart')).toBe('session:start');
      });

      it('should map SessionEnd to session:end', () => {
        expect(fromClaudeCodeEvent('SessionEnd')).toBe('session:end');
      });

      it('should map SubagentStart to agent:start', () => {
        expect(fromClaudeCodeEvent('SubagentStart')).toBe('agent:start');
      });

      it('should map SubagentStop to agent:stop', () => {
        expect(fromClaudeCodeEvent('SubagentStop')).toBe('agent:stop');
      });

      it('should map Stop to stop', () => {
        expect(fromClaudeCodeEvent('Stop')).toBe('stop');
      });

      it('should map PreCompact to context:pre-compact', () => {
        expect(fromClaudeCodeEvent('PreCompact')).toBe('context:pre-compact');
      });

      it('should return null for unknown event', () => {
        expect(fromClaudeCodeEvent('UnknownEvent')).toBeNull();
      });
    });

    describe('toClaudeCodeEvent', () => {
      it('should map tool:pre to PreToolUse', () => {
        expect(toClaudeCodeEvent('tool:pre')).toBe('PreToolUse');
      });

      it('should map tool:post to PostToolUse', () => {
        expect(toClaudeCodeEvent('tool:post')).toBe('PostToolUse');
      });

      it('should map session:start to SessionStart', () => {
        expect(toClaudeCodeEvent('session:start')).toBe('SessionStart');
      });

      it('should return null for events without Claude Code equivalent', () => {
        expect(toClaudeCodeEvent('turn:start')).toBeNull();
        expect(toClaudeCodeEvent('turn:complete')).toBeNull();
      });
    });
  });

  describe('Codex event mapping', () => {
    describe('fromCodexEvent', () => {
      it('should map agent-turn-complete to turn:complete', () => {
        expect(fromCodexEvent('agent-turn-complete')).toBe('turn:complete');
      });

      it('should map agent-turn-start to turn:start', () => {
        expect(fromCodexEvent('agent-turn-start')).toBe('turn:start');
      });

      it('should map tool-before to tool:pre', () => {
        expect(fromCodexEvent('tool-before')).toBe('tool:pre');
      });

      it('should map tool-after to tool:post', () => {
        expect(fromCodexEvent('tool-after')).toBe('tool:post');
      });

      it('should map session-start to session:start', () => {
        expect(fromCodexEvent('session-start')).toBe('session:start');
      });

      it('should map session-end to session:end', () => {
        expect(fromCodexEvent('session-end')).toBe('session:end');
      });

      it('should return null for unknown event', () => {
        expect(fromCodexEvent('unknown-event')).toBeNull();
      });
    });

    describe('toCodexEvent', () => {
      it('should map turn:complete to agent-turn-complete', () => {
        expect(toCodexEvent('turn:complete')).toBe('agent-turn-complete');
      });

      it('should map turn:start to agent-turn-start', () => {
        expect(toCodexEvent('turn:start')).toBe('agent-turn-start');
      });

      it('should map tool:pre to tool-before', () => {
        expect(toCodexEvent('tool:pre')).toBe('tool-before');
      });

      it('should return null for events without Codex equivalent', () => {
        expect(toCodexEvent('prompt:submit')).toBeNull();
        expect(toCodexEvent('permission:request')).toBeNull();
        expect(toCodexEvent('agent:start')).toBeNull();
        expect(toCodexEvent('agent:stop')).toBeNull();
      });
    });
  });

  describe('batch mapping', () => {
    describe('getClaudeCodeEvents', () => {
      it('should map multiple unified events to Claude Code events', () => {
        const unified: UnifiedHookEvent[] = ['tool:pre', 'tool:post', 'session:start'];
        const result = getClaudeCodeEvents(unified);
        expect(result).toContain('PreToolUse');
        expect(result).toContain('PostToolUse');
        expect(result).toContain('SessionStart');
      });

      it('should skip events without Claude Code equivalent', () => {
        const unified: UnifiedHookEvent[] = ['tool:pre', 'turn:complete'];
        const result = getClaudeCodeEvents(unified);
        expect(result).toHaveLength(1);
        expect(result).toContain('PreToolUse');
      });
    });

    describe('getCodexEvents', () => {
      it('should map multiple unified events to Codex events', () => {
        const unified: UnifiedHookEvent[] = ['turn:complete', 'tool:pre', 'session:start'];
        const result = getCodexEvents(unified);
        expect(result).toContain('agent-turn-complete');
        expect(result).toContain('tool-before');
        expect(result).toContain('session-start');
      });

      it('should skip events without Codex equivalent', () => {
        const unified: UnifiedHookEvent[] = ['turn:complete', 'prompt:submit', 'agent:start'];
        const result = getCodexEvents(unified);
        expect(result).toHaveLength(1);
        expect(result).toContain('agent-turn-complete');
      });
    });
  });

  describe('unsupported events', () => {
    describe('getUnsupportedCodexEvents', () => {
      it('should return events not supported on Codex', () => {
        const requested: UnifiedHookEvent[] = ['turn:complete', 'prompt:submit', 'agent:start', 'stop'];
        const unsupported = getUnsupportedCodexEvents(requested);
        expect(unsupported).toContain('prompt:submit');
        expect(unsupported).toContain('agent:start');
        expect(unsupported).toContain('stop');
        expect(unsupported).not.toContain('turn:complete');
      });

      it('should return empty array when all events are supported', () => {
        const requested: UnifiedHookEvent[] = ['turn:complete', 'session:start', 'tool:pre'];
        const unsupported = getUnsupportedCodexEvents(requested);
        expect(unsupported).toHaveLength(0);
      });
    });
  });

  describe('cross-platform events', () => {
    describe('isCrossPlatformEvent', () => {
      it('should return true for events available on both platforms', () => {
        expect(isCrossPlatformEvent('session:start')).toBe(true);
        expect(isCrossPlatformEvent('session:end')).toBe(true);
        expect(isCrossPlatformEvent('tool:pre')).toBe(true);
        expect(isCrossPlatformEvent('tool:post')).toBe(true);
      });

      it('should return false for Claude Code-only events', () => {
        expect(isCrossPlatformEvent('prompt:submit')).toBe(false);
        expect(isCrossPlatformEvent('permission:request')).toBe(false);
        expect(isCrossPlatformEvent('agent:start')).toBe(false);
      });

      it('should return false for Codex-only events', () => {
        // turn:start and turn:complete don't have Claude Code equivalents
        expect(isCrossPlatformEvent('turn:complete')).toBe(false);
        expect(isCrossPlatformEvent('turn:start')).toBe(false);
      });
    });

    describe('getCrossPlatformEvents', () => {
      it('should return all cross-platform events', () => {
        const events = getCrossPlatformEvents();
        expect(events).toContain('session:start');
        expect(events).toContain('session:end');
        expect(events).toContain('tool:pre');
        expect(events).toContain('tool:post');
      });
    });
  });
});
