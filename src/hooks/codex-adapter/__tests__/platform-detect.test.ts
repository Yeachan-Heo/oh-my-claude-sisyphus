/**
 * Tests for Platform Detection Module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  detectPlatform,
  isCodex,
  isClaudeCode,
  getPlatformCapabilities,
  resetPlatformCache,
} from '../platform-detect.js';

describe('platform-detect', () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset cache before each test
    resetPlatformCache();
    // Clear relevant env vars
    delete process.env.OMC_PLATFORM;
    delete process.env.CLAUDE_CODE;
    delete process.env.CLAUDE_PROJECT_DIR;
    delete process.env.CLAUDE_PLUGIN_ROOT;
    delete process.env.CLAUDE_CODE_VERSION;
    delete process.env.CODEX_CLI;
    delete process.env.CODEX_SESSION_ID;
    delete process.env.CODEX_SANDBOX_NETWORK;
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
    resetPlatformCache();
  });

  describe('detectPlatform', () => {
    it('should return claude-code by default', () => {
      const platform = detectPlatform();
      expect(platform).toBe('claude-code');
    });

    it('should respect OMC_PLATFORM=claude-code override', () => {
      process.env.OMC_PLATFORM = 'claude-code';
      expect(detectPlatform()).toBe('claude-code');
    });

    it('should respect OMC_PLATFORM=codex override', () => {
      process.env.OMC_PLATFORM = 'codex';
      expect(detectPlatform()).toBe('codex');
    });

    it('should detect Claude Code via CLAUDE_CODE env var', () => {
      process.env.CLAUDE_CODE = '1';
      expect(detectPlatform()).toBe('claude-code');
    });

    it('should detect Claude Code via CLAUDE_PROJECT_DIR env var', () => {
      process.env.CLAUDE_PROJECT_DIR = '/some/path';
      expect(detectPlatform()).toBe('claude-code');
    });

    it('should detect Codex via CODEX_CLI env var', () => {
      process.env.CODEX_CLI = '1';
      expect(detectPlatform()).toBe('codex');
    });

    it('should detect Codex via CODEX_SESSION_ID env var', () => {
      process.env.CODEX_SESSION_ID = 'abc123';
      expect(detectPlatform()).toBe('codex');
    });

    it('should cache the detection result', () => {
      const first = detectPlatform();
      process.env.OMC_PLATFORM = 'codex'; // Try to change
      const second = detectPlatform();
      expect(first).toBe(second);
    });

    it('should reset cache with resetPlatformCache', () => {
      detectPlatform(); // Cache result
      process.env.OMC_PLATFORM = 'codex';
      resetPlatformCache();
      expect(detectPlatform()).toBe('codex');
    });
  });

  describe('isCodex', () => {
    it('should return true when platform is codex', () => {
      process.env.OMC_PLATFORM = 'codex';
      expect(isCodex()).toBe(true);
    });

    it('should return false when platform is claude-code', () => {
      process.env.OMC_PLATFORM = 'claude-code';
      expect(isCodex()).toBe(false);
    });
  });

  describe('isClaudeCode', () => {
    it('should return true when platform is claude-code', () => {
      process.env.OMC_PLATFORM = 'claude-code';
      expect(isClaudeCode()).toBe(true);
    });

    it('should return false when platform is codex', () => {
      process.env.OMC_PLATFORM = 'codex';
      expect(isClaudeCode()).toBe(false);
    });
  });

  describe('getPlatformCapabilities', () => {
    describe('claude-code capabilities', () => {
      beforeEach(() => {
        process.env.OMC_PLATFORM = 'claude-code';
      });

      it('should have full capabilities', () => {
        const caps = getPlatformCapabilities();
        expect(caps.platform).toBe('claude-code');
        expect(caps.canBlock).toBe(true);
        expect(caps.canModifyInput).toBe(true);
        expect(caps.hasPreExecutionHooks).toBe(true);
        expect(caps.hasPostExecutionHooks).toBe(true);
        expect(caps.hasToolLevelHooks).toBe(true);
        expect(caps.hasSessionHooks).toBe(true);
        expect(caps.hasAgentHooks).toBe(true);
      });

      it('should support all standard events', () => {
        const caps = getPlatformCapabilities();
        expect(caps.supportedEvents).toContain('session:start');
        expect(caps.supportedEvents).toContain('session:end');
        expect(caps.supportedEvents).toContain('tool:pre');
        expect(caps.supportedEvents).toContain('tool:post');
        expect(caps.supportedEvents).toContain('prompt:submit');
        expect(caps.supportedEvents).toContain('agent:start');
        expect(caps.supportedEvents).toContain('agent:stop');
      });
    });

    describe('codex capabilities', () => {
      beforeEach(() => {
        process.env.OMC_PLATFORM = 'codex';
      });

      it('should have limited capabilities', () => {
        const caps = getPlatformCapabilities();
        expect(caps.platform).toBe('codex');
        expect(caps.canBlock).toBe(false);
        expect(caps.canModifyInput).toBe(false);
        expect(caps.hasPreExecutionHooks).toBe(false);
        expect(caps.hasPostExecutionHooks).toBe(true);
        expect(caps.hasAgentHooks).toBe(false);
      });

      it('should only support turn:complete event currently', () => {
        const caps = getPlatformCapabilities();
        expect(caps.supportedEvents).toContain('turn:complete');
        // These are NOT supported on current Codex
        expect(caps.supportedEvents).not.toContain('tool:pre');
        expect(caps.supportedEvents).not.toContain('agent:start');
      });
    });

    it('should accept platform parameter override', () => {
      process.env.OMC_PLATFORM = 'claude-code';
      const codexCaps = getPlatformCapabilities('codex');
      expect(codexCaps.platform).toBe('codex');
    });
  });
});
