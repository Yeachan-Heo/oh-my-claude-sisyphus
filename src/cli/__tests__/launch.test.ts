/**
 * Tests for src/cli/launch.ts
 *
 * Covers:
 * - Exit code propagation (runClaude direct / inside-tmux)
 * - hasHudCommand fix (issue #863): HUD must no longer be permanently
 *   disabled by a hardcoded `false`.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    execFileSync: vi.fn(),
  };
});

vi.mock('../tmux-utils.js', () => ({
  resolveLaunchPolicy: vi.fn(),
  buildTmuxSessionName: vi.fn(() => 'test-session'),
  buildTmuxShellCommand: vi.fn((cmd: string, args: string[]) => `${cmd} ${args.join(' ')}`),
  quoteShellArg: vi.fn((s: string) => s),
  listHudWatchPaneIdsInCurrentWindow: vi.fn(() => []),
  createHudWatchPane: vi.fn(() => '%1'),
  killTmuxPane: vi.fn(),
  isClaudeAvailable: vi.fn(() => true),
}));

import { runClaude, extractNotifyFlag, normalizeClaudeLaunchArgs } from '../launch.js';
import {
  resolveLaunchPolicy,
  buildTmuxShellCommand,
  createHudWatchPane,
  listHudWatchPaneIdsInCurrentWindow,
} from '../tmux-utils.js';

// ---------------------------------------------------------------------------
// extractNotifyFlag
// ---------------------------------------------------------------------------
describe('extractNotifyFlag', () => {
  it('returns notifyEnabled=true with no --notify flag', () => {
    const result = extractNotifyFlag(['--madmax']);
    expect(result.notifyEnabled).toBe(true);
    expect(result.remainingArgs).toEqual(['--madmax']);
  });

  it('disables notifications with --notify false', () => {
    const result = extractNotifyFlag(['--notify', 'false']);
    expect(result.notifyEnabled).toBe(false);
    expect(result.remainingArgs).toEqual([]);
  });

  it('disables notifications with --notify=false', () => {
    const result = extractNotifyFlag(['--notify=false']);
    expect(result.notifyEnabled).toBe(false);
  });

  it('disables notifications with --notify 0', () => {
    const result = extractNotifyFlag(['--notify', '0']);
    expect(result.notifyEnabled).toBe(false);
  });

  it('keeps notifications enabled with --notify true', () => {
    const result = extractNotifyFlag(['--notify', 'true']);
    expect(result.notifyEnabled).toBe(true);
  });

  it('strips --notify from remainingArgs', () => {
    const result = extractNotifyFlag(['--madmax', '--notify', 'false', '--print']);
    expect(result.remainingArgs).toEqual(['--madmax', '--print']);
  });
});

// ---------------------------------------------------------------------------
// normalizeClaudeLaunchArgs
// ---------------------------------------------------------------------------
describe('normalizeClaudeLaunchArgs', () => {
  it('maps --madmax to --dangerously-skip-permissions', () => {
    expect(normalizeClaudeLaunchArgs(['--madmax'])).toEqual([
      '--dangerously-skip-permissions',
    ]);
  });

  it('maps --yolo to --dangerously-skip-permissions', () => {
    expect(normalizeClaudeLaunchArgs(['--yolo'])).toEqual([
      '--dangerously-skip-permissions',
    ]);
  });

  it('deduplicates --dangerously-skip-permissions', () => {
    const result = normalizeClaudeLaunchArgs([
      '--madmax',
      '--dangerously-skip-permissions',
    ]);
    expect(
      result.filter((a) => a === '--dangerously-skip-permissions'),
    ).toHaveLength(1);
  });

  it('passes unknown flags through unchanged', () => {
    expect(normalizeClaudeLaunchArgs(['--print', '--verbose'])).toEqual([
      '--print',
      '--verbose',
    ]);
  });
});

// ---------------------------------------------------------------------------
// runClaude — exit code propagation
// ---------------------------------------------------------------------------
describe('runClaude — exit code propagation', () => {
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetAllMocks();
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    processExitSpy.mockRestore();
  });

  describe('direct policy', () => {
    beforeEach(() => {
      (resolveLaunchPolicy as ReturnType<typeof vi.fn>).mockReturnValue('direct');
    });

    it('propagates Claude non-zero exit code', () => {
      const err = Object.assign(new Error('Command failed'), { status: 2 });
      (execFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => { throw err; });

      runClaude('/tmp', [], 'sid');

      expect(processExitSpy).toHaveBeenCalledWith(2);
    });

    it('exits with code 1 when status is null', () => {
      const err = Object.assign(new Error('Command failed'), { status: null });
      (execFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => { throw err; });

      runClaude('/tmp', [], 'sid');

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('exits with code 1 on ENOENT', () => {
      const err = Object.assign(new Error('Not found'), { code: 'ENOENT' });
      (execFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => { throw err; });

      runClaude('/tmp', [], 'sid');

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('does not call process.exit on success', () => {
      (execFileSync as ReturnType<typeof vi.fn>).mockReturnValue(Buffer.from(''));

      runClaude('/tmp', [], 'sid');

      expect(processExitSpy).not.toHaveBeenCalled();
    });
  });

  describe('inside-tmux policy', () => {
    beforeEach(() => {
      (resolveLaunchPolicy as ReturnType<typeof vi.fn>).mockReturnValue('inside-tmux');
      process.env.TMUX_PANE = '%0';
    });

    afterEach(() => {
      delete process.env.TMUX_PANE;
    });

    it('propagates Claude non-zero exit code', () => {
      const err = Object.assign(new Error('Command failed'), { status: 3 });
      (execFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => { throw err; });

      runClaude('/tmp', [], 'sid');

      expect(processExitSpy).toHaveBeenCalledWith(3);
    });

    it('exits with code 1 when status is null', () => {
      const err = Object.assign(new Error('Command failed'), { status: null });
      (execFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => { throw err; });

      runClaude('/tmp', [], 'sid');

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('exits with code 1 on ENOENT', () => {
      const err = Object.assign(new Error('Not found'), { code: 'ENOENT' });
      (execFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => { throw err; });

      runClaude('/tmp', [], 'sid');

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('does not call process.exit on success', () => {
      (execFileSync as ReturnType<typeof vi.fn>).mockReturnValue(Buffer.from(''));

      runClaude('/tmp', [], 'sid');

      expect(processExitSpy).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// runClaude — HUD integration (issue #863 regression guard)
// ---------------------------------------------------------------------------
describe('runClaude HUD integration', () => {
  const savedTmuxPane = process.env.TMUX_PANE;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TMUX_PANE = '%0';
    (execFileSync as ReturnType<typeof vi.fn>).mockReturnValue(Buffer.from(''));
  });

  afterEach(() => {
    if (savedTmuxPane === undefined) {
      delete process.env.TMUX_PANE;
    } else {
      process.env.TMUX_PANE = savedTmuxPane;
    }
  });

  it('builds a non-empty hudCmd when inside tmux (hasHudCommand=true)', () => {
    (resolveLaunchPolicy as ReturnType<typeof vi.fn>).mockReturnValue('inside-tmux');

    runClaude('/tmp/cwd', [], 'test-session');

    // buildTmuxShellCommand must have been called with 'node' and hud args
    const calls = vi.mocked(buildTmuxShellCommand).mock.calls;
    const hudCall = calls.find(
      ([cmd, args]) => cmd === 'node' && Array.isArray(args) && args.includes('hud'),
    );
    expect(hudCall).toBeDefined();
    expect(hudCall![1]).toContain('--watch');
  });

  it('creates a HUD pane when inside tmux', () => {
    (resolveLaunchPolicy as ReturnType<typeof vi.fn>).mockReturnValue('inside-tmux');

    runClaude('/tmp/cwd', [], 'test-session');

    expect(createHudWatchPane).toHaveBeenCalledOnce();
    // The second argument is the hudCmd string – must be non-empty
    const hudCmd = vi.mocked(createHudWatchPane).mock.calls[0][1];
    expect(typeof hudCmd).toBe('string');
    expect(hudCmd.length).toBeGreaterThan(0);
  });

  it('does NOT create a HUD pane when running direct (no tmux)', () => {
    (resolveLaunchPolicy as ReturnType<typeof vi.fn>).mockReturnValue('direct');

    runClaude('/tmp/cwd', [], 'test-session');

    expect(createHudWatchPane).not.toHaveBeenCalled();
  });

  it('cleans up stale HUD panes before launching', () => {
    (resolveLaunchPolicy as ReturnType<typeof vi.fn>).mockReturnValue('inside-tmux');
    vi.mocked(listHudWatchPaneIdsInCurrentWindow).mockReturnValue(['%5', '%6']);

    runClaude('/tmp/cwd', [], 'test-session');

    expect(listHudWatchPaneIdsInCurrentWindow).toHaveBeenCalled();
  });
});
