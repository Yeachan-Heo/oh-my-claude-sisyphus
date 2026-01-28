/**
 * Unit tests for detectProjectType function
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { detectProjectType } from '../index.js';

describe('detectProjectType', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'detect-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects TypeScript project from tsconfig.json', () => {
    writeFileSync(join(tempDir, 'tsconfig.json'), '{}');
    expect(detectProjectType(tempDir)).toBe('typescript');
  });

  it('detects Go project from go.mod', () => {
    writeFileSync(join(tempDir, 'go.mod'), 'module test');
    expect(detectProjectType(tempDir)).toBe('go');
  });

  it('detects Rust project from Cargo.toml', () => {
    writeFileSync(join(tempDir, 'Cargo.toml'), '[package]');
    expect(detectProjectType(tempDir)).toBe('rust');
  });

  it('detects Python from pyproject.toml', () => {
    writeFileSync(join(tempDir, 'pyproject.toml'), '[project]');
    expect(detectProjectType(tempDir)).toBe('python');
  });

  it('returns unknown for empty directory', () => {
    expect(detectProjectType(tempDir)).toBe('unknown');
  });

  it('respects tsconfig.json priority over go.mod', () => {
    writeFileSync(join(tempDir, 'tsconfig.json'), '{}');
    writeFileSync(join(tempDir, 'go.mod'), 'module test');
    expect(detectProjectType(tempDir)).toBe('typescript');
  });
});
