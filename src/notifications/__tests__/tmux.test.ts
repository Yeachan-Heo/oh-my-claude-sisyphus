import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "child_process";
import {
  getCurrentTmuxSession,
  getCurrentTmuxPaneId,
  formatTmuxInfo,
  getTeamTmuxSessions,
} from "../tmux.js";

const mockExecSync = vi.mocked(execSync);

describe("getCurrentTmuxSession", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null when not inside tmux (no TMUX env)", () => {
    delete process.env.TMUX;
    delete process.env.TMUX_PANE;
    expect(getCurrentTmuxSession()).toBeNull();
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it("uses TMUX_PANE to resolve the session name for the current pane", () => {
    process.env.TMUX = "/tmp/tmux-1000/default,1234,0";
    process.env.TMUX_PANE = "%3";

    mockExecSync.mockReturnValueOnce(
      "%0 main\n%1 main\n%2 background\n%3 my-detached-session\n"
    );

    expect(getCurrentTmuxSession()).toBe("my-detached-session");
    expect(mockExecSync).toHaveBeenCalledWith(
      "tmux list-panes -a -F '#{pane_id} #{session_name}'",
      expect.objectContaining({ encoding: "utf-8" })
    );
  });

  it("returns the correct session even when an earlier pane has the same ID prefix", () => {
    process.env.TMUX = "/tmp/tmux-1000/default,1234,0";
    process.env.TMUX_PANE = "%1";

    // %10 must NOT match %1
    mockExecSync.mockReturnValueOnce("%10 other\n%1 target-session\n%2 foo\n");

    expect(getCurrentTmuxSession()).toBe("target-session");
  });

  it("falls back to display-message when TMUX_PANE is absent", () => {
    process.env.TMUX = "/tmp/tmux-1000/default,1234,0";
    delete process.env.TMUX_PANE;

    mockExecSync.mockReturnValueOnce("fallback-session\n");

    expect(getCurrentTmuxSession()).toBe("fallback-session");
    expect(mockExecSync).toHaveBeenCalledWith(
      "tmux display-message -p '#S'",
      expect.objectContaining({ encoding: "utf-8" })
    );
  });

  it("falls back to display-message when pane not found in list", () => {
    process.env.TMUX = "/tmp/tmux-1000/default,1234,0";
    process.env.TMUX_PANE = "%99";

    // list-panes doesn't include %99
    mockExecSync
      .mockReturnValueOnce("%0 main\n%1 main\n")
      .mockReturnValueOnce("attached-session\n");

    expect(getCurrentTmuxSession()).toBe("attached-session");
  });

  it("returns null when execSync throws", () => {
    process.env.TMUX = "/tmp/tmux-1000/default,1234,0";
    process.env.TMUX_PANE = "%1";

    mockExecSync.mockImplementation(() => {
      throw new Error("tmux not found");
    });

    expect(getCurrentTmuxSession()).toBeNull();
  });

  it("returns null when session name is empty string", () => {
    process.env.TMUX = "/tmp/tmux-1000/default,1234,0";
    delete process.env.TMUX_PANE;

    mockExecSync.mockReturnValueOnce("  \n");

    expect(getCurrentTmuxSession()).toBeNull();
  });
});

describe("getCurrentTmuxPaneId", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null when not in tmux", () => {
    delete process.env.TMUX;
    expect(getCurrentTmuxPaneId()).toBeNull();
  });

  it("returns TMUX_PANE env var when valid", () => {
    process.env.TMUX = "/tmp/tmux-1000/default,1234,0";
    process.env.TMUX_PANE = "%5";
    expect(getCurrentTmuxPaneId()).toBe("%5");
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it("falls back to tmux display-message when env var is absent", () => {
    process.env.TMUX = "/tmp/tmux-1000/default,1234,0";
    delete process.env.TMUX_PANE;

    mockExecSync.mockReturnValueOnce("%2\n");
    expect(getCurrentTmuxPaneId()).toBe("%2");
  });
});

describe("formatTmuxInfo", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null when not in tmux", () => {
    delete process.env.TMUX;
    expect(formatTmuxInfo()).toBeNull();
  });

  it("formats session name correctly", () => {
    process.env.TMUX = "/tmp/tmux-1000/default,1234,0";
    process.env.TMUX_PANE = "%0";

    mockExecSync.mockReturnValueOnce("%0 my-session\n");

    expect(formatTmuxInfo()).toBe("tmux: my-session");
  });
});

describe("getTeamTmuxSessions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns sessions matching the team prefix", () => {
    mockExecSync.mockReturnValueOnce(
      "omc-team-myteam-worker1\nomc-team-myteam-worker2\nother-session\n"
    );
    expect(getTeamTmuxSessions("myteam")).toEqual(["worker1", "worker2"]);
  });

  it("returns empty array when no sessions match", () => {
    mockExecSync.mockReturnValueOnce("some-other-session\n");
    expect(getTeamTmuxSessions("myteam")).toEqual([]);
  });

  it("returns empty array for empty team name", () => {
    expect(getTeamTmuxSessions("")).toEqual([]);
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it("returns empty array when execSync throws", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("no server running");
    });
    expect(getTeamTmuxSessions("myteam")).toEqual([]);
  });
});
