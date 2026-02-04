import { describe, test, expect, beforeEach } from 'vitest';
import { loadAgentPrompt, clearPromptCache, isLazyPrompt, resolveLazyPrompt, createLazyPrompt } from '../agents/utils.js';

describe('loadAgentPrompt', () => {
  describe('valid agent names', () => {
    test('loads an existing agent prompt with frontmatter', () => {
      const prompt = loadAgentPrompt('architect');
      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(100);
      // Should NOT contain frontmatter
      expect(prompt).not.toMatch(/^---/);
      // Should contain actual prompt content
      expect(prompt).toMatch(/architect|Oracle|debugging/i);
    });

    test('loads different agents correctly', () => {
      const executor = loadAgentPrompt('executor');
      const explore = loadAgentPrompt('explore');

      expect(executor).toBeTruthy();
      expect(explore).toBeTruthy();
      expect(executor).not.toBe(explore);
    });

    test('handles agent names with hyphens', () => {
      const prompt = loadAgentPrompt('qa-tester');
      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(100);
    });
  });

  describe('security: path traversal prevention', () => {
    test('rejects agent names with path traversal sequences', () => {
      expect(() => loadAgentPrompt('../etc/passwd')).toThrow('Invalid agent name');
      expect(() => loadAgentPrompt('../../etc/passwd')).toThrow('Invalid agent name');
      expect(() => loadAgentPrompt('foo/../bar')).toThrow('Invalid agent name');
    });

    test('rejects agent names with forward slashes', () => {
      expect(() => loadAgentPrompt('foo/bar')).toThrow('Invalid agent name');
      expect(() => loadAgentPrompt('/etc/passwd')).toThrow('Invalid agent name');
    });

    test('rejects agent names with backslashes', () => {
      expect(() => loadAgentPrompt('foo\\bar')).toThrow('Invalid agent name');
      expect(() => loadAgentPrompt('..\\..\\etc\\passwd')).toThrow('Invalid agent name');
    });

    test('rejects agent names with special characters', () => {
      expect(() => loadAgentPrompt('foo@bar')).toThrow('Invalid agent name');
      expect(() => loadAgentPrompt('foo$bar')).toThrow('Invalid agent name');
      expect(() => loadAgentPrompt('foo bar')).toThrow('Invalid agent name');
      expect(() => loadAgentPrompt('foo.bar')).toThrow('Invalid agent name');
    });

    test('allows valid agent names only', () => {
      // These should not throw
      expect(() => loadAgentPrompt('architect')).not.toThrow();
      expect(() => loadAgentPrompt('qa-tester')).not.toThrow();
      expect(() => loadAgentPrompt('explore-high')).not.toThrow();
    });
  });

  describe('error handling', () => {
    test('returns fallback for nonexistent agent', () => {
      clearPromptCache();
      const result = loadAgentPrompt('nonexistent-agent-xyz');
      expect(result).toContain('Agent: nonexistent-agent-xyz');
      expect(result).toContain('Prompt unavailable');
    });

    test('fallback does not leak internal paths', () => {
      clearPromptCache();
      const result = loadAgentPrompt('nonexistent-agent-xyz');
      expect(result).not.toContain('/home');
      expect(result).not.toContain('agents/');
      expect(result).not.toContain('.md');
    });
  });

  describe('prompt caching', () => {
    beforeEach(() => {
      clearPromptCache();
    });

    test('returns cached result on second call', () => {
      const first = loadAgentPrompt('architect');
      const second = loadAgentPrompt('architect');
      expect(first).toBe(second);
    });

    test('cache can be cleared', () => {
      const first = loadAgentPrompt('architect');
      clearPromptCache();
      const second = loadAgentPrompt('architect');
      // Same content but verifies cache was cleared (no error)
      expect(first).toEqual(second);
    });

    test('caches fallback for nonexistent agents', () => {
      const first = loadAgentPrompt('nonexistent-cache-test');
      const second = loadAgentPrompt('nonexistent-cache-test');
      expect(first).toBe(second);
      expect(first).toContain('Prompt unavailable');
    });
  });

  describe('lazy prompt utilities', () => {
    test('createLazyPrompt creates placeholder', () => {
      const lazy = createLazyPrompt('architect');
      expect(lazy).toBe('__LAZY_PROMPT__:architect');
    });

    test('isLazyPrompt detects placeholders', () => {
      expect(isLazyPrompt('__LAZY_PROMPT__:architect')).toBe(true);
      expect(isLazyPrompt('Not a lazy prompt')).toBe(false);
      expect(isLazyPrompt('')).toBe(false);
    });

    test('resolveLazyPrompt loads the actual prompt', () => {
      clearPromptCache();
      const resolved = resolveLazyPrompt('__LAZY_PROMPT__:architect');
      expect(resolved).toBeTruthy();
      expect(resolved.length).toBeGreaterThan(100);
      expect(resolved).not.toContain('__LAZY_PROMPT__');
    });

    test('resolveLazyPrompt passes through non-lazy prompts', () => {
      const normal = 'This is a normal prompt';
      expect(resolveLazyPrompt(normal)).toBe(normal);
    });
  });
});
