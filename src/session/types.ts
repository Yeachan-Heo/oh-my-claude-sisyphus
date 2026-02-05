/**
 * Session Backend Abstraction Types
 *
 * Defines a pluggable interface for terminal session management,
 * replacing direct tmux coupling in rate-limit-wait and qa-tester.
 */

/** A target that can be interacted with (pane, window, process) */
export interface SessionTarget {
  /** Unique identifier for this target */
  id: string;
  /** Backend-specific type (e.g., 'tmux-pane', 'screen-window', 'process') */
  type: string;
  /** Session/group name */
  session: string;
  /** Optional title or label */
  title?: string;
  /** Whether this target is currently active/focused */
  isActive: boolean;
  /** Additional backend-specific metadata */
  metadata?: Record<string, unknown>;
}

/** Result of analyzing captured content */
export interface CaptureAnalysis {
  /** Raw captured text */
  content: string;
  /** Whether the target appears to have Claude Code running */
  hasClaudeCode: boolean;
  /** Whether a rate limit message is detected */
  hasRateLimitMessage: boolean;
  /** Whether the target appears blocked */
  isBlocked: boolean;
  /** Detected rate limit type */
  rateLimitType?: "five_hour" | "weekly" | "unknown";
  /** Confidence score (0-1) */
  confidence: number;
}

/** Backend capability flags */
export interface BackendCapabilities {
  /** Can list running targets */
  canList: boolean;
  /** Can capture text output */
  canCapture: boolean;
  /** Can send input/keystrokes */
  canSend: boolean;
  /** Can spawn new interactive sessions */
  canSpawn: boolean;
  /** Supports multiple concurrent targets */
  supportsMultiple: boolean;
}

/** The pluggable backend interface */
export interface SessionBackend {
  /** Backend name (e.g., 'tmux', 'screen', 'process') */
  readonly name: string;

  /** Check if this backend is available on the current system */
  isAvailable(): boolean;

  /** Get capabilities of this backend */
  getCapabilities(): BackendCapabilities;

  /** List all available targets */
  listTargets(): SessionTarget[];

  /** Capture content from a target */
  capture(targetId: string, lines?: number): string;

  /** Send text to a target */
  send(targetId: string, text: string, pressEnter?: boolean): boolean;

  /** Send a resume sequence (for rate-limit recovery) */
  sendResume(targetId: string): boolean;

  /** Spawn a new interactive session (optional) */
  spawn?(command: string, options?: SpawnOptions): SessionTarget | null;
}

/** Options for spawning a new session */
export interface SpawnOptions {
  /** Session/group name */
  session?: string;
  /** Window/target name */
  name?: string;
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
}

/** Backend selection priority */
export type BackendPriority = "tmux" | "screen" | "process";
