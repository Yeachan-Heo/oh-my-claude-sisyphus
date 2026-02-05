/** Normalized model information */
export interface NormalizedModel {
  id: string;
  displayName: string;
}

/** Normalized context window metrics */
export interface NormalizedContextWindow {
  /** Total context window size in tokens */
  size: number;
  /** Usage percentage (0-100) */
  usedPercent: number;
  /** Token breakdown */
  tokens: {
    input: number;
    cacheCreation: number;
    cacheRead: number;
    total: number;
  };
}

/** Normalized statusline data (from stdin JSON) */
export interface NormalizedStatusline {
  /** Transcript file path */
  transcriptPath: string;
  /** Working directory */
  cwd: string;
  /** Model info */
  model: NormalizedModel;
  /** Context window metrics */
  contextWindow: NormalizedContextWindow;
  /** Raw data preserved for escape hatch */
  _raw?: unknown;
}

/** Transcript event types */
export type TranscriptEventType =
  | "user_message"
  | "assistant_message"
  | "tool_use"
  | "tool_result"
  | "agent_start"
  | "agent_end"
  | "thinking"
  | "error"
  | "unknown";

/** A single normalized transcript event */
export interface TranscriptEvent {
  /** Event type */
  type: TranscriptEventType;
  /** Timestamp */
  timestamp: Date;
  /** Event-specific data */
  data: Record<string, unknown>;
  /** Source event index in the JSONL file */
  sourceIndex: number;
}

/** Parse result with error tracking */
export interface ParseResult<T> {
  /** Parsed value (may use defaults if lenient) */
  value: T;
  /** Whether parsing was fully successful */
  success: boolean;
  /** Warnings from lenient parsing */
  warnings: string[];
  /** Fatal errors (only if success is false) */
  errors: string[];
}
