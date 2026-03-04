/**
 * Integration test for authentication error stop guard in checkPersistentModes
 * Fix for: https://github.com/Yeachan-Heo/oh-my-claudecode/issues/1308
 *
 * Verifies that when Claude Code stops due to an authentication error (HTTP 401 /
 * OAuth token expired), the persistent-mode hook does NOT block the stop —
 * preventing an infinite retry loop.
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { execFileSync } from "child_process";
import { checkPersistentModes } from "../index.js";

describe("persistent-mode auth-error stop guard (fix #1308)", () => {
  function makeRalphWorktree(sessionId: string): string {
    const tempDir = mkdtempSync(join(tmpdir(), "ralph-auth-error-"));
    execFileSync("git", ["init"], { cwd: tempDir, stdio: "pipe" });
    const stateDir = join(tempDir, ".omc", "state", "sessions", sessionId);
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, "ralph-state.json"),
      JSON.stringify(
        {
          active: true,
          iteration: 3,
          max_iterations: 10,
          started_at: new Date().toISOString(),
          prompt: "Finish the task",
          session_id: sessionId,
          project_path: tempDir,
          linked_ultrawork: false,
        },
        null,
        2,
      ),
    );
    return tempDir;
  }

  function makeTeamWorktree(sessionId: string): string {
    const tempDir = mkdtempSync(join(tmpdir(), "team-auth-error-"));
    execFileSync("git", ["init"], { cwd: tempDir, stdio: "pipe" });
    const stateDir = join(tempDir, ".omc", "state", "sessions", sessionId);
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, "team-state.json"),
      JSON.stringify(
        {
          active: true,
          current_phase: "executing",
          session_id: sessionId,
          reinforcement_count: 0,
          started_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    return tempDir;
  }

  const authErrorReasons = [
    "authentication_error",
    "authentication_failed",
    "unauthorized",
    "401",
    "invalid_api_key",
    "api_key_expired",
    "token_expired",
    "token_invalid",
    "oauth_error",
    "oauth_expired",
    "permission_denied",
    "access_denied",
    "forbidden",
    "403",
    "credentials_expired",
    "invalid_credentials",
  ];

  for (const reason of authErrorReasons) {
    it(`should NOT block stop when stop_reason is "${reason}"`, async () => {
      const sessionId = `session-1308-${reason.replace(/[^a-z0-9]/g, "-")}`;
      const tempDir = makeRalphWorktree(sessionId);
      try {
        const result = await checkPersistentModes(sessionId, tempDir, {
          stop_reason: reason,
        });
        expect(result.shouldBlock).toBe(false);
        expect(result.mode).toBe("none");
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  }

  it("should still block stop for active ralph with no auth error context", async () => {
    const sessionId = "session-1308-no-auth-error";
    const tempDir = makeRalphWorktree(sessionId);
    try {
      const result = await checkPersistentModes(sessionId, tempDir, {});
      expect(result.shouldBlock).toBe(true);
      expect(result.mode).toBe("ralph");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should still block stop for active ralph when stop_reason is "end_turn"', async () => {
    const sessionId = "session-1308-end-turn";
    const tempDir = makeRalphWorktree(sessionId);
    try {
      const result = await checkPersistentModes(sessionId, tempDir, {
        stop_reason: "end_turn",
      });
      expect(result.shouldBlock).toBe(true);
      expect(result.mode).toBe("ralph");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("auth error pause message should mention authentication", async () => {
    const sessionId = "session-1308-message";
    const tempDir = makeRalphWorktree(sessionId);
    try {
      const result = await checkPersistentModes(sessionId, tempDir, {
        stop_reason: "authentication_error",
      });
      expect(result.shouldBlock).toBe(false);
      expect(result.message).toMatch(/auth/i);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should NOT block stop for team mode with auth error", async () => {
    const sessionId = "session-1308-team-auth";
    const tempDir = makeTeamWorktree(sessionId);
    try {
      const result = await checkPersistentModes(sessionId, tempDir, {
        stop_reason: "401",
      });
      expect(result.shouldBlock).toBe(false);
      expect(result.mode).toBe("none");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should detect auth error from endTurnReason field", async () => {
    const sessionId = "session-1308-endturn";
    const tempDir = makeRalphWorktree(sessionId);
    try {
      const result = await checkPersistentModes(sessionId, tempDir, {
        end_turn_reason: "authentication_error",
      });
      expect(result.shouldBlock).toBe(false);
      expect(result.mode).toBe("none");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should detect auth error from camelCase stopReason field", async () => {
    const sessionId = "session-1308-camelcase";
    const tempDir = makeRalphWorktree(sessionId);
    try {
      const result = await checkPersistentModes(sessionId, tempDir, {
        stopReason: "token_expired",
      });
      expect(result.shouldBlock).toBe(false);
      expect(result.mode).toBe("none");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
