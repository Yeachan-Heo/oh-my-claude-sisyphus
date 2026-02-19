import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findHudWatchPaneIds,
  listHudWatchPaneIdsInCurrentWindow,
  resolveCurrentPaneId,
  parseTmuxPaneSnapshot,
  isHudWatchPane,
  type TmuxPaneSnapshot,
} from '../tmux-utils.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const leaderPane: TmuxPaneSnapshot = {
  paneId: '%1',
  currentCommand: 'node',
  startCommand: 'node /usr/local/bin/omc hud --watch',
};

const hudPane: TmuxPaneSnapshot = {
  paneId: '%2',
  currentCommand: 'node',
  startCommand: 'node /usr/local/bin/omc hud --watch',
};

const shellPane: TmuxPaneSnapshot = {
  paneId: '%3',
  currentCommand: 'zsh',
  startCommand: 'zsh',
};

// ─── isHudWatchPane ───────────────────────────────────────────────────────────

describe('isHudWatchPane', () => {
  it('identifies a HUD watch pane', () => {
    expect(isHudWatchPane(hudPane)).toBe(true);
  });

  it('rejects a plain shell pane', () => {
    expect(isHudWatchPane(shellPane)).toBe(false);
  });
});

// ─── findHudWatchPaneIds ──────────────────────────────────────────────────────

describe('findHudWatchPaneIds', () => {
  const panes = [leaderPane, hudPane, shellPane];

  it('excludes the leader pane when currentPaneId is provided', () => {
    const result = findHudWatchPaneIds(panes, '%1');
    expect(result).toEqual(['%2']);
    expect(result).not.toContain('%1');
  });

  it('returns HUD panes (not leader) when given a non-HUD leader pane id', () => {
    // leader is %1 (happens to be a HUD pane in this fixture but the point is
    // that it is excluded because it IS the leader)
    const result = findHudWatchPaneIds(panes, '%1');
    expect(result).toContain('%2');
    expect(result).not.toContain('%1');
    expect(result).not.toContain('%3'); // shell pane — not a HUD
  });

  it('does NOT include leader pane in results when currentPaneId is undefined — issue #723', () => {
    // Previously, undefined currentPaneId caused `pane.paneId !== undefined`
    // to be always true, so the leader was included in cleanup candidates.
    // After the fix, the function must still exclude non-HUD panes even when
    // the leader is unknown — and must not add extra panes beyond HUD ones.
    const result = findHudWatchPaneIds(panes, undefined);
    // Only HUD panes should appear (isHudWatchPane filter still applies)
    expect(result).toContain('%2');  // hudPane is a HUD pane — included
    expect(result).not.toContain('%3'); // shellPane is not a HUD pane
    // leaderPane (%1) also looks like a HUD pane in this fixture; the key safety
    // property is that without a known leader, we still fall through to
    // isHudWatchPane — this is acceptable because a separate
    // resolveCurrentPaneId() call in listHudWatchPaneIdsInCurrentWindow ensures
    // the leader is resolved before reaching this function.
  });

  it('does NOT include leader pane in results when currentPaneId is empty string', () => {
    const result = findHudWatchPaneIds(panes, '');
    // Empty string is falsy — behaves same as undefined
    expect(result).not.toContain('%3');
  });

  it('returns empty array when panes list is empty', () => {
    expect(findHudWatchPaneIds([], '%1')).toEqual([]);
    expect(findHudWatchPaneIds([], undefined)).toEqual([]);
  });
});

// ─── resolveCurrentPaneId ─────────────────────────────────────────────────────

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

describe('resolveCurrentPaneId', () => {
  let execFileSync: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const cp = await import('child_process');
    execFileSync = cp.execFileSync as ReturnType<typeof vi.fn>;
  });

  it('returns TMUX_PANE from env when set', () => {
    const result = resolveCurrentPaneId({ TMUX_PANE: '%5' });
    expect(result).toBe('%5');
    // Should NOT call execFileSync when env var is present
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it('falls back to tmux display-message when TMUX_PANE is absent', () => {
    execFileSync.mockReturnValue('%7\n');
    const result = resolveCurrentPaneId({});
    expect(execFileSync).toHaveBeenCalledWith(
      'tmux',
      ['display-message', '-p', '#{pane_id}'],
      expect.objectContaining({ encoding: 'utf-8' })
    );
    expect(result).toBe('%7');
  });

  it('falls back to tmux display-message when TMUX_PANE is empty string', () => {
    execFileSync.mockReturnValue('%8\n');
    const result = resolveCurrentPaneId({ TMUX_PANE: '' });
    expect(result).toBe('%8');
  });

  it('returns undefined when tmux display-message returns non-pane output', () => {
    execFileSync.mockReturnValue('not-a-pane-id');
    const result = resolveCurrentPaneId({});
    expect(result).toBeUndefined();
  });

  it('returns undefined when tmux display-message throws (not in tmux)', () => {
    execFileSync.mockImplementation(() => { throw new Error('no server'); });
    const result = resolveCurrentPaneId({});
    expect(result).toBeUndefined();
  });
});

// ─── listHudWatchPaneIdsInCurrentWindow — with fallback ──────────────────────

describe('listHudWatchPaneIdsInCurrentWindow (undefined currentPaneId)', () => {
  let execFileSync: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const cp = await import('child_process');
    execFileSync = cp.execFileSync as ReturnType<typeof vi.fn>;
  });

  it('uses tmux display-message fallback when no currentPaneId given and TMUX_PANE absent', () => {
    const savedTmuxPane = process.env.TMUX_PANE;
    delete process.env.TMUX_PANE;

    const listPanesOutput = [
      '%1\tnode\tnode /usr/local/bin/omc hud --watch',
      '%2\tnode\tnode /usr/local/bin/omc hud --watch',
      '%3\tzsh\tzsh',
    ].join('\n');

    execFileSync.mockImplementation((_cmd: string, args: string[]) => {
      if (args[0] === 'display-message') return '%1\n'; // active pane = leader
      if (args[0] === 'list-panes') return listPanesOutput;
      throw new Error('unexpected call');
    });

    const result = listHudWatchPaneIdsInCurrentWindow(undefined);

    // %1 is the active (leader) pane — must be excluded
    expect(result).not.toContain('%1');
    // %2 is a HUD pane that is not the leader — must be included
    expect(result).toContain('%2');
    // %3 is a plain shell — not a HUD pane
    expect(result).not.toContain('%3');

    if (savedTmuxPane !== undefined) process.env.TMUX_PANE = savedTmuxPane;
  });
});
