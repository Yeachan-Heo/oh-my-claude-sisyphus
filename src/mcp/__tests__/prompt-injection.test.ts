import { describe, it, expect } from 'vitest';
import { SUBAGENT_HEADER, buildPromptWithSystemContext } from '../prompt-injection.js';

describe('SUBAGENT_HEADER', () => {
  it('contains the required subagent mode marker', () => {
    expect(SUBAGENT_HEADER).toContain('[SUBAGENT MODE]');
  });

  it('instructs against recursive subagent spawning', () => {
    expect(SUBAGENT_HEADER).toContain('DO NOT spawn additional subagents');
    expect(SUBAGENT_HEADER).toContain('Codex/Gemini CLI recursively');
  });
});

describe('buildPromptWithSystemContext', () => {
  it('always prepends SUBAGENT_HEADER as the first element', () => {
    const result = buildPromptWithSystemContext('my prompt', undefined, undefined);
    expect(result.startsWith(SUBAGENT_HEADER)).toBe(true);
  });

  it('prepends header before system-instructions when system prompt provided', () => {
    const result = buildPromptWithSystemContext('task', undefined, 'be helpful');
    const headerIdx = result.indexOf(SUBAGENT_HEADER);
    const sysIdx = result.indexOf('<system-instructions>');
    expect(headerIdx).toBe(0);
    expect(sysIdx).toBeGreaterThan(headerIdx);
  });

  it('prepends header before file context', () => {
    const result = buildPromptWithSystemContext('task', 'file contents', undefined);
    const headerIdx = result.indexOf(SUBAGENT_HEADER);
    const fileIdx = result.indexOf('UNTRUSTED DATA');
    expect(headerIdx).toBe(0);
    expect(fileIdx).toBeGreaterThan(headerIdx);
  });

  it('preserves order: header > system > file > user', () => {
    const result = buildPromptWithSystemContext('user task', 'file data', 'system role');
    const headerIdx = result.indexOf(SUBAGENT_HEADER);
    const sysIdx = result.indexOf('<system-instructions>');
    const fileIdx = result.indexOf('UNTRUSTED DATA');
    const userIdx = result.indexOf('user task');
    expect(headerIdx).toBeLessThan(sysIdx);
    expect(sysIdx).toBeLessThan(fileIdx);
    expect(fileIdx).toBeLessThan(userIdx);
  });

  it('works with no system prompt and no file context', () => {
    const result = buildPromptWithSystemContext('hello', undefined, undefined);
    expect(result).toBe(`${SUBAGENT_HEADER}\n\nhello`);
  });
});
