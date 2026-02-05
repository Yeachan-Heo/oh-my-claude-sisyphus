import { spawnSync } from "child_process";
import type {
  CaptureAnalysis,
  SessionBackend,
  SessionTarget,
  SpawnOptions,
} from "../types.js";
import {
  isTmuxAvailable,
  listTmuxPanes,
  capturePaneContent,
  sendToPane,
  sendResumeSequence,
  analyzePaneContent,
} from "../../features/rate-limit-wait/tmux-detector.js";
import type { TmuxPane } from "../../features/rate-limit-wait/types.js";

const PANE_FORMAT =
  "#{pane_id}\t#{session_name}\t#{window_index}\t#{window_name}\t#{pane_index}\t#{pane_title}\t#{pane_active}";

function paneToTarget(pane: TmuxPane): SessionTarget {
  return {
    id: pane.id,
    type: "tmux-pane",
    session: pane.session,
    title: pane.title ?? pane.windowName,
    isActive: pane.isActive,
    metadata: {
      windowIndex: pane.windowIndex,
      windowName: pane.windowName,
      paneIndex: pane.paneIndex,
    },
  };
}

function parsePaneLine(line: string): TmuxPane | null {
  const parts = line.split("\t");
  if (parts.length < 7) {
    return null;
  }

  const [
    id,
    session,
    windowIndexStr,
    windowName,
    paneIndexStr,
    title,
    activeStr,
  ] = parts;

  return {
    id,
    session,
    windowIndex: Number.parseInt(windowIndexStr, 10),
    windowName,
    paneIndex: Number.parseInt(paneIndexStr, 10),
    title: title || undefined,
    isActive: activeStr === "1",
  };
}

function buildCommand(command: string, env?: Record<string, string>): string {
  if (!env || Object.keys(env).length === 0) {
    return command;
  }

  const prefix = Object.entries(env)
    .map(([key, value]) => `${key}=${shellEscape(value)}`)
    .join(" ");

  return `${prefix} ${command}`;
}

function shellEscape(value: string): string {
  const escaped = value.replace(/'/g, "'\\''");
  return `'${escaped}'`;
}

function mergeEnv(extra?: Record<string, string>): Record<string, string> {
  const merged: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      merged[key] = value;
    }
  }

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      merged[key] = value;
    }
  }

  return merged;
}

export class TmuxBackend implements SessionBackend {
  readonly name = "tmux";

  isAvailable(): boolean {
    return isTmuxAvailable();
  }

  getCapabilities() {
    return {
      canList: true,
      canCapture: true,
      canSend: true,
      canSpawn: true,
      supportsMultiple: true,
    };
  }

  listTargets(): SessionTarget[] {
    return listTmuxPanes().map((pane) => paneToTarget(pane));
  }

  capture(targetId: string, lines?: number): string {
    return capturePaneContent(targetId, lines);
  }

  analyze(targetId: string, lines?: number): CaptureAnalysis {
    const content = capturePaneContent(targetId, lines);
    const analysis = analyzePaneContent(content);

    return {
      content,
      hasClaudeCode: analysis.hasClaudeCode,
      hasRateLimitMessage: analysis.hasRateLimitMessage,
      isBlocked: analysis.isBlocked,
      rateLimitType: analysis.rateLimitType,
      confidence: analysis.confidence,
    };
  }

  send(targetId: string, text: string, pressEnter = true): boolean {
    return sendToPane(targetId, text, pressEnter);
  }

  sendResume(targetId: string): boolean {
    return sendResumeSequence(targetId);
  }

  spawn(command: string, options?: SpawnOptions): SessionTarget | null {
    if (!this.isAvailable()) {
      return null;
    }

    const env = mergeEnv(options?.env);
    const cwd = options?.cwd;
    const namedCommand = buildCommand(command, options?.env);

    if (process.env.TMUX && !options?.session) {
      const args = ["split-window", "-P", "-F", PANE_FORMAT];

      if (cwd) {
        args.push("-c", cwd);
      }

      args.push(namedCommand);
      const result = spawnSync("tmux", args, { encoding: "utf-8", env });

      if (result.status !== 0) {
        return null;
      }

      const pane = parsePaneLine(result.stdout.trim());
      return pane ? paneToTarget(pane) : null;
    }

    const sessionName =
      options?.session ?? options?.name ?? `omc-${Date.now()}`;
    const args = ["new-session", "-d", "-s", sessionName];

    if (options?.name) {
      args.push("-n", options.name);
    }

    if (cwd) {
      args.push("-c", cwd);
    }

    args.push(namedCommand);
    const result = spawnSync("tmux", args, { encoding: "utf-8", env });

    if (result.status !== 0) {
      return null;
    }

    const listResult = spawnSync(
      "tmux",
      ["list-panes", "-t", sessionName, "-F", PANE_FORMAT],
      {
        encoding: "utf-8",
        env,
      },
    );

    if (listResult.status !== 0 || !listResult.stdout.trim()) {
      return null;
    }

    const firstLine = listResult.stdout.trim().split("\n")[0];
    const pane = parsePaneLine(firstLine);
    return pane ? paneToTarget(pane) : null;
  }
}
