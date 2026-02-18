/**
 * Tests for post-tool-verifier.mjs failure detection
 * Covers issue #696: false positive "permission denied" from Claude Code temp CWD errors on macOS
 */

import { describe, it, expect } from 'vitest';
import { detectBashFailure, detectWriteFailure } from '../../scripts/post-tool-verifier.mjs';

describe('detectBashFailure', () => {
  describe('Claude Code temp CWD false positives (issue #696)', () => {
    it('should not flag macOS temp CWD permission error as a failure', () => {
      const output = 'zsh:1: permission denied: /var/folders/xx/yyyyyyy/T/claude-abc123def-cwd';
      expect(detectBashFailure(output)).toBe(false);
    });

    it('should not flag temp CWD error with different session id', () => {
      const output = 'zsh:1: permission denied: /var/folders/ab/cdefgh/T/claude-xyz789-cwd';
      expect(detectBashFailure(output)).toBe(false);
    });

    it('should not flag temp CWD error with different zsh line numbers', () => {
      const output = 'zsh:42: permission denied: /var/folders/ab/cdefgh/T/claude-abc000-cwd';
      expect(detectBashFailure(output)).toBe(false);
    });

    it('should not flag output that contains only a temp CWD error line', () => {
      const output = [
        'some normal output',
        'zsh:1: permission denied: /var/folders/xx/yyyyy/T/claude-abc123-cwd',
        'more normal output',
      ].join('\n');
      expect(detectBashFailure(output)).toBe(false);
    });

    it('should still flag real permission denied errors not matching the temp CWD pattern', () => {
      const output = 'bash: /etc/shadow: permission denied';
      expect(detectBashFailure(output)).toBe(true);
    });

    it('should flag real permission denied even when temp CWD noise is also present', () => {
      const output = [
        'zsh:1: permission denied: /var/folders/xx/yyyyy/T/claude-abc123-cwd',
        'rm: /protected/file: permission denied',
      ].join('\n');
      expect(detectBashFailure(output)).toBe(true);
    });
  });

  describe('real error detection', () => {
    it('should detect "error:" pattern', () => {
      expect(detectBashFailure('error: file not found')).toBe(true);
    });

    it('should detect "failed" pattern', () => {
      expect(detectBashFailure('Build failed')).toBe(true);
    });

    it('should detect "command not found"', () => {
      expect(detectBashFailure('zsh: command not found: foo')).toBe(true);
    });

    it('should detect exit code failures', () => {
      expect(detectBashFailure('exit code: 1')).toBe(true);
    });

    it('should detect "fatal:" pattern', () => {
      expect(detectBashFailure('fatal: not a git repository')).toBe(true);
    });

    it('should return false for clean output', () => {
      expect(detectBashFailure('All tests passed')).toBe(false);
    });

    it('should return false for empty output', () => {
      expect(detectBashFailure('')).toBe(false);
    });
  });
});

describe('detectWriteFailure', () => {
  describe('Claude Code temp CWD false positives (issue #696)', () => {
    it('should not flag macOS temp CWD permission error as a write failure', () => {
      const output = 'zsh:1: permission denied: /var/folders/xx/yyyyyyy/T/claude-abc123def-cwd';
      expect(detectWriteFailure(output)).toBe(false);
    });

    it('should not flag temp CWD error alongside successful write output', () => {
      const output = [
        'zsh:1: permission denied: /var/folders/xx/yyyyy/T/claude-abc123-cwd',
        'File written successfully.',
      ].join('\n');
      expect(detectWriteFailure(output)).toBe(false);
    });

    it('should still flag real permission denied on write operations', () => {
      const output = 'Write failed: permission denied on /etc/hosts';
      expect(detectWriteFailure(output)).toBe(true);
    });
  });

  describe('real write failure detection', () => {
    it('should detect "error" in output', () => {
      expect(detectWriteFailure('Write error occurred')).toBe(true);
    });

    it('should detect "failed" in output', () => {
      expect(detectWriteFailure('Operation failed')).toBe(true);
    });

    it('should detect "read-only" in output', () => {
      expect(detectWriteFailure('filesystem is read-only')).toBe(true);
    });

    it('should detect "not found" in output', () => {
      expect(detectWriteFailure('Directory not found')).toBe(true);
    });

    it('should return false for clean output', () => {
      expect(detectWriteFailure('File written successfully')).toBe(false);
    });
  });
});
