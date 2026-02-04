import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, statSync, utimesSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { cleanupModeStates, cleanupStaleStates, cleanupTransientState } from '../index.js';

describe('Session End Cleanup (Issue #403)', () => {
  let tempDir: string;
  let stateDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'session-end-test-'));
    stateDir = join(tempDir, '.omc', 'state');
    mkdirSync(stateDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('cleanupModeStates', () => {
    it('should remove active state files matching session', () => {
      const sessionId = 'session-123';
      writeFileSync(
        join(stateDir, 'ultrawork-state.json'),
        JSON.stringify({ active: true, session_id: sessionId })
      );

      const result = cleanupModeStates(tempDir, sessionId);

      expect(result.filesRemoved).toBe(1);
      expect(result.modesCleaned).toContain('ultrawork');
      expect(existsSync(join(stateDir, 'ultrawork-state.json'))).toBe(false);
    });

    it('should remove INACTIVE state files matching session (fixes #403)', () => {
      const sessionId = 'session-123';
      // Simulate a cancelled autopilot that sets active: false but leaves file
      writeFileSync(
        join(stateDir, 'autopilot-state.json'),
        JSON.stringify({ active: false, session_id: sessionId, phase: 'cancelled' })
      );

      const result = cleanupModeStates(tempDir, sessionId);

      expect(result.filesRemoved).toBe(1);
      expect(result.modesCleaned).toContain('autopilot');
      expect(existsSync(join(stateDir, 'autopilot-state.json'))).toBe(false);
    });

    it('should remove completed ultrapilot state files (active: false)', () => {
      const sessionId = 'session-456';
      writeFileSync(
        join(stateDir, 'ultrapilot-state.json'),
        JSON.stringify({ active: false, session_id: sessionId, completedAt: new Date().toISOString() })
      );

      const result = cleanupModeStates(tempDir, sessionId);

      expect(result.filesRemoved).toBe(1);
      expect(result.modesCleaned).toContain('ultrapilot');
    });

    it('should NOT remove state files belonging to a different session', () => {
      writeFileSync(
        join(stateDir, 'ultrawork-state.json'),
        JSON.stringify({ active: true, session_id: 'other-session' })
      );

      const result = cleanupModeStates(tempDir, 'my-session');

      expect(result.filesRemoved).toBe(0);
      expect(existsSync(join(stateDir, 'ultrawork-state.json'))).toBe(true);
    });

    it('should remove legacy state files without session_id', () => {
      writeFileSync(
        join(stateDir, 'ralph-state.json'),
        JSON.stringify({ active: true })
      );

      const result = cleanupModeStates(tempDir, 'any-session');

      expect(result.filesRemoved).toBe(1);
      expect(result.modesCleaned).toContain('ralph');
    });

    it('should remove inactive legacy state files without session_id', () => {
      writeFileSync(
        join(stateDir, 'ecomode-state.json'),
        JSON.stringify({ active: false })
      );

      const result = cleanupModeStates(tempDir, 'any-session');

      expect(result.filesRemoved).toBe(1);
      expect(result.modesCleaned).toContain('ecomode');
    });

    it('should always remove marker files', () => {
      writeFileSync(
        join(stateDir, 'swarm-active.marker'),
        JSON.stringify({ mode: 'swarm', startedAt: new Date().toISOString() })
      );

      const result = cleanupModeStates(tempDir, 'session-123');

      expect(result.filesRemoved).toBe(1);
      expect(result.modesCleaned).toContain('swarm');
    });

    it('should clean all state files when no sessionId provided (force cleanup)', () => {
      writeFileSync(
        join(stateDir, 'ultrawork-state.json'),
        JSON.stringify({ active: true, session_id: 'session-a' })
      );
      writeFileSync(
        join(stateDir, 'autopilot-state.json'),
        JSON.stringify({ active: false, session_id: 'session-b' })
      );
      writeFileSync(
        join(stateDir, 'ralph-state.json'),
        JSON.stringify({ active: true })
      );

      const result = cleanupModeStates(tempDir);

      expect(result.filesRemoved).toBe(3);
      expect(result.modesCleaned).toContain('ultrawork');
      expect(result.modesCleaned).toContain('autopilot');
      expect(result.modesCleaned).toContain('ralph');
    });

    it('should handle multiple modes for same mode name (swarm marker + summary)', () => {
      writeFileSync(
        join(stateDir, 'swarm-active.marker'),
        JSON.stringify({ mode: 'swarm', startedAt: new Date().toISOString() })
      );
      writeFileSync(
        join(stateDir, 'swarm-summary.json'),
        JSON.stringify({ active: false, session_id: 'session-123' })
      );

      const result = cleanupModeStates(tempDir, 'session-123');

      expect(result.filesRemoved).toBe(2);
      // swarm should appear only once in modesCleaned
      expect(result.modesCleaned.filter(m => m === 'swarm')).toHaveLength(1);
    });

    it('should return zero when no state directory exists', () => {
      const emptyDir = mkdtempSync(join(tmpdir(), 'empty-test-'));
      try {
        const result = cleanupModeStates(emptyDir, 'session-123');
        expect(result.filesRemoved).toBe(0);
        expect(result.modesCleaned).toHaveLength(0);
      } finally {
        rmSync(emptyDir, { recursive: true, force: true });
      }
    });
  });

  describe('cleanupStaleStates', () => {
    function makeFileStale(filePath: string, hoursOld: number): void {
      const pastTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
      utimesSync(filePath, pastTime, pastTime);
    }

    it('should remove stale state files from other sessions', () => {
      const staleFile = join(stateDir, 'ultrawork-state.json');
      writeFileSync(
        staleFile,
        JSON.stringify({ active: true, session_id: 'old-session' })
      );
      makeFileStale(staleFile, 25); // 25 hours old

      const result = cleanupStaleStates(tempDir, 'new-session');

      expect(result.filesRemoved).toBe(1);
      expect(result.modesCleaned).toContain('ultrawork');
      expect(existsSync(staleFile)).toBe(false);
    });

    it('should NOT remove state files from the current session', () => {
      const currentSessionId = 'current-session';
      const stateFile = join(stateDir, 'autopilot-state.json');
      writeFileSync(
        stateFile,
        JSON.stringify({ active: true, session_id: currentSessionId })
      );
      makeFileStale(stateFile, 25);

      const result = cleanupStaleStates(tempDir, currentSessionId);

      expect(result.filesRemoved).toBe(0);
      expect(existsSync(stateFile)).toBe(true);
    });

    it('should NOT remove recent state files from other sessions', () => {
      const stateFile = join(stateDir, 'ralph-state.json');
      writeFileSync(
        stateFile,
        JSON.stringify({ active: true, session_id: 'other-session' })
      );
      // File is fresh (just created), so should NOT be removed

      const result = cleanupStaleStates(tempDir, 'new-session');

      expect(result.filesRemoved).toBe(0);
      expect(existsSync(stateFile)).toBe(true);
    });

    it('should remove stale marker files', () => {
      const markerFile = join(stateDir, 'swarm-active.marker');
      writeFileSync(
        markerFile,
        JSON.stringify({ mode: 'swarm', startedAt: new Date().toISOString() })
      );
      makeFileStale(markerFile, 25);

      const result = cleanupStaleStates(tempDir, 'new-session');

      expect(result.filesRemoved).toBe(1);
      expect(result.modesCleaned).toContain('swarm');
    });

    it('should remove stale inactive state files', () => {
      const stateFile = join(stateDir, 'ecomode-state.json');
      writeFileSync(
        stateFile,
        JSON.stringify({ active: false, session_id: 'old-session' })
      );
      makeFileStale(stateFile, 30);

      const result = cleanupStaleStates(tempDir, 'new-session');

      expect(result.filesRemoved).toBe(1);
      expect(result.modesCleaned).toContain('ecomode');
    });

    it('should return zero when no state directory exists', () => {
      const emptyDir = mkdtempSync(join(tmpdir(), 'empty-test-'));
      try {
        const result = cleanupStaleStates(emptyDir, 'session-123');
        expect(result.filesRemoved).toBe(0);
        expect(result.modesCleaned).toHaveLength(0);
      } finally {
        rmSync(emptyDir, { recursive: true, force: true });
      }
    });
  });
});
