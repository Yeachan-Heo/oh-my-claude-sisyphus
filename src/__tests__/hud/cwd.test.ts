import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderCwd } from '../../hud/elements/cwd.js';

// Mock os.homedir
vi.mock('node:os', () => ({
  homedir: () => '/Users/testuser',
}));

describe('renderCwd', () => {
  it('returns null for undefined cwd', () => {
    expect(renderCwd(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(renderCwd('')).toBeNull();
  });

  it('converts home directory path to ~-relative', () => {
    const result = renderCwd('/Users/testuser/workspace/project');
    expect(result).toContain('~/workspace/project');
  });

  it('handles exact home directory', () => {
    const result = renderCwd('/Users/testuser');
    expect(result).toContain('~');
  });

  it('preserves paths outside home directory', () => {
    const result = renderCwd('/tmp/some/path');
    expect(result).toContain('/tmp/some/path');
  });

  it('applies dim styling', () => {
    const result = renderCwd('/Users/testuser/project');
    // dim escape code is \x1b[2m
    expect(result).toContain('\x1b[2m');
  });
});
