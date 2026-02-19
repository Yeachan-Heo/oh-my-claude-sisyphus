/**
 * Tests for issue #719: stopHook infinite loop after cancel in ULTRAWORK/RALPLAN modes.
 *
 * Covers:
 * 1. Max reinforcement auto-stop (ultrawork loops forever if not bounded)
 * 2. Cancelled flag causes immediate exit (race condition between cancel and stopHook)
 * 3. Ralph hard-cap on max_iterations (ralph extends indefinitely if not bounded)
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
import { checkPersistentModes } from '../index.js';
import { MAX_ULTRAWORK_REINFORCEMENTS } from '../../ultrawork/index.js';

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  execFileSync('git', ['init'], { cwd: dir, stdio: 'pipe' });
  return dir;
}

function writeSessionState(stateDir: string, filename: string, data: object): void {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, filename), JSON.stringify(data, null, 2));
}

describe('issue #719: stopHook infinite loop prevention', () => {
  describe('ultrawork max reinforcement safeguard', () => {
    it('auto-stops and clears state when reinforcement_count reaches MAX_ULTRAWORK_REINFORCEMENTS', async () => {
      const dir = makeTempDir('uw-max-reinforce-');
      const sessionId = 'session-719-uw-max';
      const stateDir = join(dir, '.omc', 'state', 'sessions', sessionId);

      try {
        writeSessionState(stateDir, 'ultrawork-state.json', {
          active: true,
          started_at: new Date().toISOString(),
          original_prompt: 'Fix the bug',
          session_id: sessionId,
          project_path: dir,
          reinforcement_count: MAX_ULTRAWORK_REINFORCEMENTS, // at the limit
          last_checked_at: new Date().toISOString()
        });

        const result = await checkPersistentModes(sessionId, dir);

        // Should NOT block — auto-stop means we let Claude rest
        expect(result.shouldBlock).toBe(false);
        expect(result.mode).toBe('none');
        expect(result.message).toContain('[ULTRAWORK AUTO-STOPPED]');
        expect(result.message).toContain(String(MAX_ULTRAWORK_REINFORCEMENTS));
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('still reinforces when reinforcement_count is below the limit', async () => {
      const dir = makeTempDir('uw-below-limit-');
      const sessionId = 'session-719-uw-below';
      const stateDir = join(dir, '.omc', 'state', 'sessions', sessionId);

      try {
        writeSessionState(stateDir, 'ultrawork-state.json', {
          active: true,
          started_at: new Date().toISOString(),
          original_prompt: 'Fix the bug',
          session_id: sessionId,
          project_path: dir,
          reinforcement_count: MAX_ULTRAWORK_REINFORCEMENTS - 1, // one below limit
          last_checked_at: new Date().toISOString()
        });

        const result = await checkPersistentModes(sessionId, dir);

        expect(result.shouldBlock).toBe(true);
        expect(result.mode).toBe('ultrawork');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('shows N/MAX format in reinforcement message', async () => {
      const dir = makeTempDir('uw-msg-format-');
      const sessionId = 'session-719-uw-fmt';
      const stateDir = join(dir, '.omc', 'state', 'sessions', sessionId);

      try {
        writeSessionState(stateDir, 'ultrawork-state.json', {
          active: true,
          started_at: new Date().toISOString(),
          original_prompt: 'Fix the bug',
          session_id: sessionId,
          project_path: dir,
          reinforcement_count: 3,
          last_checked_at: new Date().toISOString()
        });

        const result = await checkPersistentModes(sessionId, dir);

        expect(result.shouldBlock).toBe(true);
        // After increment, count becomes 4, message should show 4/50
        expect(result.message).toContain(`4/${MAX_ULTRAWORK_REINFORCEMENTS}`);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe('ultrawork cancelled flag (race condition prevention)', () => {
    it('does not reinforce when state has cancelled: true', async () => {
      const dir = makeTempDir('uw-cancelled-');
      const sessionId = 'session-719-uw-cancel';
      const stateDir = join(dir, '.omc', 'state', 'sessions', sessionId);

      try {
        writeSessionState(stateDir, 'ultrawork-state.json', {
          active: true,
          started_at: new Date().toISOString(),
          original_prompt: 'Fix the bug',
          session_id: sessionId,
          project_path: dir,
          reinforcement_count: 2,
          last_checked_at: new Date().toISOString(),
          cancelled: true  // cancel was requested
        });

        const result = await checkPersistentModes(sessionId, dir);

        // Cancelled state must not block
        expect(result.shouldBlock).toBe(false);
        expect(result.mode).toBe('none');
        // Should not contain ultrawork reinforcement text
        expect(result.message).not.toContain('ULTRAWORK MODE STILL ACTIVE');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe('ralph hard-cap on max_iterations', () => {
    it('auto-stops when max_iterations reaches RALPH_HARD_MAX_ITERATIONS (200)', async () => {
      const dir = makeTempDir('ralph-hardcap-');
      const sessionId = 'session-719-ralph-cap';
      const stateDir = join(dir, '.omc', 'state', 'sessions', sessionId);

      try {
        writeSessionState(stateDir, 'ralph-state.json', {
          active: true,
          iteration: 200,
          max_iterations: 200,  // at hard cap
          started_at: new Date().toISOString(),
          prompt: 'Complete all tasks',
          session_id: sessionId,
          project_path: dir
        });

        const result = await checkPersistentModes(sessionId, dir);

        expect(result.shouldBlock).toBe(false);
        expect(result.mode).toBe('none');
        expect(result.message).toContain('[RALPH LOOP AUTO-STOPPED]');
        expect(result.message).toContain('200');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('still extends max_iterations below the hard cap', async () => {
      const dir = makeTempDir('ralph-extend-');
      const sessionId = 'session-719-ralph-extend';
      const stateDir = join(dir, '.omc', 'state', 'sessions', sessionId);

      try {
        writeSessionState(stateDir, 'ralph-state.json', {
          active: true,
          iteration: 50,
          max_iterations: 50,  // below hard cap (200)
          started_at: new Date().toISOString(),
          prompt: 'Complete all tasks',
          session_id: sessionId,
          project_path: dir
        });

        const result = await checkPersistentModes(sessionId, dir);

        // Should still block (extend and continue)
        expect(result.shouldBlock).toBe(true);
        expect(result.mode).toBe('ralph');
        // Iteration should have been incremented, max_iterations extended to 60
        expect(result.message).toContain('[RALPH - ITERATION 51/60]');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});
